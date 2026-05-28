import { BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'fs/promises'
import { EXPORT_PDF_IPC_CHANNEL, type ExportPdfResult } from '@preload/api'

export function registerPdfExportIpc(): void {
  ipcMain.handle(EXPORT_PDF_IPC_CHANNEL, async (event, html: string): Promise<ExportPdfResult> => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        sandbox: false
      }
    })

    try {
      await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      const pdfBuffer = await pdfWin.webContents.printToPDF({
        printBackground: true,
        margins: { marginType: 'default' }
      })

      const saveDialogOptions = {
        defaultPath: 'document.pdf',
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
      }
      const { canceled, filePath } = senderWindow
        ? await dialog.showSaveDialog(senderWindow, saveDialogOptions)
        : await dialog.showSaveDialog(saveDialogOptions)

      if (canceled || !filePath) {
        return { success: false }
      }

      await writeFile(filePath, pdfBuffer)
      return { success: true }
    } catch {
      return { success: false }
    } finally {
      pdfWin.destroy()
    }
  })
}
