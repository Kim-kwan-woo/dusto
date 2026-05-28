import type { AiProvider, ProviderChatRequest, ProviderChatResponse } from './types'
import type {
  AssistantRuntimeIssueCode,
  AssistantRuntimeStatus,
  AssistantToolCall,
  AssistantToolName,
} from '../types'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const OLLAMA_STATUS_TIMEOUT_MS = 1500
const OLLAMA_CHAT_TIMEOUT_MS = 60_000

interface OllamaTagsResponse {
  models?: Array<{
    name?: string
    model?: string
  }>
}

interface OllamaChatApiResponse {
  message?: {
    content?: string
  }
}

export class OllamaProviderError extends Error {
  readonly issueCode: AssistantRuntimeIssueCode

  constructor(issueCode: AssistantRuntimeIssueCode, message: string) {
    super(message)
    this.name = 'OllamaProviderError'
    this.issueCode = issueCode
  }
}

const TOOL_NAMES: AssistantToolName[] = [
  'notes.create',
  'notes.rewrite',
  'notes.summarize',
  'todo.create',
  'todo.extract',
  'todo.cleanup',
  'canvas.create',
  'canvas.rename',
  'html.generate',
  'html.rewrite'
]

function withTimeout(timeoutMs: number): AbortSignal {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timeout)
    },
    { once: true }
  )
  return controller.signal
}

function normalizeModelName(name: string | null | undefined): string {
  return name?.trim() || ''
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeTagsResponse(value: unknown): OllamaTagsResponse | null {
  if (!isRecord(value)) {
    return null
  }

  if (value.models !== undefined && !Array.isArray(value.models)) {
    return null
  }

  return value as OllamaTagsResponse
}

function normalizeChatResponse(value: unknown): OllamaChatApiResponse | null {
  if (!isRecord(value)) {
    return null
  }

  if (value.message !== undefined && !isRecord(value.message)) {
    return null
  }

  return value as OllamaChatApiResponse
}

async function readJsonResponse(
  response: Response,
  issueCode: AssistantRuntimeIssueCode,
  message: string
): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new OllamaProviderError(issueCode, message)
  }
}

function extractJsonCandidate(text: string): string | null {
  const trimmed = text.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('{')) {
    return trimmed
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    const fencedContent = fencedMatch[1].trim()
    if (fencedContent.startsWith('{')) {
      return fencedContent
    }
  }

  const firstBraceIndex = trimmed.indexOf('{')
  const lastBraceIndex = trimmed.lastIndexOf('}')

  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return trimmed.slice(firstBraceIndex, lastBraceIndex + 1)
  }

  return null
}

