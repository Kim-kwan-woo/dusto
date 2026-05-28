import type { AssistantToolCall, AssistantToolContext } from '../../../preload/api'
import useCanvasStore, { syncCanvasStoreFromAssistant } from '../canvas/canvas.store'
import useHtmlEditorStore, {
  replaceHtmlFromAssistant,
  stageHtmlDraftFromAssistant
} from '../htmleditor/htmleditor.store'
import useNotesStore, {
  getNoteTitle,
  getSelectedNote,
  syncNotesStoreFromAssistant
} from '../notes/notes.store'
import useTodoStore, { syncTodoStoreFromAssistant } from '../todo/todo.store'

function isTodoArray(value: unknown): value is Array<{
  id: string
  text: string
  done: boolean
  createdAt: number
}> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { id?: unknown }).id === 'string' &&
        typeof (item as { text?: unknown }).text === 'string' &&
        typeof (item as { done?: unknown }).done === 'boolean' &&
        typeof (item as { createdAt?: unknown }).createdAt === 'number'
    )
  )
}

function isNoteArray(value: unknown): value is Array<{
  id: string
  body: string
  createdAt: number
  updatedAt: number
}> {
  return (
    Array.isArray(value) &&
    value.every(
      (note) =>
        typeof note === 'object' &&
        note !== null &&
        typeof (note as { id?: unknown }).id === 'string' &&
        typeof (note as { body?: unknown }).body === 'string' &&
        typeof (note as { createdAt?: unknown }).createdAt === 'number' &&
        typeof (note as { updatedAt?: unknown }).updatedAt === 'number'
    )
  )
}

function isCanvasBoardArray(value: unknown): value is Array<{
  id: string
  title: string
  createdAt: number
  updatedAt: number
  scene: string
}> {
  return (
    Array.isArray(value) &&
    value.every(
      (board) =>
        typeof board === 'object' &&
        board !== null &&
        typeof (board as { id?: unknown }).id === 'string' &&
        typeof (board as { title?: unknown }).title === 'string' &&
        typeof (board as { createdAt?: unknown }).createdAt === 'number' &&
        typeof (board as { updatedAt?: unknown }).updatedAt === 'number' &&
        typeof (board as { scene?: unknown }).scene === 'string'
    )
  )
}

export function buildAssistantContext(): AssistantToolContext {
  const noteState = useNotesStore.getState()
  const todoState = useTodoStore.getState()
  const canvasState = useCanvasStore.getState()
  const htmlEditorState = useHtmlEditorStore.getState()
  const selectedNote = getSelectedNote(noteState.notes, noteState.selectedId)

  return {
    selectedNoteId: selectedNote?.id ?? null,
    selectedNoteBody: selectedNote?.body ?? null,
    selectedNoteTitle: selectedNote ? getNoteTitle(selectedNote.body) : null,
    selectedTodoItems: todoState.items,
    selectedBoardId: canvasState.selectedBoardId,
    currentHtmlDocument: htmlEditorState.html
  }
}

export function applyToolSideEffects(toolCalls: AssistantToolCall[]): void {
  for (const toolCall of toolCalls) {
    if (toolCall.status !== 'completed' || !toolCall.result) {
      continue
    }

    const notes = toolCall.result['notes']
    const selectedNoteId = toolCall.result['selectedNoteId']
    const items = toolCall.result['items']
    const boards = toolCall.result['boards']
    const selectedBoardId = toolCall.result['selectedBoardId']
    const draftHtml = toolCall.result['draftHtml']
    const html = toolCall.result['html']

    if (isNoteArray(notes)) {
      syncNotesStoreFromAssistant({
        notes,
        selectedId: typeof selectedNoteId === 'string' ? selectedNoteId : null
      })
    }

    if (isTodoArray(items)) {
      syncTodoStoreFromAssistant(items)
    }

    if (isCanvasBoardArray(boards)) {
      syncCanvasStoreFromAssistant({
        boards,
        selectedBoardId: typeof selectedBoardId === 'string' ? selectedBoardId : null
      })
    }

    if (typeof draftHtml === 'string') {
      stageHtmlDraftFromAssistant(
        draftHtml,
        toolCall.name === 'html.rewrite' ? 'rewrite' : 'generate'
      )
    }

    if (typeof html === 'string') {
      replaceHtmlFromAssistant(html)
    }
  }
}
