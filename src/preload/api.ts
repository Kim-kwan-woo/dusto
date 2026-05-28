export const ASSISTANT_IPC_CHANNELS = {
  runtimeStatus: 'assistant:runtime-status',
  chat: 'assistant:chat',
  confirm: 'assistant:confirm',
  runtimeStart: 'assistant:runtime-start',
  runtimeStop: 'assistant:runtime-stop',
  runtimeSelectModel: 'assistant:runtime-select-model'
} as const

export const EXPORT_PDF_IPC_CHANNEL = 'export-pdf' as const

export const STORAGE_IPC_CHANNELS = {
  loadTodos: 'storage:load-todos',
  saveTodos: 'storage:save-todos',
  flushTodos: 'storage:flush-todos',
  loadNotes: 'storage:load-notes',
  saveNotes: 'storage:save-notes',
  flushNotes: 'storage:flush-notes',
  loadCanvas: 'storage:load-canvas',
  saveCanvas: 'storage:save-canvas',
  saveCanvasMeta: 'storage:save-canvas-meta',
  saveCanvasScene: 'storage:save-canvas-scene',
  flushCanvas: 'storage:flush-canvas'
} as const

export const MEETINGS_IPC_CHANNELS = {
  getMicrophonePermissionStatus: 'meetings:get-microphone-permission-status',
  requestMicrophonePermission: 'meetings:request-microphone-permission',
  loadMeetings: 'meetings:load-meetings',
  saveRecording: 'meetings:save-recording',
  getAudioDataUrl: 'meetings:get-audio-data-url',
  getTranscriptionStatus: 'meetings:get-transcription-status',
  transcribeRecording: 'meetings:transcribe-recording',
  summarizeMeeting: 'meetings:summarize-meeting',
  deleteMeeting: 'meetings:delete-meeting'
} as const

export type ExportPdfResult = { success: boolean }
export type StorageWriteResult = { success: boolean }
export type MicrophonePermissionStatus =
  | 'not-determined'
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'unknown'
export type MeetingProcessingStatus =
  | 'recorded'
  | 'transcribing'
  | 'transcript_ready'
  | 'transcript_error'
  | 'transcript_pending'
  | 'summary_pending'
export type MeetingTranscriptionState =
  | 'ready'
  | 'missing_runtime'
  | 'missing_model'
  | 'missing_converter'
  | 'busy'
  | 'error'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

export interface NoteItem {
  id: string
  body: string
  createdAt: number
  updatedAt: number
}

export interface NotesState {
  notes: NoteItem[]
  selectedNoteId: string | null
}

export interface CanvasBoard {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  scene: string
}

export interface CanvasBoardMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface CanvasState {
  boards: CanvasBoard[]
  selectedBoardId: string | null
}

export interface SaveCanvasMetaRequest {
  boards: CanvasBoardMeta[]
  selectedBoardId: string | null
}

export interface SaveCanvasSceneRequest {
  id: string
  scene: string
  updatedAt: number
}

export interface MeetingAudioReference {
  fileName: string
  mimeType: string
  byteLength: number
}

export interface MeetingSummarySections {
  conciseSummary: string
  decisions: string[]
  actionItems: string[]
  risksBlockers: string[]
  followUps: string[]
}

export interface MeetingRecord {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  durationMs: number
  status: MeetingProcessingStatus
  audio: MeetingAudioReference | null
  transcript: string | null
  transcriptError: string | null
  summary: string | null
  summarySections: MeetingSummarySections | null
}

export interface MeetingsState {
  meetings: MeetingRecord[]
  selectedMeetingId: string | null
}

export interface SaveMeetingRecordingRequest {
  title: string
  durationMs: number
  mimeType: string
  audioData: ArrayBuffer
}

export interface SaveMeetingRecordingResult {
  success: boolean
  meeting: MeetingRecord
}

export interface MeetingAudioDataUrlResult {
  success: boolean
  dataUrl: string | null
}

export interface MeetingTranscriptionStatus {
  state: MeetingTranscriptionState
  available: boolean
  binaryPath: string | null
  modelPath: string | null
  converterPath: string | null
  reason: string | null
}

export interface MeetingTranscriptionResult {
  success: boolean
  meeting: MeetingRecord | null
  status: MeetingTranscriptionStatus
  error: string | null
}

export interface MeetingSummaryResult {
  success: boolean
  meeting: MeetingRecord | null
  status: AssistantRuntimeStatus
  error: string | null
  summarySections: MeetingSummarySections | null
}

export interface DeleteMeetingResult {
  success: boolean
  meetings: MeetingRecord[]
  selectedMeetingId: string | null
  deletedMeetingId: string | null
  audioDeleted: boolean
  error: string | null
}

export type AssistantRuntimeState =
  | 'missing_runtime'
  | 'missing_model'
  | 'starting'
  | 'ready'
  | 'busy'
  | 'error'
