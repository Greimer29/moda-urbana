import { app, BrowserWindow, dialog } from 'electron'
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

const PORT = 51740
const HOST = '127.0.0.1'
const APP_URL = `http://${HOST}:${PORT}`

let server: Server | null = null
let mainWindow: BrowserWindow | null = null
const PUBLIC_API_URL = 'https://moda-urbana-production.up.railway.app'
let runtimeApiUrl = PUBLIC_API_URL

function getWebDistPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web-dist')
  }
  return path.join(app.getAppPath(), '..', 'web', 'dist')
}

function resolveApiUrl(): string {
  const fromEnv = process.env.MODA_URBANA_API_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  const candidates = app.isPackaged
    ? [
        path.join(path.dirname(process.execPath), 'api-url.json'),
        path.join(process.resourcesPath, 'api-url.json'),
      ]
    : [path.join(app.getAppPath(), 'api-url.json')]

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { apiUrl?: string }
      if (parsed.apiUrl?.trim()) {
        return parsed.apiUrl.trim().replace(/\/$/, '')
      }
    } catch {
      // Ignorar archivo inválido y continuar con el build embebido.
    }
  }

  return PUBLIC_API_URL
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
      headers['set-cookie'] = rewriteProxyCookies(headers['set-cookie'])
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

function startStaticServer(): Promise<void> {
  const webDist = getWebDistPath()
  runtimeApiUrl = resolveApiUrl()

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/runtime-config.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ apiUrl: runtimeApiUrl, useLocalApiProxy: true }))
      return
    }

    if (req.url?.startsWith('/api/')) {
      proxyApiRequest(req, res)
      return
    }

    return serveHandler(req, res, {
      public: webDist,
      rewrites: [{ source: '**', destination: '/index.html' }],
    })
  })

  return new Promise((resolve, reject) => {
    server!.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve()
        return
      }
      reject(err)
    })

    server!.listen(PORT, HOST, () => resolve())
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1670,
    height: 940,
    minWidth: 1670,
    minHeight: 940,
    center: true,
    title: 'Moda Urbana',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  void mainWindow.loadURL(APP_URL)
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
      mainWindow.focus()
    }
  })

  void app.whenReady().then(async () => {
    try {
      await startStaticServer()
      createWindow()
    } catch (err) {
      dialog.showErrorBox(
        'Moda Urbana',
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
