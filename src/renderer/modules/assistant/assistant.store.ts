import { create } from 'zustand'
import type { AssistantChatRequest, AssistantRuntimeStatus } from '../../../preload/api'
import { flushPersistentStores, requestRendererFlush } from '../../stores/persistence'
import { applyToolSideEffects, buildAssistantContext } from './assistant.context'
import {
  appendTurn,
  buildConversationHistory,
  createLocalMessage,
  markConfirmationState,
  replaceOptimisticUserMessage
} from './assistant.timeline'
import {
  buildRuntimeErrorStatus,
  getRuntimeActionHint
} from './assistant.runtime'
import type { AssistantPromptChip, AssistantStoreState } from './assistant.types'
export type {
  AssistantRenderableConfirmation,
  AssistantRenderableMessage,
  AssistantRenderableRole,
  AssistantRenderableToolCall,
  AssistantTimelineItem
} from './assistant.types'
export { getComposerPlaceholder } from './assistant.runtime'

const PROMPT_CHIPS: AssistantPromptChip[] = [
  {
    id: 'prompt-help',
    label: 'What can you help with?',
    prompt: 'What can you help me do in Dusto right now?',
    group: 'ask'
  },
  {
    id: 'prompt-note',
    label: 'Capture a quick note',
    prompt: 'Create a short note for today.',
    group: 'ask'
  },
  {
    id: 'prompt-todo',
    label: 'Plan my tasks',
    prompt: 'Help me break today into a small todo list.',
    group: 'ask'
  },
  {
    id: 'prompt-canvas',
    label: 'Start a canvas board',
    prompt: 'Create a canvas board for a quick brainstorming session.',
    group: 'ask'
  },
  {
    id: 'prompt-html',
    label: 'Draft simple HTML',
    prompt: 'Help me outline a simple HTML document.',
    group: 'ask'
  },
  { id: 'open-notes', label: 'Open Notes', navigateTo: 'notes', group: 'open' },
  { id: 'open-todo', label: 'Open Todo', navigateTo: 'todo', group: 'open' },
  { id: 'open-canvas', label: 'Open Canvas', navigateTo: 'canvas', group: 'open' },
  { id: 'open-html', label: 'Open HTML', navigateTo: 'htmleditor', group: 'open' }
]

async function requestChat(payload: AssistantChatRequest) {
  return window.api.assistant.chat(payload)
}

function flushBeforeAssistantToolExecution(): void {
  requestRendererFlush()
  flushPersistentStores()
}

function createRuntimeStatePatch(runtime: AssistantRuntimeStatus, showActionHint = true) {
  return {
    runtime,
    runtimeChecked: true,
    runtimeActionHint: showActionHint ? getRuntimeActionHint(runtime) : null
  }
}

