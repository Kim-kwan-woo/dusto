import type {
  AssistantConfirmationRequest,
  AssistantMessage,
  AssistantToolCall
} from '../../../preload/api'
import type {
  AssistantRenderableConfirmation,
  AssistantRenderableMessage,
  AssistantRenderableRole,
  AssistantTimelineItem
} from './assistant.types'

export function createLocalMessage(
  role: AssistantRenderableRole,
  content: string,
  options?: Pick<AssistantRenderableMessage, 'optimistic' | 'tone'>
): AssistantRenderableMessage {
  return {
    id: `${role}:${crypto.randomUUID()}`,
    kind: 'message',
    role,
    content,
    createdAt: Date.now(),
    optimistic: options?.optimistic,
    tone: options?.tone ?? 'default'
  }
}

function mapToolItems(toolCalls: AssistantToolCall[]): AssistantTimelineItem[] {
  return toolCalls.map((toolCall) => ({
    id: `tool-item:${toolCall.id}:${crypto.randomUUID()}`,
    kind: 'tool',
    toolCall,
    createdAt: Date.now()
  }))
}

function mapConfirmationItem(
  confirmation: AssistantConfirmationRequest
): AssistantRenderableConfirmation {
  return {
    id: `confirmation-item:${confirmation.id}`,
    kind: 'confirmation',
    confirmation,
    createdAt: Date.now(),
    state: 'pending'
  }
}

export function replaceOptimisticUserMessage(
  timeline: AssistantTimelineItem[],
  optimisticId: string,
  content: string
): AssistantTimelineItem[] {
  return timeline.map((item) => {
    if (item.kind !== 'message' || item.id !== optimisticId) {
      return item
    }

    return {
      ...item,
      optimistic: false,
      content
    }
  })
}

export function markConfirmationState(
  timeline: AssistantTimelineItem[],
  confirmationId: string,
  state: AssistantRenderableConfirmation['state']
): AssistantTimelineItem[] {
  return timeline.map((item) => {
    if (item.kind !== 'confirmation' || item.confirmation.id !== confirmationId) {
      return item
    }

    return {
      ...item,
      state
    }
  })
}

export function appendTurn(
  timeline: AssistantTimelineItem[],
  message: AssistantRenderableMessage,
  toolCalls: AssistantToolCall[],
  confirmation: AssistantConfirmationRequest | null
): AssistantTimelineItem[] {
  const nextItems: AssistantTimelineItem[] = [...timeline, message, ...mapToolItems(toolCalls)]

  if (confirmation) {
    nextItems.push(mapConfirmationItem(confirmation))
  }

  return nextItems
}

export function buildConversationHistory(timeline: AssistantTimelineItem[]): AssistantMessage[] {
  return timeline
    .filter((item): item is AssistantRenderableMessage => item.kind === 'message')
    .slice(-12)
    .map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content
    }))
}
