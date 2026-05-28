import { buildSystemPrompt } from './prompts/system'
import { OllamaProviderError } from './providers/ollama'
import type { ProviderChatResponse } from './providers/types'
import { getAiProvider, getPreferredModel, getRuntimeStatus } from './runtime'
import {
  deletePendingConfirmation,
  getPendingConfirmation,
  savePendingConfirmation,
} from './session-store'
import { getToolDefinitions, getToolDefinition, runTool } from './tools/registry'
import type {
  AssistantChatMessage,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantConfirmationResponse,
  AssistantRuntimeIssueCode,
  AssistantRuntimeStatus,
  AssistantToolResult,
} from './types'

function createAssistantMessage(text: string): AssistantChatMessage {
  return {
    id: `assistant:${Date.now()}`,
    role: 'assistant',
    text,
    createdAt: Date.now(),
  }
}

function buildUnavailableMessage(status: AssistantRuntimeStatus): string {
  if (status.state === 'missing_runtime') {
    return 'I cannot reply yet because the local runtime is not available on this Mac. You can still use every Dusto tool directly.'
  }

  if (status.state === 'missing_model') {
    if (status.selectedModel) {
      return `I found the local runtime, but ${status.selectedModel} is not installed yet. You can choose another installed model or finish setup and refresh the status card.`
    }

    if (status.availableModels.length > 0) {
      return 'I found the local runtime. Choose an installed model from the status card, then ask me again.'
    }

    return 'I found the local runtime, but there are no local models installed yet. Install a model in Ollama, then refresh the status card.'
  }

  if (status.state === 'starting') {
    return 'The local runtime is still starting up. Give it a moment, then try again.'
  }

  return 'The assistant is temporarily unavailable right now. You can continue using Dusto directly.'
}

function buildRuntimeFailureMessage(status: AssistantRuntimeStatus): string {
  if (status.issueCode === 'chat_timeout') {
    return 'Ollama took too long to answer. You can try again, or use a smaller local model.'
  }

  if (status.issueCode === 'chat_http_error') {
    return 'Ollama could not complete that chat request. Refresh the runtime status and try again.'
  }

  if (status.issueCode === 'invalid_chat_response') {
    return 'Ollama answered in a format Dusto could not read. Try again with the same model or choose another local model.'
  }

  return 'I ran into a local runtime problem. You can try again or open a tool directly.'
}

function buildChatFailureStatus(
  currentStatus: AssistantRuntimeStatus,
  issueCode: AssistantRuntimeIssueCode,
  reason: string
): AssistantRuntimeStatus {
  return {
    ...currentStatus,
    state: 'error',
    available: false,
    issueCode,
    reason,
    checkedAt: Date.now(),
  }
}

function buildToolSummary(result: AssistantToolResult): string {
  if (result.status === 'success') {
    return result.summary
  }

  if (result.status === 'cancelled') {
    return result.summary
  }

  if (result.status === 'blocked') {
    return `I recognized the action, but ${result.summary}`
  }

  return `I could not finish that action because ${result.summary}`
}

function buildContextMessages(
  context: AssistantChatRequest['context']
): AssistantChatMessage[] {
  if (!context) {
    return []
  }

  const lines: string[] = ['Current app context:']

  if (context.selectedNoteTitle) {
    lines.push(`Selected note title: ${context.selectedNoteTitle}`)
  }

  if (context.selectedNoteBody) {
    lines.push('Selected note body:')
    lines.push(context.selectedNoteBody)
  }

  if (context.selectedTodoItems && context.selectedTodoItems.length > 0) {
    const todoLines = context.selectedTodoItems
      .slice(0, 20)
      .map((item) => `- [${item.done ? 'x' : ' '}] ${item.text}`)

    lines.push('Current todo items:')
    lines.push(...todoLines)
  }

  if (context.selectedBoardId) {
    lines.push(`Selected canvas board id: ${context.selectedBoardId}`)
  }

  if (context.currentHtmlDocument) {
    lines.push('Current HTML document:')
    lines.push(context.currentHtmlDocument)
  }

  if (lines.length === 1) {
    return []
  }

  return [
    {
      id: `system:${Date.now()}:context`,
      role: 'system',
      text: lines.join('\n'),
      createdAt: Date.now(),
    },
  ]
}

