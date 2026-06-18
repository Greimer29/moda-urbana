import { app, BrowserWindow, dialog } from 'electron'
import { createServer, type Server } from 'node:http'
import path from 'node:path'
import serveHandler from 'serve-handler'

const PORT = 51740
const HOST = '127.0.0.1'
const APP_URL = `http://${HOST}:${PORT}`

let server: Server | null = null

function getWebDistPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web-dist')
  }
  return path.join(app.getAppPath(), '..', 'web', 'dist')
}

function startStaticServer(): Promise<void> {
  const webDist = getWebDistPath()

  server = createServer((req, res) => {
    return serveHandler(req, res, {
      public: webDist,
      rewrites: [{ source: '**', destination: '/index.html' }],
    })
  })

  return new Promise((resolve, reject) => {
    server!.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `El puerto ${PORT} ya está en uso. Cerrá otras instancias de Moda Urbana e intentá de nuevo.`
          )
        )
      } else {
        reject(err)
      }
    })

    server!.listen(PORT, HOST, () => resolve())
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Moda Urbana',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  void win.loadURL(APP_URL)
}

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
