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

export type AssistantRole = 'system' | 'user' | 'assistant' | 'tool'

export interface AssistantChatMessage {
  id: string
  role: AssistantRole
  text: string
  createdAt: number
}

export interface AssistantRuntimeStatus {
  state: AssistantRuntimeState
  available: boolean
  provider: string
  model: string | null
  selectedModel: string | null
  availableModels: string[]
  checkedAt: number
  latencyMs: number | null
  issueCode?: AssistantRuntimeIssueCode
  reason?: string
}

export interface AssistantToolContext {
  selectedNoteId?: string | null
  selectedNoteBody?: string | null
  selectedNoteTitle?: string | null
  selectedTodoItems?:
    | Array<{
        id: string
        text: string
        done: boolean
        createdAt: number
      }>
    | null
  selectedBoardId?: string | null
  currentHtmlDocument?: string | null
}

export interface AssistantToolCall<TArgs = Record<string, unknown>> {
  name: AssistantToolName
  arguments: TArgs
}

export interface AssistantChatRequest {
  sessionId: string
  message: AssistantChatMessage
  history: AssistantChatMessage[]
  context?: AssistantToolContext
}

export type AssistantConfirmationReply = 'approve' | 'reject'

export interface AssistantConfirmationRequest {
  id: string
  sessionId: string
  toolCall: AssistantToolCall
  context?: AssistantToolContext
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  preview?: string | null
  createdAt: number
}

export interface AssistantToolResult {
  toolName: AssistantToolName
  status: 'success' | 'error' | 'blocked' | 'cancelled'
  summary: string
  data?: unknown
}

export interface AssistantToolExecutionResult {
  requiresConfirmation: false
  result: AssistantToolResult
}

export interface AssistantToolConfirmationResult {
  requiresConfirmation: true
  confirmation: AssistantConfirmationRequest
}

export type AssistantToolRunResult =
  | AssistantToolExecutionResult
  | AssistantToolConfirmationResult

export type AssistantOrchestratorEvent =
  | {
      type: 'assistant-message'
      message: AssistantChatMessage
    }
  | {
      type: 'tool-result'
      result: AssistantToolResult
    }
  | {
      type: 'confirmation-request'
      confirmation: AssistantConfirmationRequest
    }
  | {
      type: 'status'
      status: AssistantRuntimeStatus
      message: string
    }

export interface AssistantChatResponse {
  ok: boolean
  status: AssistantRuntimeStatus
  events: AssistantOrchestratorEvent[]
}

export interface AssistantConfirmationResponse {
  ok: boolean
  status: AssistantRuntimeStatus
  events: AssistantOrchestratorEvent[]
}

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
