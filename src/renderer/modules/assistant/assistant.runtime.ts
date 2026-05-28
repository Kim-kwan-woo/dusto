import type {
  AssistantRuntimeIssueCode,
  AssistantRuntimeStatus
} from '../../../preload/api'

const DEFAULT_PLACEHOLDER = 'Ask Dusto to help with notes, todos, canvas, or HTML.'
const INACTIVE_PLACEHOLDER = 'Choose a local model or bring Ollama online, then ask Dusto for help.'

type AssistantRuntimeStatusWithIssue = AssistantRuntimeStatus & {
  issueCode?: AssistantRuntimeIssueCode | null
}

export function getComposerPlaceholder(runtime: AssistantRuntimeStatus | null): string {
  if (!runtime) {
    return DEFAULT_PLACEHOLDER
  }

  if (runtime.state === 'ready' && runtime.available) {
    return DEFAULT_PLACEHOLDER
  }

  return INACTIVE_PLACEHOLDER
}

export function buildRuntimeErrorStatus(
  message: string,
  currentRuntime: AssistantRuntimeStatus | null
): AssistantRuntimeStatusWithIssue {
  return {
    state: 'error',
    available: false,
    provider: 'local',
    model: currentRuntime?.model ?? null,
    selectedModel: currentRuntime?.selectedModel ?? null,
    availableModels: currentRuntime?.availableModels ?? [],
    reason: message,
    canManage: currentRuntime?.canManage ?? false,
    managedByApp: false,
    issueCode: 'unknown'
  }
}

function getRuntimeIssueActionHint(runtime: AssistantRuntimeStatusWithIssue): string | null {
  switch (runtime.issueCode) {
    case 'not_installed':
      return 'Install Ollama first'
    case 'not_running':
      return runtime.selectedModel ? 'Start Ollama to use this model' : 'Start Ollama, then choose a model'
    case 'start_failed':
      return 'Could not start Ollama'
    case 'start_timeout':
      return 'Ollama is still starting'
    case 'status_timeout':
      return 'Status check timed out'
    case 'status_http_error':
      return 'Ollama status failed'
    case 'invalid_status_response':
      return 'Unexpected Ollama status'
    case 'no_models':
      return 'Install a local model first'
    case 'selected_model_missing':
      return runtime.selectedModel ? `Install ${runtime.selectedModel} first` : 'Pick an installed model'
    case 'chat_timeout':
      return 'Chat timed out'
    case 'chat_http_error':
      return 'Chat request failed'
    case 'invalid_chat_response':
      return 'Unexpected chat response'
    case 'unknown':
      return runtime.reason ?? 'Runtime issue'
    default:
      return null
  }
}

export function getRuntimeActionHint(runtime: AssistantRuntimeStatus | null): string | null {
  if (!runtime) {
    return null
  }

  const issueHint = getRuntimeIssueActionHint(runtime as AssistantRuntimeStatusWithIssue)

  if (issueHint) {
    return issueHint
  }

  if (runtime.state === 'missing_model') {
    if (runtime.availableModels.length > 0) {
      return 'Pick an installed model'
    }

    return runtime.selectedModel ? `Install ${runtime.selectedModel} first` : 'Install a local model first'
  }

  if (runtime.state === 'error') {
    return runtime.reason ?? 'Runtime error'
  }

  if (runtime.state === 'missing_runtime') {
    if (!runtime.canManage) {
      return 'Install Ollama first'
    }

    return runtime.selectedModel ? 'Start Ollama to use this model' : 'Start Ollama, then choose a model'
  }

  return null
}
