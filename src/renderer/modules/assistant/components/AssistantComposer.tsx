import React, { useRef, useState } from 'react'

interface AssistantComposerProps {
  disabled?: boolean
  isSubmitting: boolean
  placeholder?: string
  variant?: 'page' | 'compact'
  onSubmit: (value: string) => Promise<void>
}

function AssistantComposer({
  disabled = false,
  isSubmitting,
  placeholder = 'Ask Dusto to help with notes, todos, canvas, or HTML.',
  variant = 'page',
  onSubmit
}: AssistantComposerProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const isComposingRef = useRef(false)
  const isCompact = variant === 'compact'

  async function submitValue(): Promise<void> {
    const nextValue = value.trim()
    if (!nextValue || disabled || isSubmitting) {
      return
    }

    setValue('')
    await onSubmit(nextValue)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await submitValue()
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
      className={[
        'bg-[#f5f5f7] shadow-[rgba(0,0,0,0.08)_0px_18px_40px_-24px]',
        isCompact ? 'rounded-[16px] p-2.5' : 'rounded-[20px] p-3'
      ].join(' ')}
    >
      <label className="sr-only" htmlFor="assistant-composer">
        Ask Dusto
      </label>
      <textarea
        id="assistant-composer"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onCompositionStart={() => {
          isComposingRef.current = true
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || isComposingRef.current) {
            return
          }

          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void submitValue()
          }
        }}
        rows={isCompact ? 2 : 3}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          'w-full resize-none rounded-[14px] border border-black/[0.06] bg-white text-[#1d1d1f] outline-none placeholder:text-black/[0.35] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/15 disabled:cursor-not-allowed disabled:bg-black/[0.03]',
          isCompact
            ? 'min-h-[62px] px-3 py-2.5 text-[13px] leading-[1.42] tracking-[-0.18px]'
            : 'min-h-[84px] px-4 py-3 text-[15px] leading-[1.45] tracking-[-0.24px]'
        ].join(' ')}
      />

      <div className={['flex items-center justify-between gap-3 px-1', isCompact ? 'mt-2' : 'mt-3'].join(' ')}>
        <p className={['tracking-[-0.12px] text-black/[0.42]', isCompact ? 'text-[11px]' : 'text-[12px]'].join(' ')}>
          {isSubmitting
            ? 'Dusto is working through one request at a time.'
            : 'Replies stay short, calm, and grounded in app-owned actions.'}
        </p>
        <button
          type="submit"
          disabled={disabled || isSubmitting || !value.trim()}
          className={[
            'shrink-0 rounded-full bg-[#0071e3] font-medium tracking-[-0.22px] text-white transition-colors duration-150 hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:bg-[#b7d6f5]',
            isCompact ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-[14px]'
          ].join(' ')}
        >
          {isSubmitting ? 'Working…' : 'Send'}
        </button>
      </div>
    </form>
  )
}

export default AssistantComposer