export async function handleAssistantChat(
  request: AssistantChatRequest
): Promise<AssistantChatResponse> {
  const status = await getRuntimeStatus()

  if (!status.available) {
    return {
      ok: true,
      status,
      events: [
        {
          type: 'status',
          status,
          message: buildUnavailableMessage(status),
        },
      ],
    }
  }

  const tools = getToolDefinitions()
  const provider = getAiProvider()
  const selectedModel = status.model ?? getPreferredModel()

  if (!selectedModel) {
    const missingModelStatus: AssistantRuntimeStatus = {
      ...status,
      state: 'missing_model',
      available: false,
      issueCode: status.availableModels.length > 0 ? 'selected_model_missing' : 'no_models',
      reason:
        status.availableModels.length > 0
          ? 'Choose a local model before chatting.'
          : 'No local models are installed yet.',
    }

    return {
      ok: true,
      status: missingModelStatus,
      events: [
        {
          type: 'status',
          status: missingModelStatus,
          message: buildUnavailableMessage(missingModelStatus),
        },
      ],
    }
  }

  const toolDefinitions = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    confirmation: tool.confirmation,
    argumentSchema: tool.argumentSchema,
  }))
  let providerResponse: ProviderChatResponse

  try {
    providerResponse = await provider.chat({
      model: selectedModel,
      systemPrompt: buildSystemPrompt(toolDefinitions),
      messages: [...request.history, ...buildContextMessages(request.context), request.message],
      tools: toolDefinitions,
    })
  } catch (error) {
    const issueCode = error instanceof OllamaProviderError ? error.issueCode : 'unknown'
    const reason =
      error instanceof Error ? error.message : 'The local runtime failed unexpectedly.'
    const failureStatus = buildChatFailureStatus(status, issueCode, reason)

    return {
      ok: false,
      status: failureStatus,
      events: [
        {
          type: 'status',
          status: failureStatus,
          message: buildRuntimeFailureMessage(failureStatus),
        },
      ],
    }
  }

  if (!providerResponse.toolCall) {
    return {
      ok: true,
      status,
      events: [
        {
          type: 'assistant-message',
          message: createAssistantMessage(providerResponse.text),
        },
      ],
    }
  }

  const toolRun = await runTool(providerResponse.toolCall, {
    sessionId: request.sessionId,
    context: request.context,
  })

  if (toolRun.requiresConfirmation) {
    savePendingConfirmation(toolRun.confirmation)

    return {
      ok: true,
      status,
      events: [
        {
          type: 'confirmation-request',
          confirmation: toolRun.confirmation,
        },
      ],
    }
  }

  return {
    ok: true,
    status,
    events: [
      {
        type: 'tool-result',
        result: toolRun.result,
      },
      {
        type: 'assistant-message',
        message: createAssistantMessage(buildToolSummary(toolRun.result)),
      },
    ],
  }
}

export async function handleAssistantConfirmation(params: {
  confirmationId: string
  reply: 'approve' | 'reject'
}): Promise<AssistantConfirmationResponse> {
  const status = await getRuntimeStatus()
  const pending = getPendingConfirmation(params.confirmationId)

  if (!pending) {
    return {
      ok: false,
      status,
      events: [
        {
          type: 'assistant-message',
          message: createAssistantMessage('That confirmation is no longer available.'),
        },
      ],
    }
  }

  if (params.reply === 'reject') {
    deletePendingConfirmation(params.confirmationId)

    return {
      ok: true,
      status,
      events: [
        {
          type: 'tool-result',
          result: {
            toolName: pending.toolCall.name,
            status: 'cancelled',
            summary: 'You decided not to make that change.',
          },
        },
        {
          type: 'assistant-message',
          message: createAssistantMessage('Okay, I did not make that change.'),
        },
      ],
    }
  }

  const definition = getToolDefinition(pending.toolCall.name)
  const result = await definition.execute(pending.toolCall, {
    sessionId: pending.sessionId,
    context: pending.context,
  })
  deletePendingConfirmation(params.confirmationId)

  return {
    ok: true,
    status,
    events: [
      {
        type: 'tool-result',
        result,
      },
      {
        type: 'assistant-message',
        message: createAssistantMessage(buildToolSummary(result)),
      },
    ],
  }
}
