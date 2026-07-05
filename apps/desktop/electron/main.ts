import { app, BrowserWindow, dialog, session, type Session } from 'electron'
import {
  createServer,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type ServerResponse,
  type Server,
} from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import serveHandler from 'serve-handler'

const HOST = '127.0.0.1'
const DEFAULT_PORT = 51740

type BrandMeta = {
  slug?: string
  appName?: string
  legalName?: string
  tagline?: string
  apiUrl?: string
  productName?: string
  appId?: string
  desktopPort?: number
  appVersion?: string
  buildId?: string
}

let port = DEFAULT_PORT
let appUrl = `http://${HOST}:${DEFAULT_PORT}`

let server: Server | null = null
let mainWindow: BrowserWindow | null = null
let brandMeta: BrandMeta = { legalName: 'App', productName: 'App' }
let runtimeApiUrl = ''
let appSession: Session | null = null

function getAppVersion(): string {
  return app.getVersion() || brandMeta.appVersion || '0.0.0'
}

function getBuildId(): string {
  return brandMeta.buildId ?? getAppVersion()
}

function getSessionPartition(): string {
  const slug = brandMeta.slug ?? 'app'
  return `persist:${slug}-v${getAppVersion()}`
}

function resolveAppSession(): Session {
  if (!appSession) {
    appSession = session.fromPartition(getSessionPartition())
  }
  return appSession
}

function getWebDistPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web-dist')
  }
  return path.join(app.getAppPath(), '..', 'web', 'dist')
}

function getConfigCandidates(fileName: string): string[] {
  return app.isPackaged
    ? [
        path.join(path.dirname(process.execPath), fileName),
        path.join(process.resourcesPath, fileName),
      ]
    : [path.join(app.getAppPath(), fileName)]
}

function readJsonConfig<T>(fileName: string): T | null {
  for (const candidate of getConfigCandidates(fileName)) {
    if (!fs.existsSync(candidate)) {
      continue
    }

    try {
      return JSON.parse(fs.readFileSync(candidate, 'utf8')) as T
    } catch {
      // Ignorar archivo inválido y continuar.
    }
  }

  return null
}

function resolveBrandMeta(): BrandMeta {
  const fromFile = readJsonConfig<BrandMeta>('brand-meta.json')
  if (fromFile?.legalName?.trim()) {
    return {
      ...fromFile,
      legalName: fromFile.legalName.trim(),
      productName: (fromFile.productName ?? fromFile.legalName).trim(),
    }
  }

  return { legalName: 'App', productName: 'App' }
}

function resolveApiUrl(meta: BrandMeta): string {
  const fromEnv = process.env.APP_API_URL?.trim() || process.env.MODA_URBANA_API_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  const fromApiFile = readJsonConfig<{ apiUrl?: string }>('api-url.json')
  if (fromApiFile?.apiUrl?.trim()) {
    return fromApiFile.apiUrl.trim().replace(/\/$/, '')
  }

  if (meta.apiUrl?.trim()) {
    return meta.apiUrl.trim().replace(/\/$/, '')
  }

  return ''
}

function rewriteProxyCookies(raw: string | string[] | undefined): string[] | undefined {
  if (!raw) {
    return undefined
  }

  const cookies = Array.isArray(raw) ? raw : [raw]
  return cookies.map((cookie) =>
    cookie
      .replace(/;\s*Domain=[^;]*/gi, '')
      .replace(/;\s*Secure/gi, '')
      .replace(/;\s*SameSite=[^;]*/gi, '; SameSite=Lax')
  )
}

function proxyApiRequest(req: IncomingMessage, res: ServerResponse): void {
  const requestPath = req.url ?? '/'
  const target = new URL(requestPath, `${runtimeApiUrl.replace(/\/$/, '')}/`)

  const proxyReq = https.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,
      },
    },
    (proxyRes) => {
      const headers: OutgoingHttpHeaders = { ...proxyRes.headers }
      const rewrittenCookies = rewriteProxyCookies(headers['set-cookie'])
      if (rewrittenCookies) {
        headers['set-cookie'] = rewrittenCookies
      } else {
        delete headers['set-cookie']
      }

      for (const [key, value] of Object.entries(headers)) {
        if (value === undefined) {
          delete headers[key as keyof OutgoingHttpHeaders]
        }
      }

      res.writeHead(proxyRes.statusCode ?? 502, headers)
      proxyRes.pipe(res)
    }
  )

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: {
            code: 'API_UNREACHABLE',
            message: 'No se pudo conectar con la API.',
          },
        })
      )
    }
  })

  req.pipe(proxyReq)
}

function resolveDesktopPort(meta: BrandMeta): number {
  const fromMeta = meta.desktopPort
  if (typeof fromMeta === 'number' && fromMeta > 0 && fromMeta < 65536) {
    return fromMeta
  }

  return DEFAULT_PORT
}

function startStaticServer(): Promise<void> {
  const webDist = getWebDistPath()
  brandMeta = resolveBrandMeta()
  runtimeApiUrl = resolveApiUrl(brandMeta)
  port = resolveDesktopPort(brandMeta)
  appUrl = `http://${HOST}:${port}`

  if (!runtimeApiUrl) {
    throw new Error('No hay apiUrl configurada. Ejecutá prepare-brand o colocá api-url.json junto al ejecutable.')
  }

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/runtime-config.json') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      })
      res.end(
        JSON.stringify({
          apiUrl: runtimeApiUrl,
          useLocalApiProxy: true,
          desktopPort: port,
          appVersion: getAppVersion(),
          buildId: getBuildId(),
        })
      )
      return
    }

    if (req.url?.startsWith('/api/')) {
      proxyApiRequest(req, res)
      return
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')

    return serveHandler(req, res, {
      public: webDist,
      rewrites: [{ source: '**', destination: '/index.html' }],
    })
  })

  return new Promise((resolve, reject) => {
    server!.on('error', (err: NodeJS.ErrnoException) => {
      reject(
        err.code === 'EADDRINUSE'
          ? new Error(
              `El puerto ${port} ya está en uso. Cerrá otras apps de escritorio (Moda Urbana/Coreva) e intentá de nuevo.`
            )
          : err
      )
    })

    server!.listen(port, HOST, () => resolve())
  })
}

const NO_CACHE_HEADERS = 'Cache-Control: no-cache\r\nPragma: no-cache\r\n'

function buildAppEntryUrl(): string {
  const buildId = encodeURIComponent(getBuildId())
  return `${appUrl}/?_b=${buildId}`
}

async function prepareAppSession(): Promise<void> {
  const currentSession = resolveAppSession()
  await currentSession.clearCache()
}

async function loadMainWindowUrl(): Promise<void> {
  if (!mainWindow) {
    return
  }

  await prepareAppSession()
  await mainWindow.loadURL(buildAppEntryUrl(), { extraHeaders: NO_CACHE_HEADERS })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1670,
    height: 940,
    minWidth: 1670,
    minHeight: 940,
    center: true,
    title: brandMeta.legalName ?? 'App',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: getSessionPartition(),
    },
  })

  void loadMainWindowUrl()
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      void loadMainWindowUrl()
      mainWindow.focus()
    }
  })

  void app.whenReady().then(async () => {
    try {
      await startStaticServer()
      await prepareAppSession()
      createWindow()
    } catch (err) {
      dialog.showErrorBox(
        brandMeta.legalName ?? 'App',
        err instanceof Error ? err.message : 'No se pudo iniciar la aplicación.'
      )
      app.quit()
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  server?.close()
})
