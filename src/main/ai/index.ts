import type {
  AssistantChatRequest,
  AssistantConfirmationReply,
  AssistantConfirmationRequest,
  AssistantMessage,
  AssistantRuntimeStatus,
  AssistantToolCall,
  AssistantToolName,
  AssistantTurnResponse,
} from '@preload/api'
import {
  handleAssistantChat as handleInternalAssistantChat,
  handleAssistantConfirmation as handleInternalAssistantConfirmation,
} from './orchestrator'
import {
  canManageRuntime,
  getPreferredModel,
  getRuntimeStatus as getInternalRuntimeStatus,
  isRuntimeManagedByApp,
  setPreferredModel,
  startManagedRuntime,
  stopManagedRuntime,
} from './runtime'
import { getToolDefinition } from './tools/registry'
import type {
  AssistantChatMessage,
  AssistantChatResponse,
  AssistantConfirmationResponse,
  AssistantToolResult,
} from './types'

function createConversationId(): string {
  return `conversation:${Date.now()}`
}

function mapRuntimeStatus(
  status: Awaited<ReturnType<typeof getInternalRuntimeStatus>>
): AssistantRuntimeStatus {
  return {
    state: status.state,
    available: status.available,
    provider: 'local',
    model: status.model,
    selectedModel: status.selectedModel ?? getPreferredModel(),
    availableModels: status.availableModels,
    reason: status.reason ?? null,
    issueCode: status.issueCode ?? null,
    canManage: canManageRuntime(),
    managedByApp: isRuntimeManagedByApp(),
  }
}

function mapMessage(message: AssistantChatMessage): AssistantMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.text,
  }
}

function getToolTitle(name: AssistantToolName): string {
  const definition = getToolDefinition(name)
  return definition.description
}

function getToolRisk(name: AssistantToolName): 'safe' | 'confirm' {
  return getToolDefinition(name).confirmation === 'required' ? 'confirm' : 'safe'
}

function mapToolResultStatus(status: AssistantToolResult['status']): AssistantToolCall['status'] {
  if (status === 'success') {
    return 'completed'
  }

  if (status === 'cancelled') {
    return 'cancelled'
  }

  return 'failed'
}

function mapToolResult(result: AssistantToolResult): AssistantToolCall {
  return {
    id: `tool:${result.toolName}:${Date.now()}`,
    name: result.toolName as AssistantToolName,
    title: getToolTitle(result.toolName as AssistantToolName),
    risk: getToolRisk(result.toolName as AssistantToolName),
    status: mapToolResultStatus(result.status),
    args: {},
    result:
      result.data && typeof result.data === 'object'
        ? (result.data as Record<string, unknown>)
        : result.data === undefined
          ? null
          : { value: result.data },
    error: result.status === 'success' ? null : result.summary,
  }
}

function mapConfirmation(
  confirmation: import('./types').AssistantConfirmationRequest
): {
  confirmation: AssistantConfirmationRequest
  toolCall: AssistantToolCall
} {
  const toolName = confirmation.toolCall.name as AssistantToolName

  return {
    confirmation: {
      id: confirmation.id,
      toolCallId: confirmation.toolCall.name,
      toolName,
      title: confirmation.title,
      message: confirmation.message,
      confirmLabel: confirmation.confirmLabel,
      cancelLabel: confirmation.cancelLabel,
      destructive: getToolRisk(toolName) === 'confirm',
      preview: confirmation.preview ?? null,
    },
    toolCall: {
      id: confirmation.toolCall.name,
      name: toolName,
      title: getToolTitle(toolName),
      risk: getToolRisk(toolName),
      status: 'pending',
      args: confirmation.toolCall.arguments,
      result: null,
      error: null,
    },
  }
}

function buildTurnResponse(
  conversationId: string,
  runtime: AssistantRuntimeStatus,
  response: AssistantChatResponse | AssistantConfirmationResponse
): AssistantTurnResponse {
  let message: AssistantMessage | null = null
  const toolCalls: AssistantToolCall[] = []
  let confirmation: AssistantConfirmationRequest | null = null

  for (const event of response.events) {
    if (event.type === 'assistant-message') {
      message = mapMessage(event.message)
    }

    if (event.type === 'tool-result') {
      toolCalls.push(mapToolResult(event.result))
    }

    if (event.type === 'confirmation-request') {
      const mapped = mapConfirmation(event.confirmation)
      confirmation = mapped.confirmation
      toolCalls.push(mapped.toolCall)
      if (!message) {
        message = {
          id: `assistant:${Date.now()}`,
          role: 'assistant',
          content: event.confirmation.message,
        }
      }
    }

    if (event.type === 'status' && !message) {
      message = {
        id: `assistant:${Date.now()}`,
        role: 'assistant',
        content: event.message,
      }
    }
  }

  return {
    conversationId,
    message: message ?? {
      id: `assistant:${Date.now()}`,
      role: 'assistant',
      content: 'Dusto is ready when you are.',
    },
    toolCalls,
    confirmation,
    runtime,
  }
}

export async function getRuntimeStatus(forceRefresh = false): Promise<AssistantRuntimeStatus> {
  const status = await getInternalRuntimeStatus(forceRefresh)
  return mapRuntimeStatus(status)
}

export async function startRuntime(): Promise<AssistantRuntimeStatus> {
  const status = await startManagedRuntime()
  return mapRuntimeStatus(status)
}

export async function selectRuntimeModel(model: string): Promise<AssistantRuntimeStatus> {
  setPreferredModel(model)
  const status = await getInternalRuntimeStatus(true)
  return mapRuntimeStatus(status)
}

export async function stopRuntime(): Promise<AssistantRuntimeStatus> {
  const status = await stopManagedRuntime()
  return mapRuntimeStatus(status)
}

export async function handleAssistantChat(
  request: AssistantChatRequest
): Promise<AssistantTurnResponse> {
  const conversationId = request.conversationId ?? createConversationId()
  const response = await handleInternalAssistantChat({
    sessionId: conversationId,
    message: {
      id: `user:${Date.now()}`,
      role: 'user',
      text: request.message,
      createdAt: Date.now(),
    },
    history: (request.history ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      text: message.content,
      createdAt: Date.now(),
    })),
    context: request.context,
  })

  return buildTurnResponse(conversationId, mapRuntimeStatus(response.status), response)
}

export async function handleAssistantConfirmation(
  reply: AssistantConfirmationReply
): Promise<AssistantTurnResponse> {
  const conversationId = reply.conversationId ?? createConversationId()
  const response = await handleInternalAssistantConfirmation({
    confirmationId: reply.confirmationId,
    reply: reply.decision === 'approved' ? 'approve' : 'reject',
  })

  return buildTurnResponse(conversationId, mapRuntimeStatus(response.status), response)
}
