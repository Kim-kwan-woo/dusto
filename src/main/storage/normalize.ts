import type {
  AppStorageData,
  StoredCanvasBoard,
  StoredCanvasBoardMeta,
  StoredCanvasData,
  StoredNote,
  StoredMeetingAudioReference,
  StoredMeetingRecord,
  StoredMeetingsData,
  StoredMeetingProcessingStatus,
  StoredMeetingSummarySections,
  StoredNotesData,
  StoredTodoItem,
} from './types'

const defaultLegacyData: AppStorageData = {
  todos: [],
  notes: [],
  selectedNoteId: null,
  canvasBoards: [],
  selectedCanvasBoardId: null,
}

const defaultCanvasData: StoredCanvasData = {
  boards: [],
  selectedBoardId: null,
  scenes: {},
}

export function getDefaultLegacyData(): AppStorageData {
  return {
    ...defaultLegacyData,
    todos: [...defaultLegacyData.todos],
    notes: [...defaultLegacyData.notes],
    canvasBoards: [...defaultLegacyData.canvasBoards],
  }
}

export function getDefaultCanvasData(): StoredCanvasData {
  return {
    ...defaultCanvasData,
    boards: [...defaultCanvasData.boards],
    scenes: { ...defaultCanvasData.scenes },
  }
}

function isStoredTodoItem(value: unknown): value is StoredTodoItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.text === 'string' &&
    typeof item.done === 'boolean' &&
    typeof item.createdAt === 'number'
  )
}

function isStoredNote(value: unknown): value is StoredNote {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const note = value as Record<string, unknown>
  return (
    typeof note.id === 'string' &&
    typeof note.body === 'string' &&
    typeof note.createdAt === 'number' &&
    typeof note.updatedAt === 'number'
  )
}

function isStoredCanvasBoard(value: unknown): value is StoredCanvasBoard {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const board = value as Record<string, unknown>
  return (
    typeof board.id === 'string' &&
    typeof board.title === 'string' &&
    typeof board.createdAt === 'number' &&
    typeof board.updatedAt === 'number' &&
    typeof board.scene === 'string'
  )
}

function isStoredCanvasBoardMeta(value: unknown): value is StoredCanvasBoardMeta {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const board = value as Record<string, unknown>
  return (
    typeof board.id === 'string' &&
    typeof board.title === 'string' &&
    typeof board.createdAt === 'number' &&
    typeof board.updatedAt === 'number'
  )
}

function isStoredMeetingProcessingStatus(
  value: unknown
): value is StoredMeetingProcessingStatus {
  return (
    value === 'recorded' ||
    value === 'transcribing' ||
    value === 'transcript_ready' ||
    value === 'transcript_error' ||
    value === 'transcript_pending' ||
    value === 'summary_pending'
  )
}

function isStoredMeetingAudioReference(value: unknown): value is StoredMeetingAudioReference {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const audio = value as Record<string, unknown>
  return (
    typeof audio.fileName === 'string' &&
    typeof audio.mimeType === 'string' &&
    typeof audio.byteLength === 'number'
  )
}

function isStoredMeetingSummarySections(
  value: unknown
): value is StoredMeetingSummarySections {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const summary = value as Record<string, unknown>

  return (
    typeof summary.conciseSummary === 'string' &&
    Array.isArray(summary.decisions) &&
    summary.decisions.every((item) => typeof item === 'string') &&
    Array.isArray(summary.actionItems) &&
    summary.actionItems.every((item) => typeof item === 'string') &&
    Array.isArray(summary.risksBlockers) &&
    summary.risksBlockers.every((item) => typeof item === 'string') &&
    Array.isArray(summary.followUps) &&
    summary.followUps.every((item) => typeof item === 'string')
  )
}

function isStoredMeetingRecord(value: unknown): value is StoredMeetingRecord {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const meeting = value as Record<string, unknown>
  return (
    typeof meeting.id === 'string' &&
    typeof meeting.title === 'string' &&
    typeof meeting.createdAt === 'number' &&
    typeof meeting.updatedAt === 'number' &&
    typeof meeting.durationMs === 'number' &&
    isStoredMeetingProcessingStatus(meeting.status) &&
    (meeting.audio === null || isStoredMeetingAudioReference(meeting.audio)) &&
    (meeting.transcript === null || typeof meeting.transcript === 'string') &&
    (meeting.transcriptError === undefined ||
      meeting.transcriptError === null ||
      typeof meeting.transcriptError === 'string') &&
    (meeting.summary === null || typeof meeting.summary === 'string') &&
    (meeting.summarySections === undefined ||
      meeting.summarySections === null ||
      isStoredMeetingSummarySections(meeting.summarySections))
  )
}