const useAssistantStore = create<AssistantStoreState>()((set, get) => ({
  conversationId: null,
  timeline: [],
  runtime: null,
  runtimeChecked: false,
  isSubmitting: false,
  isRefreshingRuntime: false,
  isTogglingRuntime: false,
  runtimeActionHint: null,
  error: null,
  promptChips: PROMPT_CHIPS,

  async loadRuntimeStatus(forceRefresh = false) {
    set({ isRefreshingRuntime: true })

    try {
      const runtime = await window.api.assistant.getRuntimeStatus(forceRefresh)
      set({
        ...createRuntimeStatePatch(runtime, forceRefresh),
        isRefreshingRuntime: false,
        error: null
      })
    } catch (error) {
      const runtime = buildRuntimeErrorStatus(
        error instanceof Error ? error.message : 'Failed to reach the local runtime.',
        get().runtime
      )
      set({
        ...createRuntimeStatePatch(runtime),
        isRefreshingRuntime: false
      })
    }
  },

  async selectRuntimeModel(model) {
    set({ isRefreshingRuntime: true, error: null, runtimeActionHint: null })

    try {
      const runtime = await window.api.assistant.selectRuntimeModel(model)
      set({
        ...createRuntimeStatePatch(runtime),
        isRefreshingRuntime: false
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Dusto could not switch the local model.'
      const runtime = buildRuntimeErrorStatus(message, get().runtime)
      set({
        ...createRuntimeStatePatch(runtime),
        isRefreshingRuntime: false,
        error: message
      })
    }
  },

  async startRuntime() {
    if (get().isTogglingRuntime) {
      return null
    }

    set({ isTogglingRuntime: true, error: null, runtimeActionHint: null })

    try {
      const runtime = await window.api.assistant.startRuntime()
      set({
        ...createRuntimeStatePatch(runtime),
        isTogglingRuntime: false,
        error: null
      })
      return runtime
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Dusto could not start the local runtime.'
      const runtime = buildRuntimeErrorStatus(message, get().runtime)
      set({
        ...createRuntimeStatePatch(runtime),
        isTogglingRuntime: false,
        error: message
      })
      return runtime
    }
  },

  async stopRuntime() {
    if (get().isTogglingRuntime) {
      return null
    }

    set({ isTogglingRuntime: true, error: null, runtimeActionHint: null })

    try {
      const runtime = await window.api.assistant.stopRuntime()
      set({
        ...createRuntimeStatePatch(runtime),
        isTogglingRuntime: false,
        error: null
      })
      return runtime
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Dusto could not stop the local runtime.'
      const runtime = buildRuntimeErrorStatus(message, get().runtime)
      set({
        ...createRuntimeStatePatch(runtime),
        isTogglingRuntime: false,
        error: message
      })
      return runtime
    }
  },

  async submitPrompt(input) {
    const message = input.trim()

    if (!message || get().isSubmitting) {
      return
    }

    const previousTimeline = get().timeline
    const optimisticMessage = createLocalMessage('user', message, { optimistic: true })

    set((state) => ({
      timeline: [...state.timeline, optimisticMessage],
      isSubmitting: true,
      error: null
    }))

    try {
      flushBeforeAssistantToolExecution()

      const response = await requestChat({
        conversationId: get().conversationId,
        message,
        history: buildConversationHistory(previousTimeline),
        context: buildAssistantContext()
      })

      applyToolSideEffects(response.toolCalls)

      set((state) => ({
        conversationId: response.conversationId,
        ...createRuntimeStatePatch(response.runtime),
        isSubmitting: false,
        timeline: appendTurn(
          replaceOptimisticUserMessage(state.timeline, optimisticMessage.id, message),
          {
            id: response.message.id,
            kind: 'message',
            role: 'assistant',
            content: response.message.content,
            createdAt: Date.now(),
            tone: response.runtime.state === 'error' ? 'error' : 'default'
          },
          response.toolCalls,
          response.confirmation
        )
      }))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Dusto could not complete that request.'

      set((state) => ({
        ...createRuntimeStatePatch(buildRuntimeErrorStatus(errorMessage, state.runtime)),
        isSubmitting: false,
        error: errorMessage,
        timeline: appendTurn(
          replaceOptimisticUserMessage(state.timeline, optimisticMessage.id, message),
          createLocalMessage(
            'assistant',
            'I ran into a problem while reaching the local runtime. You can try again or open a tool directly.',
            { tone: 'error' }
          ),
          [],
          null
        )
      }))
    }
  },

  async replyToConfirmation(confirmationId, decision) {
    if (get().isSubmitting) {
      return
    }

    set((state) => ({
      isSubmitting: true,
      error: null,
      timeline: markConfirmationState(
        state.timeline,
        confirmationId,
        decision === 'approved' ? 'approved' : 'rejected'
      )
    }))

    try {
      flushBeforeAssistantToolExecution()

      const response = await window.api.assistant.replyToConfirmation({
        conversationId: get().conversationId,
        confirmationId,
        decision
      })

      applyToolSideEffects(response.toolCalls)

      set((state) => ({
        conversationId: response.conversationId,
        ...createRuntimeStatePatch(response.runtime),
        isSubmitting: false,
        timeline: appendTurn(
          state.timeline,
          {
            id: response.message.id,
            kind: 'message',
            role: 'assistant',
            content: response.message.content,
            createdAt: Date.now()
          },
          response.toolCalls,
          response.confirmation
        )
      }))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Dusto could not confirm that action.'

      set((state) => ({
        ...createRuntimeStatePatch(buildRuntimeErrorStatus(errorMessage, state.runtime)),
        isSubmitting: false,
        error: errorMessage,
        timeline: appendTurn(
          markConfirmationState(state.timeline, confirmationId, 'pending'),
          createLocalMessage(
            'assistant',
            'The confirmation did not go through. Nothing changed yet.',
            { tone: 'error' }
          ),
          [],
          null
        )
      }))
    }
  },

  clearError() {
    set({ error: null })
  },

  clearRuntimeActionHint() {
    set({ runtimeActionHint: null })
  }
}))

export default useAssistantStore