function parseToolCall(text: string): AssistantToolCall | undefined {
  const candidate = extractJsonCandidate(text)

  if (!candidate) {
    return undefined
  }

  try {
    const parsed = JSON.parse(candidate) as {
      type?: string
      name?: string
      arguments?: Record<string, unknown>
    }

    const toolName =
      parsed.type === 'tool_call'
        ? parsed.name
        : typeof parsed.type === 'string' && TOOL_NAMES.includes(parsed.type as AssistantToolName)
          ? parsed.type
          : parsed.name

    if (typeof toolName !== 'string' || !TOOL_NAMES.includes(toolName as AssistantToolName)) {
      return undefined
    }

    return {
      name: toolName as AssistantToolName,
      arguments: parsed.arguments ?? {},
    }
  } catch {
    return undefined
  }
}

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama'

  async getStatus(selectedModel: string | null): Promise<AssistantRuntimeStatus> {
    const startedAt = Date.now()

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: withTimeout(OLLAMA_STATUS_TIMEOUT_MS),
      })

      if (!response.ok) {
        return {
          state: 'error',
          available: false,
          provider: this.name,
          model: null,
          selectedModel: normalizeModelName(selectedModel) || null,
          availableModels: [],
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          issueCode: 'status_http_error',
          reason: `Ollama status returned HTTP ${response.status}.`,
        }
      }

      const data = normalizeTagsResponse(
        await readJsonResponse(
          response,
          'invalid_status_response',
          'Ollama returned an unexpected status response.'
        )
      )
      if (!data) {
        return {
          state: 'error',
          available: false,
          provider: this.name,
          model: null,
          selectedModel: normalizeModelName(selectedModel) || null,
          availableModels: [],
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          issueCode: 'invalid_status_response',
          reason: 'Ollama returned an unexpected status response.',
        }
      }

      const installedModels = (data.models ?? [])
        .map((entry) => normalizeModelName(entry.name ?? entry.model))
        .filter(Boolean)
      const normalizedSelectedModel = normalizeModelName(selectedModel)
      const hasSelectedModel =
        normalizedSelectedModel.length > 0 && installedModels.includes(normalizedSelectedModel)

      if (!normalizedSelectedModel) {
        return {
          state: 'missing_model',
          available: false,
          provider: this.name,
          model: null,
          selectedModel: null,
          availableModels: installedModels,
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          issueCode: installedModels.length > 0 ? 'selected_model_missing' : 'no_models',
          reason:
            installedModels.length > 0
              ? 'Choose a local model before starting.'
              : 'No local models are installed yet.',
        }
      }

      if (!hasSelectedModel) {
        return {
          state: 'missing_model',
          available: false,
          provider: this.name,
          model: null,
          selectedModel: normalizedSelectedModel,
          availableModels: installedModels,
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          issueCode: installedModels.length > 0 ? 'selected_model_missing' : 'no_models',
          reason:
            installedModels.length > 0
              ? `Model "${normalizedSelectedModel}" is not installed.`
              : `Model "${normalizedSelectedModel}" is not installed yet.`,
        }
      }

      return {
        state: 'ready',
        available: true,
        provider: this.name,
        model: normalizedSelectedModel,
        selectedModel: normalizedSelectedModel,
        availableModels: installedModels,
        checkedAt: Date.now(),
        latencyMs: Date.now() - startedAt,
      }
    } catch (error) {
      if (error instanceof OllamaProviderError) {
        return {
          state: 'error',
          available: false,
          provider: this.name,
          model: null,
          selectedModel: normalizeModelName(selectedModel) || null,
          availableModels: [],
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          issueCode: error.issueCode,
          reason: error.message,
        }
      }

      const isTimeout = isAbortError(error)

      return {
        state: isTimeout ? 'error' : 'missing_runtime',
        available: false,
        provider: this.name,
        model: null,
        selectedModel: normalizeModelName(selectedModel) || null,
        availableModels: [],
        checkedAt: Date.now(),
        latencyMs: Date.now() - startedAt,
        issueCode: isTimeout ? 'status_timeout' : 'not_running',
        reason: isTimeout
          ? 'Ollama did not answer the status check in time.'
          : 'Ollama is not running yet.',
      }
    }
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: withTimeout(OLLAMA_CHAT_TIMEOUT_MS),
        body: JSON.stringify({
          model: request.model,
          stream: false,
          messages: [
            {
              role: 'system',
              content: request.systemPrompt,
            },
            ...request.messages.map((message) => ({
              role: message.role === 'tool' ? 'system' : message.role,
              content: message.text,
            })),
          ],
        }),
      })

      if (!response.ok) {
        throw new OllamaProviderError(
          'chat_http_error',
          `Ollama chat returned HTTP ${response.status}.`
        )
      }

      const data = normalizeChatResponse(
        await readJsonResponse(
          response,
          'invalid_chat_response',
          'Ollama returned an unexpected chat response.'
        )
      )
      const text = data?.message?.content?.trim() ?? ''

      if (!data || !text) {
        throw new OllamaProviderError(
          'invalid_chat_response',
          'Ollama returned an unexpected chat response.'
        )
      }

      return {
        text,
        toolCall: parseToolCall(text),
      }
    } catch (error) {
      if (error instanceof OllamaProviderError) {
        throw error
      }

      if (isAbortError(error)) {
        throw new OllamaProviderError('chat_timeout', 'Ollama took too long to answer.')
      }

      throw new OllamaProviderError('unknown', 'Ollama chat failed unexpectedly.')
    }
  }
}
