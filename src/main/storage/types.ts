export interface StoredTodoItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

export interface StoredNote {
  id: string
  body: string
  createdAt: number
  updatedAt: number
}

export interface StoredCanvasBoard {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  scene: string
}

export interface StoredCanvasBoardMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface StoredCanvasData {
  boards: StoredCanvasBoardMeta[]
  selectedBoardId: string | null
  scenes: Record<string, string>
}

export interface StoredNotesData {
  notes: StoredNote[]
  selectedNoteId: string | null
}

export interface StoredCanvasSnapshot {
  boards: StoredCanvasBoard[]
  selectedBoardId: string | null
}

export interface StoredCanvasMetaState {
  boards: StoredCanvasBoardMeta[]
  selectedBoardId: string | null
}

export interface StoredCanvasSceneUpdate {
  id: string
  scene: string
  updatedAt: number
}

export type StoredMeetingProcessingStatus =
  | 'recorded'
  | 'transcribing'
  | 'transcript_ready'
  | 'transcript_error'
  | 'transcript_pending'
  | 'summary_pending'

export interface StoredMeetingAudioReference {
  fileName: string
  mimeType: string
  byteLength: number
}

export interface StoredMeetingSummarySections {
  conciseSummary: string
  decisions: string[]
  actionItems: string[]
  risksBlockers: string[]
  followUps: string[]
}

export interface StoredMeetingRecord {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  durationMs: number
  status: StoredMeetingProcessingStatus
  audio: StoredMeetingAudioReference | null
  transcript: string | null
  transcriptError: string | null
  summary: string | null
  summarySections: StoredMeetingSummarySections | null
}

export interface StoredMeetingsData {
  meetings: StoredMeetingRecord[]
  selectedMeetingId: string | null
}

export interface AppStorageData {
  todos: StoredTodoItem[]
  notes: StoredNote[]
  selectedNoteId: string | null
  canvasBoards: StoredCanvasBoard[]
  selectedCanvasBoardId: string | null
}
