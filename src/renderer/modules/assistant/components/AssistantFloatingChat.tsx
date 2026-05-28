import React, { useEffect, useRef, useState } from 'react'
import DustoCharacter from '../../../components/DustoCharacter'
import AssistantChatPanel from '../AssistantChatPanel'
import useAssistantStore from '../assistant.store'

function AssistantFloatingChat(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const isSubmitting = useAssistantStore((state) => state.isSubmitting)
  const timeline = useAssistantStore((state) => state.timeline)
  const error = useAssistantStore((state) => state.error)
  const characterVariant = error
    ? 'surprised'
    : isSubmitting
      ? 'cleaner'
      : isOpen || timeline.length > 0
        ? 'happy'
        : 'mini'

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false)
        window.setTimeout(() => buttonRef.current?.focus(), 0)
      }
    }

    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handlePointerDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen])

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-40px)] flex-col items-end gap-3"
    >
      {isOpen ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="Dusto chat overlay"
          className="pointer-events-auto h-[min(620px,calc(100vh-132px))] w-[min(410px,calc(100vw-40px))] overflow-hidden rounded-[18px] border border-black/[0.08] bg-white shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]"
        >
          <AssistantChatPanel
            variant="overlay"
            onRequestClose={() => {
              setIsOpen(false)
              window.setTimeout(() => buttonRef.current?.focus(), 0)
            }}
          />
        </section>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        aria-label={isOpen ? 'Close Dusto chat' : 'Open Dusto chat'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          'pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border bg-white transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:ring-offset-2',
          isOpen
            ? 'border-[#0071e3]/28 shadow-[rgba(0,113,227,0.24)_0px_12px_28px_-14px]'
            : 'border-black/[0.08] shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] hover:-translate-y-0.5 hover:bg-[#f5f5f7]'
        ].join(' ')}
      >
        <span className="sr-only">{isOpen ? 'Close Dusto chat' : 'Open Dusto chat'}</span>
        <DustoCharacter variant={characterVariant} size={42} />
      </button>
    </div>
  )
}

export default AssistantFloatingChat
