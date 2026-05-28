import { flushCanvasStore } from '../modules/canvas/canvas.store'
import { flushNotesStore } from '../modules/notes/notes.store'
import { flushTodoStore } from '../modules/todo/todo.store'

export const REQUEST_RENDERER_FLUSH_EVENT = 'dusto:request-renderer-flush'

export function requestRendererFlush(): void {
  window.dispatchEvent(new Event(REQUEST_RENDERER_FLUSH_EVENT))
}

export function flushPersistentStores(): void {
  flushTodoStore()
  flushNotesStore()
  flushCanvasStore()
}
