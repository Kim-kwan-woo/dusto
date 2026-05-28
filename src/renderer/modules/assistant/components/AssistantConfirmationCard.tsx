import React from 'react'
import DustoCharacter from '../../../components/DustoCharacter'
import type { AssistantConfirmationDecision, AssistantConfirmationRequest } from '../../../../preload/api'

interface AssistantConfirmationCardProps {
  confirmation: AssistantConfirmationRequest
  state: 'pending' | 'approved' | 'rejected'
  disabled?: boolean
  onDecision: (decision: AssistantConfirmationDecision) => void
}

function AssistantConfirmationCard({
  confirmation,
  state,
  disabled = false,
  onDecision
}: AssistantConfirmationCardProps): React.JSX.Element {
  const resolved = state !== 'pending'
  const characterVariant =
    state === 'approved' ? 'shiny' : state === 'rejected' ? 'hidden' : confirmation.destructive ? 'angry' : 'detective'
  const accentClass = confirmation.destructive
    ? 'border-[#ff3b30]/14 bg-[#fff5f4]'
    : 'border-[#0071e3]/14 bg-[#eef5ff]'
  const eyebrowClass = confirmation.destructive ? 'text-[#b42318]/70' : 'text-[#0066cc]/70'

  return (
    <article className={`rounded-[18px] border p-4 ${accentClass}`}>
      <div className="flex items-start gap-3">
        <DustoCharacter variant={characterVariant} size={36} />
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] uppercase tracking-[0.12em] ${eyebrowClass}`}>
            {confirmation.destructive ? 'Confirm change' : 'Confirmation'}
          </p>
          <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.28px] text-[#1d1d1f]">
            {confirmation.title}
          </h3>
        </div>
      </div>
      <p className="mt-2 text-[14px] leading-[1.5] tracking-[-0.22px] text-black/[0.72]">
        {confirmation.message}
      </p>
      {state === 'pending' ? (
        <p className="mt-2 text-[12px] tracking-[-0.12px] text-black/[0.45]">
          Nothing changes until you confirm.
        </p>
      ) : null}

      {confirmation.preview ? (
        <pre className="mt-3 overflow-auto rounded-[12px] bg-white/80 p-3 text-[12px] leading-[1.45] tracking-[-0.12px] text-black/[0.68]">
          {confirmation.preview}
        </pre>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onDecision('approved')}
          disabled={disabled || resolved}
          className="rounded-full bg-[#0071e3] px-4 py-2 text-[13px] font-medium tracking-[-0.22px] text-white transition-colors duration-150 hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:bg-[#a7caee]"
        >
          {state === 'approved' ? 'Approved' : confirmation.confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => onDecision('rejected')}
          disabled={disabled || resolved}
          className="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] tracking-[-0.22px] text-black/[0.72] transition-colors duration-150 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'rejected' ? 'Declined' : confirmation.cancelLabel}
        </button>
      </div>
    </article>
  )
}

export default AssistantConfirmationCard