export function normalizeLegacyData(value: unknown): AppStorageData {
  if (typeof value !== 'object' || value === null) {
    return getDefaultLegacyData()
  }

  const data = value as Record<string, unknown>

  return {
    todos: Array.isArray(data.todos) ? data.todos.filter(isStoredTodoItem) : [],
    notes: Array.isArray(data.notes) ? data.notes.filter(isStoredNote) : [],
    selectedNoteId: typeof data.selectedNoteId === 'string' ? data.selectedNoteId : null,
    canvasBoards: Array.isArray(data.canvasBoards)
      ? data.canvasBoards.filter(isStoredCanvasBoard)
      : [],
    selectedCanvasBoardId:
      typeof data.selectedCanvasBoardId === 'string' ? data.selectedCanvasBoardId : null,
  }
}

export function normalizeTodosData(value: unknown): StoredTodoItem[] {
  return Array.isArray(value) ? value.filter(isStoredTodoItem) : []
}

export function normalizeNotesData(value: unknown): StoredNotesData {
  if (typeof value !== 'object' || value === null) {
    return { notes: [], selectedNoteId: null }
  }

  const data = value as Record<string, unknown>
  return {
    notes: Array.isArray(data.notes) ? data.notes.filter(isStoredNote) : [],
    selectedNoteId: typeof data.selectedNoteId === 'string' ? data.selectedNoteId : null,
  }
}

export function normalizeCanvasData(value: unknown): StoredCanvasData {
  if (typeof value !== 'object' || value === null) {
    return getDefaultCanvasData()
  }

  const data = value as Record<string, unknown>
  const boards = Array.isArray(data.boards) ? data.boards.filter(isStoredCanvasBoardMeta) : []
  const boardIds = new Set(boards.map((board) => board.id))
  const rawScenes =
    typeof data.scenes === 'object' && data.scenes !== null
      ? (data.scenes as Record<string, unknown>)
      : {}

  const scenes: Record<string, string> = {}
  for (const [id, scene] of Object.entries(rawScenes)) {
    if (boardIds.has(id) && typeof scene === 'string') {
      scenes[id] = scene
    }
  }

  return {
    boards,
    selectedBoardId:
      typeof data.selectedBoardId === 'string' && boardIds.has(data.selectedBoardId)
        ? data.selectedBoardId
        : (boards[0]?.id ?? null),
    scenes,
  }
}

export function normalizeMeetingsData(value: unknown): StoredMeetingsData {
  if (typeof value !== 'object' || value === null) {
    return { meetings: [], selectedMeetingId: null }
  }

  const data = value as Record<string, unknown>
  const meetings = Array.isArray(data.meetings)
    ? data.meetings.filter(isStoredMeetingRecord).map((meeting) => ({
        ...meeting,
        transcriptError: meeting.transcriptError ?? null,
        summarySections: meeting.summarySections ?? null,
      }))
    : []
  const meetingIds = new Set(meetings.map((meeting) => meeting.id))

  return {
    meetings,
    selectedMeetingId:
      typeof data.selectedMeetingId === 'string' && meetingIds.has(data.selectedMeetingId)
        ? data.selectedMeetingId
        : (meetings[0]?.id ?? null),
  }
}

export function normalizeCanvasFromBoards(
  boards: StoredCanvasBoard[],
  selectedBoardId: string | null
): StoredCanvasData {
  const metadata = boards.map(({ scene: _scene, ...board }) => board)
  const scenes = Object.fromEntries(boards.map((board) => [board.id, board.scene]))
  const boardIds = new Set(metadata.map((board) => board.id))

  return {
    boards: metadata,
    selectedBoardId:
      selectedBoardId && boardIds.has(selectedBoardId) ? selectedBoardId : (metadata[0]?.id ?? null),
    scenes,
  }
}

export function hydrateCanvasBoards(data: StoredCanvasData): StoredCanvasBoard[] {
  return data.boards.map((board) => ({
    ...board,
    scene: data.scenes[board.id] ?? '',
  }))
}
