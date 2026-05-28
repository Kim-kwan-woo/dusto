import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerAssistantIpc } from './assistant-ipc'
import { registerMeetingsIpc } from './meetings-ipc'
import { registerPdfExportIpc } from './pdf-export'
import { registerStorageIpc } from './storage-ipc'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 14,
      y: 16
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  if (process.platform === 'darwin') {
    win.setWindowButtonVisibility(true)
  }

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

registerPdfExportIpc()
registerStorageIpc()
registerAssistantIpc()
registerMeetingsIpc()

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
