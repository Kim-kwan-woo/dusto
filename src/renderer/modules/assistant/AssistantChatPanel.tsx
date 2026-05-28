import React, { useEffect, useRef, useState } from 'react'
import DustoCharacter from '../../components/DustoCharacter'
import useNavigationStore from '../../stores/navigation.store'
import useAssistantStore from './assistant.store'
import AssistantComposer from './components/AssistantComposer'
import AssistantHelpPopup from './components/AssistantHelpPopup'
import AssistantRuntimeStatusCard from './components/AssistantRuntimeStatusCard'
import AssistantTranscript from './components/AssistantTranscript'
import { getComposerPlaceholder } from './assistant.store'

interface AssistantChatPanelProps {
  onRequestClose?: () => void
  variant?: 'page' | 'overlay'
}

function getRuntimeStateLabel(
  runtime: ReturnType<typeof useAssistantStore.getState>['runtime'],
  isRefreshing: boolean,
  isToggling: boolean
): 'Online' | 'Offline' | 'Starting' | 'Stopping' | 'Checking' {
  if (!runtime || isRefreshing) {
    return 'Checking'
  }

  if (isToggling) {
    return runtime.available ? 'Stopping' : 'Starting'
  }

  return runtime.available ? 'Online' : 'Offline'
}

function AssistantChatPanel({
  onRequestClose,
  variant = 'page'
}: AssistantChatPanelProps): React.JSX.Element {
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null)
  const helpButtonRef = useRef<HTMLButtonElement | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const navigate = useNavigationStore((state) => state.navigate)
  const timeline = useAssistantStore((state) => state.timeline)
  const runtime = useAssistantStore((state) => state.runtime)
  const runtimeChecked = useAssistantStore((state) => state.runtimeChecked)
  const isSubmitting = useAssistantStore((state) => state.isSubmitting)
  const isRefreshingRuntime = useAssistantStore((state) => state.isRefreshingRuntime)
  const isTogglingRuntime = useAssistantStore((state) => state.isTogglingRuntime)
  const runtimeActionHint = useAssistantStore((state) => state.runtimeActionHint)
  const error = useAssistantStore((state) => state.error)
  const loadRuntimeStatus = useAssistantStore((state) => state.loadRuntimeStatus)
  const selectRuntimeModel = useAssistantStore((state) => state.selectRuntimeModel)
  const startRuntime = useAssistantStore((state) => state.startRuntime)
  const stopRuntime = useAssistantStore((state) => state.stopRuntime)
  const submitPrompt = useAssistantStore((state) => state.submitPrompt)
  const replyToConfirmation = useAssistantStore((state) => state.replyToConfirmation)
  const clearError = useAssistantStore((state) => state.clearError)
  const clearRuntimeActionHint = useAssistantStore((state) => state.clearRuntimeActionHint)
  const isOverlay = variant === 'overlay'
  const characterVariant = error
    ? 'surprised'
    : isSubmitting
      ? 'cleaner'
      : timeline.length > 0
        ? 'happy'
        : 'shy'
  const runtimeStateLabel = getRuntimeStateLabel(runtime, isRefreshingRuntime, isTogglingRuntime)
  const runtimeAccent =
    runtime?.state === 'error'
      ? 'bg-[#ff3b30]'
      : runtime?.state === 'missing_model'
        ? 'bg-[#ff9f0a]'
        : runtime?.state === 'ready' && runtime.available
          ? 'bg-[#34c759]'
          : 'bg-black/[0.24]'

  useEffect(() => {
    if (!runtimeChecked) {
      void loadRuntimeStatus()
    }

    const intervalId = window.setInterval(() => {
      void loadRuntimeStatus()
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [loadRuntimeStatus, runtimeChecked])

  useEffect(() => {
    const container = transcriptScrollRef.current
    if (!container) {
      return
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    })
  }, [timeline.length, isSubmitting])

  return (
    <div className={['flex h-full min-h-full flex-col', isOverlay ? 'bg-white' : 'bg-[#fbfbfd]'].join(' ')}>
      <div
        className={[
          'border-b border-black/[0.06] bg-white/92 backdrop-blur-xl',
          isOverlay ? 'px-3 py-2.5' : 'px-5 py-3 lg:px-8'
        ].join(' ')}
      >
        <div className={['flex w-full flex-wrap items-center justify-between gap-3', isOverlay ? '' : 'mx-auto max-w-[980px]'].join(' ')}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div
                className={[
                  'flex items-center justify-center bg-[#f5f5f7]',
                  isOverlay ? 'h-9 w-9 rounded-[12px]' : 'h-10 w-10 rounded-[14px]'
                ].join(' ')}
              >
                <DustoCharacter
                  variant={characterVariant}
                  size={isOverlay ? 25 : 28}
                />
              </div>
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.24px] text-[#1d1d1f]">Dusto</p>
                <p className="text-[12px] tracking-[-0.12px] text-black/[0.44]">
                  Quiet local assistant
                </p>
              </div>
            </div>
            {!isOverlay ? (
              <button
                ref={helpButtonRef}
                type="button"
                aria-label="Open Dusto help"
                title="What can Dusto do?"
                onClick={() => setIsHelpOpen(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/[0.56] transition-colors duration-150 hover:bg-[#f5f5f7] hover:text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/25"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M6.45 6.25A1.65 1.65 0 0 1 8 5.2c.95 0 1.7.62 1.7 1.48 0 .7-.36 1.05-.98 1.44-.5.32-.72.58-.72 1.18" />
                  <path d="M8 11.15h.01" />
                </svg>
              </button>
            ) : null}
          </div>

          {isOverlay ? (
            <div className="flex items-center justify-end gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-2.5 py-1.5">
                <span className={['inline-flex h-2 w-2 rounded-full', runtimeAccent].join(' ')} />
                <span className="text-[11px] font-medium tracking-[-0.1px] text-[#1d1d1f]">
                  {runtimeStateLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  void loadRuntimeStatus(true)
                }}
                disabled={isRefreshingRuntime || isTogglingRuntime}
                aria-label="Refresh Dusto status"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/[0.56] transition-colors duration-150 hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className={['h-4 w-4', isRefreshingRuntime ? 'animate-spin' : ''].join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13.25 8A5.25 5.25 0 1 1 11.7 4.28" />
                  <path d="M10.75 2.75h2.5v2.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onRequestClose}
                aria-label="Close Dusto chat"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/[0.56] transition-colors duration-150 hover:bg-[#f5f5f7] hover:text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/25"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M4.5 4.5 11.5 11.5" />
                  <path d="M11.5 4.5 4.5 11.5" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <AssistantRuntimeStatusCard
              runtime={runtime}
              actionHint={runtimeActionHint}
              isRefreshing={isRefreshingRuntime}
              isToggling={isTogglingRuntime}
              onRefresh={() => {
                void loadRuntimeStatus(true)
              }}
              onSelectModel={selectRuntimeModel}
              onStart={startRuntime}
              onStop={stopRuntime}
              onClearActionHint={clearRuntimeActionHint}
            />
            </div>
          )}
        </div>
      </div>

      <div
        className={[
          'flex min-h-0 flex-1 flex-col',
          isOverlay ? 'px-3 pb-3 pt-3' : 'px-5 pb-5 pt-4 lg:px-8 lg:pb-8'
        ].join(' ')}
      >
        <div className={['flex min-h-0 w-full flex-1 flex-col', isOverlay ? '' : 'mx-auto max-w-[980px]'].join(' ')}>
          {error ? (
            <div
              className={[
                'mb-3 flex items-center justify-between gap-3 rounded-[16px] border border-[#ff3b30]/14 bg-[#fff5f4]',
                isOverlay ? 'px-3 py-2.5' : 'px-4 py-3'
              ].join(' ')}
            >
              <p className={['tracking-[-0.2px] text-[#a23720]', isOverlay ? 'text-[12px]' : 'text-[13px]'].join(' ')}>
                {error}
              </p>
              <button
                type="button"
                onClick={clearError}
                className="rounded-full border border-[#ff3b30]/16 px-3 py-1.5 text-[12px] tracking-[-0.12px] text-[#a23720]"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          <div
            ref={transcriptScrollRef}
            className={[
              'min-h-0 flex-1 overflow-y-auto border border-black/[0.05] bg-white shadow-[rgba(0,0,0,0.05)_0px_20px_48px_-30px]',
              isOverlay ? 'rounded-[18px] px-3 py-3' : 'rounded-[28px] px-4 py-4 sm:px-5 lg:px-6'
            ].join(' ')}
          >
            <AssistantTranscript
              items={timeline}
              isSubmitting={isSubmitting}
              onNavigate={navigate}
              onConfirmationDecision={(confirmationId, decision) => {
                void replyToConfirmation(confirmationId, decision)
              }}
            />
          </div>

          <div className={isOverlay ? 'mt-3' : 'mt-4'}>
            <AssistantComposer
              variant={isOverlay ? 'compact' : 'page'}
              isSubmitting={isSubmitting}
              onSubmit={submitPrompt}
              placeholder={getComposerPlaceholder(runtime)}
              disabled={!runtimeChecked && isRefreshingRuntime}
            />
          </div>
        </div>
      </div>

      <AssistantHelpPopup
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        returnFocusRef={helpButtonRef}
      />
    </div>
  )
}

export default AssistantChatPanel
