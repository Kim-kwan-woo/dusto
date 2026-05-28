import React, { useEffect, useRef } from 'react'

interface AssistantHelpPopupProps {
  isOpen: boolean
  onClose: () => void
  returnFocusRef: React.RefObject<HTMLButtonElement>
}

const userTasks = [
  'Capture and organize todos',
  'Create, edit, and summarize notes',
  'Start canvas boards for visual thinking',
  'Draft or preview HTML and prepare PDF export',
  'Answer questions about supported Dusto tools'
]

const assistantActions = [
  'Extract todos from text',
  'Create notes or todo items',
  'Help draft HTML content',
  'Set up simple canvas boards',
  'Explain action results in this conversation'
]

function HelpList({ title, items }: { title: string; items: string[] }): React.JSX.Element {
  return (
    <section>
      <h3 className="text-[13px] font-semibold tracking-[-0.18px] text-[#1d1d1f]">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-[1.45] tracking-[-0.18px] text-black/[0.62]">
            <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#0071e3]/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AssistantHelpPopup({
  isOpen,
  onClose,
  returnFocusRef
}: AssistantHelpPopupProps): React.JSX.Element | null {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const focusTimerId = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimerId)
      window.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [isOpen, onClose, returnFocusRef])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/20 px-5 py-8 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-help-title"
        className="w-full max-w-[440px] rounded-[24px] border border-black/[0.08] bg-white p-5 shadow-[rgba(0,0,0,0.16)_0px_24px_60px_-24px]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium tracking-[-0.12px] text-[#0066cc]">Home guide</p>
            <h2
              id="assistant-help-title"
              className="mt-1 text-[18px] font-semibold leading-[1.2] tracking-[-0.28px] text-[#1d1d1f]"
            >
              What Dusto Can Help With
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close Dusto help"
            onClick={onClose}
            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border border-black/[0.08] bg-[#f5f5f7] text-black/[0.54] transition-colors duration-150 hover:bg-[#ededf2] hover:text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/25"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            >
              <path d="m4.5 4.5 7 7" />
              <path d="m11.5 4.5-7 7" />
            </svg>
          </button>
        </div>

        <p className="mt-4 text-[13px] leading-[1.45] tracking-[-0.18px] text-black/[0.58]">
          Dusto is a local-first helper for the tools inside this app. Ask in plain language, and
          Dusto can help turn supported requests into clear in-app actions.
        </p>

        <div className="mt-5 space-y-4">
          <HelpList title="You can ask Dusto to:" items={userTasks} />
          <HelpList title="The assistant can perform:" items={assistantActions} />
        </div>

        <p className="mt-5 rounded-[16px] bg-[#f5f5f7] px-4 py-3 text-[12px] leading-[1.45] tracking-[-0.12px] text-black/[0.58]">
          Local AI features depend on the configured local runtime and selected model. Destructive
          or high-impact actions still ask for confirmation.
        </p>
      </section>
    </div>
  )
}

export default AssistantHelpPopup
