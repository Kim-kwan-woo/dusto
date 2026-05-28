import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { AssistantRuntimeStatus } from '../../../../preload/api'

interface AssistantRuntimeStatusCardProps {
  runtime: AssistantRuntimeStatus | null
  actionHint: string | null
  isRefreshing: boolean
  isToggling: boolean
  onRefresh: () => void
  onSelectModel: (model: string) => Promise<void>
  onStart: () => Promise<AssistantRuntimeStatus | null>
  onStop: () => Promise<AssistantRuntimeStatus | null>
  onClearActionHint: () => void
}

function getRuntimeStateLabel(
  runtime: AssistantRuntimeStatus | null,
  isToggling: boolean
): 'Online' | 'Offline' | 'Starting' | 'Stopping' | 'Checking' {
  if (!runtime) {
    return 'Checking'
  }

  if (isToggling) {
    return runtime.available ? 'Stopping' : 'Starting'
  }

  return runtime.available ? 'Online' : 'Offline'
}

function AssistantRuntimeStatusCard({
  runtime,
  actionHint,
  isRefreshing,
  isToggling,
  onRefresh,
  onSelectModel,
  onStart,
  onStop,
  onClearActionHint
}: AssistantRuntimeStatusCardProps): React.JSX.Element {
  const hintTimerRef = useRef<number | null>(null)
  const modelMenuRef = useRef<HTMLDivElement | null>(null)
  const [toggleHint, setToggleHint] = useState<string | null>(actionHint)
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)
  const stateLabel = getRuntimeStateLabel(runtime, isToggling)
  const isOnline = runtime?.state === 'ready' && runtime.available
  const canStop = Boolean(runtime?.managedByApp && isOnline)
  const canStart = Boolean(runtime?.canManage && !isOnline)
  const availableModels = runtime?.availableModels ?? []
  const selectedModel = runtime?.selectedModel ?? ''
  const isModelSelectionDisabled =
    isRefreshing || isToggling || isOnline || availableModels.length === 0
  const selectedValue = useMemo(
    () => (selectedModel && availableModels.includes(selectedModel) ? selectedModel : ''),
    [availableModels, selectedModel]
  )
  const statusAccent =
    runtime?.state === 'error'
      ? 'bg-[#ff3b30]'
      : runtime?.state === 'missing_model'
        ? 'bg-[#ff9f0a]'
        : isOnline
          ? 'bg-[#34c759]'
          : stateLabel === 'Checking'
            ? 'bg-black/[0.24]'
            : 'bg-black/[0.24]'

  useEffect(() => {
    setToggleHint(actionHint)
  }, [actionHint])

  useEffect(() => {
    if (!isModelMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setIsModelMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isModelMenuOpen])

  useEffect(() => {
    if (!toggleHint) {
      return
    }

    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current)
    }

    hintTimerRef.current = window.setTimeout(() => {
      setToggleHint(null)
      onClearActionHint()
      hintTimerRef.current = null
    }, 2200)

    return () => {
      if (hintTimerRef.current) {
        window.clearTimeout(hintTimerRef.current)
        hintTimerRef.current = null
      }
    }
  }, [toggleHint, onClearActionHint])

  return (
    <section className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      {toggleHint ? (
        <p className="whitespace-nowrap text-right text-[11px] leading-[1.35] tracking-[-0.08px] text-[#a16a00]">
          {toggleHint}
        </p>
      ) : null}

      <div ref={modelMenuRef} className="relative">
        <button
          type="button"
          disabled={isModelSelectionDisabled}
          onClick={() => {
            setIsModelMenuOpen((current) => !current)
          }}
          className="inline-flex min-w-[168px] items-center justify-between gap-3 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium tracking-[-0.18px] text-[#1d1d1f] transition-colors duration-150 hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:bg-[#f5f5f7] disabled:text-black/[0.34]"
        >
          <span className="truncate">
            {selectedValue || (availableModels.length > 0 ? 'Choose a model' : 'No local models')}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className={['h-3.5 w-3.5 fill-current text-black/[0.38] transition-transform', isModelMenuOpen ? 'rotate-180' : ''].join(' ')}
          >
            <path d="M2.1 4.35 6 8.25l3.9-3.9.7.7L6 9.75 1.4 5.05l.7-.7Z" />
          </svg>
        </button>

        {isModelMenuOpen && availableModels.length > 0 ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-full overflow-hidden rounded-[16px] border border-black/[0.08] bg-white py-1.5 shadow-[rgba(0,0,0,0.12)_0px_12px_32px_-12px]">
            {availableModels.map((model) => {
              const isSelected = model === selectedValue

              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => {
                    setIsModelMenuOpen(false)
                    void onSelectModel(model)
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[13px] tracking-[-0.18px] transition-colors duration-150',
                    isSelected ? 'bg-[#f5f9ff] text-[#0071e3]' : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
                  ].join(' ')}
                >
                  <span className="truncate">{model}</span>
                  {isSelected ? (
                    <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3.5 w-3.5 fill-current">
                      <path d="M4.85 9.2 1.95 6.3l.7-.7 2.2 2.2 4.5-4.5.7.7-5.2 5.2Z" />
                    </svg>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-[#f5f5f7] px-3 py-2">
        <span className={['inline-flex h-2.5 w-2.5 rounded-full', statusAccent].join(' ')} />
        <span className="text-[13px] font-medium tracking-[-0.18px] text-[#1d1d1f]">
          Ollama {stateLabel}
        </span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isOnline}
        aria-disabled={isToggling || (!isOnline && !canStart)}
        aria-label={isOnline ? 'Turn Ollama off' : 'Turn Ollama on'}
        onClick={async () => {
          if (isToggling) {
            return
          }

          if (canStop) {
            await onStop()
            return
          }

          if (!canStart) {
            return
          }

          await onStart()
        }}
        className={[
          'relative inline-flex h-8 w-[52px] items-center rounded-full border transition-colors duration-200',
          isOnline
            ? 'border-[#0071e3]/30 bg-[#0071e3]'
            : 'border-black/[0.08] bg-black/[0.12]',
          isToggling || (!isOnline && !canStart) ? 'cursor-not-allowed opacity-60' : ''
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-transform duration-200',
            isOnline ? 'translate-x-[23px]' : 'translate-x-[3px]'
          ].join(' ')}
        />
      </button>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing || isToggling}
        aria-label="Refresh Ollama status"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/[0.56] transition-colors duration-150 hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={['h-4 w-4', isRefreshing ? 'animate-spin' : ''].join(' ')}
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
    </section>
  )
}

export default AssistantRuntimeStatusCard