export type AssistantRuntimeIssueCode =
  | 'not_installed'
  | 'not_running'
  | 'start_failed'
  | 'start_timeout'
  | 'status_timeout'
  | 'status_http_error'
  | 'invalid_status_response'
  | 'no_models'
  | 'selected_model_missing'
  | 'chat_timeout'
  | 'chat_http_error'
  | 'invalid_chat_response'
  | 'unknown'
export type AssistantProviderId = 'local'
export type AssistantMessageRole = 'system' | 'user' | 'assistant' | 'tool'
export type AssistantToolRisk = 'safe' | 'confirm'
export type AssistantToolStatus = 'pending' | 'completed' | 'failed' | 'cancelled'
export type AssistantConfirmationDecision = 'approved' | 'rejected'

export type AssistantToolName =
  | 'notes.create'
  | 'notes.rewrite'
  | 'notes.summarize'
  | 'todo.create'
  | 'todo.extract'
  | 'todo.cleanup'
  | 'canvas.create'
  | 'canvas.rename'
  | 'html.generate'
  | 'html.rewrite'

export interface AssistantRuntimeStatus {
  state: AssistantRuntimeState
  available: boolean
  provider: AssistantProviderId
  model: string | null
  selectedModel: string | null
  availableModels: string[]
  reason: string | null
  issueCode: AssistantRuntimeIssueCode | null
  canManage: boolean
  managedByApp: boolean
}

export interface AssistantMessage {
  id: string
  role: AssistantMessageRole
  content: string
}

export interface AssistantToolCall {
  id: string
  name: AssistantToolName
  title: string
  risk: AssistantToolRisk
  status: AssistantToolStatus
  args: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
}

export interface AssistantConfirmationRequest {
  id: string
  toolCallId: string
  toolName: AssistantToolName
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  destructive: boolean
  preview: string | null
}

export interface AssistantToolContext {
  selectedNoteId?: string | null
  selectedNoteBody?: string | null
  selectedNoteTitle?: string | null
  selectedTodoItems?: TodoItem[]
  selectedBoardId?: string | null
  currentHtmlDocument?: string | null
}

export interface AssistantChatRequest {
  conversationId: string | null
  message: string
  history?: AssistantMessage[]
  context?: AssistantToolContext
}

export interface AssistantConfirmationReply {
  conversationId: string | null
  confirmationId: string
  decision: AssistantConfirmationDecision
}

export interface AssistantTurnResponse {
  conversationId: string
  message: AssistantMessage
  toolCalls: AssistantToolCall[]
  confirmation: AssistantConfirmationRequest | null
  runtime: AssistantRuntimeStatus
}

export interface DustoApi {
  platform: string
  exportPdf: (html: string) => Promise<ExportPdfResult>
  loadTodos: () => Promise<TodoItem[]>
  saveTodos: (todos: TodoItem[]) => Promise<StorageWriteResult>
  flushTodos: (todos: TodoItem[]) => StorageWriteResult
  loadNotes: () => Promise<NotesState>
  saveNotes: (payload: NotesState) => Promise<StorageWriteResult>
  flushNotes: (payload: NotesState) => StorageWriteResult
  loadCanvas: () => Promise<CanvasState>
  saveCanvas: (payload: CanvasState) => Promise<StorageWriteResult>
  saveCanvasMeta: (payload: SaveCanvasMetaRequest) => Promise<StorageWriteResult>
  saveCanvasScene: (payload: SaveCanvasSceneRequest) => Promise<StorageWriteResult>
  flushCanvas: (payload: CanvasState) => StorageWriteResult
  meetings: {
    getMicrophonePermissionStatus: () => Promise<MicrophonePermissionStatus>
    requestMicrophonePermission: () => Promise<MicrophonePermissionStatus>
    loadMeetings: () => Promise<MeetingsState>
    saveRecording: (
      request: SaveMeetingRecordingRequest
    ) => Promise<SaveMeetingRecordingResult>
    getAudioDataUrl: (meetingId: string) => Promise<MeetingAudioDataUrlResult>
    getTranscriptionStatus: () => Promise<MeetingTranscriptionStatus>
    transcribeRecording: (meetingId: string) => Promise<MeetingTranscriptionResult>
    summarizeMeeting: (meetingId: string) => Promise<MeetingSummaryResult>
    deleteMeeting: (meetingId: string) => Promise<DeleteMeetingResult>
  }
  assistant: {
    getRuntimeStatus: (forceRefresh?: boolean) => Promise<AssistantRuntimeStatus>
    selectRuntimeModel: (model: string) => Promise<AssistantRuntimeStatus>
    startRuntime: () => Promise<AssistantRuntimeStatus>
    stopRuntime: () => Promise<AssistantRuntimeStatus>
    chat: (request: AssistantChatRequest) => Promise<AssistantTurnResponse>
    replyToConfirmation: (
      reply: AssistantConfirmationReply
    ) => Promise<AssistantTurnResponse>
  }
}
