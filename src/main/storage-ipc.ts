import { ipcMain } from 'electron'
import {
  STORAGE_IPC_CHANNELS,
  type CanvasState,
  type NotesState,
  type SaveCanvasMetaRequest,
  type SaveCanvasSceneRequest,
  type TodoItem
} from '@preload/api'
import {
  loadCanvas,
  loadNotes,
  loadTodos,
  saveCanvas,
  saveCanvasMeta,
  saveCanvasScene,
  saveCanvasSync,
  saveNotes,
  saveNotesSync,
  saveTodos,
  saveTodosSync
} from './storage'

export function registerStorageIpc(): void {
  ipcMain.handle(STORAGE_IPC_CHANNELS.loadTodos, async () => {
    return loadTodos()
  })

  ipcMain.handle(STORAGE_IPC_CHANNELS.saveTodos, async (_event, todos: TodoItem[]) => {
    await saveTodos(todos)
    return { success: true }
  })

  ipcMain.handle(STORAGE_IPC_CHANNELS.loadNotes, async () => {
    return loadNotes()
  })

  ipcMain.handle(STORAGE_IPC_CHANNELS.saveNotes, async (_event, payload: NotesState) => {
    await saveNotes(payload)
    return { success: true }
  })

  ipcMain.handle(STORAGE_IPC_CHANNELS.loadCanvas, async () => {
    return loadCanvas()
  })

  ipcMain.handle(STORAGE_IPC_CHANNELS.saveCanvas, async (_event, payload: CanvasState) => {
    await saveCanvas(payload)
    return { success: true }
  })

  ipcMain.handle(STORAGE_IPC_CHANNELS.saveCanvasMeta, async (_event, payload: SaveCanvasMetaRequest) => {
    await saveCanvasMeta(payload)
    return { success: true }
  })

  ipcMain.handle(
    STORAGE_IPC_CHANNELS.saveCanvasScene,
    async (_event, payload: SaveCanvasSceneRequest) => {
      await saveCanvasScene(payload)
      return { success: true }
    }
  )

  ipcMain.on(STORAGE_IPC_CHANNELS.flushTodos, (event, todos: TodoItem[]) => {
    saveTodosSync(todos)
    event.returnValue = { success: true }
  })

  ipcMain.on(STORAGE_IPC_CHANNELS.flushNotes, (event, payload: NotesState) => {
    saveNotesSync(payload)
    event.returnValue = { success: true }
  })

  ipcMain.on(STORAGE_IPC_CHANNELS.flushCanvas, (event, payload: CanvasState) => {
    saveCanvasSync(payload)
    event.returnValue = { success: true }
  })
}
