import type {
  AssistantConfirmationDecision,
  AssistantConfirmationRequest,
  AssistantRuntimeStatus,
  AssistantToolCall
} from '../../../preload/api'

export type AssistantRenderableRole = 'user' | 'assistant'

export interface AssistantRenderableMessage {
  id: string
  kind: 'message'
  role: AssistantRenderableRole
  content: string
  createdAt: number
  optimistic?: boolean
  tone?: 'default' | 'error'
}

export interface AssistantRenderableToolCall {
  id: string
  kind: 'tool'
  toolCall: AssistantToolCall
  createdAt: number
}

export interface AssistantRenderableConfirmation {
  id: string
  kind: 'confirmation'
  confirmation: AssistantConfirmationRequest
  createdAt: number
  state: 'pending' | 'approved' | 'rejected'
}

export type AssistantTimelineItem =
  | AssistantRenderableMessage
  | AssistantRenderableToolCall
  | AssistantRenderableConfirmation

export interface AssistantPromptChip {
  id: string
  label: string
  prompt?: string
  navigateTo?: string
  group: 'ask' | 'open'
}

export interface AssistantStoreState {
  conversationId: string | null
  timeline: AssistantTimelineItem[]
  runtime: AssistantRuntimeStatus | null
  runtimeChecked: boolean
  isSubmitting: boolean
  isRefreshingRuntime: boolean
  isTogglingRuntime: boolean
  runtimeActionHint: string | null
  error: string | null
  promptChips: AssistantPromptChip[]
  loadRuntimeStatus: (forceRefresh?: boolean) => Promise<void>
  selectRuntimeModel: (model: string) => Promise<void>
  startRuntime: () => Promise<AssistantRuntimeStatus | null>
  stopRuntime: () => Promise<AssistantRuntimeStatus | null>
  submitPrompt: (input: string) => Promise<void>
  replyToConfirmation: (
    confirmationId: string,
    decision: AssistantConfirmationDecision
  ) => Promise<void>
  clearError: () => void
  clearRuntimeActionHint: () => void
}
