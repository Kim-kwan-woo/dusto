import React from 'react'
import DustoCharacter from '../../../components/DustoCharacter'
import type { AssistantTimelineItem } from '../assistant.store'
import AssistantConfirmationCard from './AssistantConfirmationCard'
import AssistantToolResultCard from './AssistantToolResultCard'

interface AssistantTranscriptProps {
  items: AssistantTimelineItem[]
  isSubmitting: boolean
  onNavigate: (moduleId: string) => void
  onConfirmationDecision: (confirmationId: string, decision: 'approved' | 'rejected') => void
}

function MessageBubble({
  align,
  content,
  tone = 'default',
  optimistic = false
}: {
  align: 'left' | 'right'
  content: string
  tone?: 'default' | 'error'
  optimistic?: boolean
}): React.JSX.Element {
  const isRight = align === 'right'
  const showErrorCharacter = tone === 'error' && !isRight

  return (
    <div className={['flex', isRight ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[82%] rounded-[20px] px-4 py-2.5 text-[14px] leading-[1.45] tracking-[-0.22px] sm:text-[15px]',
          showErrorCharacter ? 'flex items-start gap-2' : '',
          isRight
            ? 'bg-[#0071e3] text-white'
            : tone === 'error'
              ? 'border border-[#ff3b30]/12 bg-[#fff5f4] text-[#8f1d14]'
              : 'bg-[#f5f5f7] text-[#1d1d1f]',
          optimistic ? 'opacity-80' : ''
        ].join(' ')}
      >
        {showErrorCharacter ? <DustoCharacter variant="crying" size={24} /> : null}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

function AssistantTranscript({
  items,
  isSubmitting,
  onNavigate,
  onConfirmationDecision
}: AssistantTranscriptProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
        <div className="flex max-w-[20rem] flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#f5f5f7]">
            <DustoCharacter variant="shy" size={72} />
          </div>
          <p className="mt-5 text-[17px] leading-[1.4] tracking-[-0.28px] text-[#1d1d1f]">
            Ask Dusto for one thing, and keep the thread clean.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-1 flex-col gap-2">
      {items.map((item) => {
        if (item.kind === 'message') {
          return (
            <MessageBubble
              key={item.id}
              align={item.role === 'user' ? 'right' : 'left'}
              content={item.content}
              tone={item.tone}
              optimistic={item.optimistic}
            />
          )
        }

        if (item.kind === 'tool') {
          return (
            <AssistantToolResultCard
              key={item.id}
              toolCall={item.toolCall}
              onNavigate={onNavigate}
            />
          )
        }

        return (
          <AssistantConfirmationCard
            key={item.id}
            confirmation={item.confirmation}
            state={item.state}
            disabled={isSubmitting}
            onDecision={(decision) => onConfirmationDecision(item.confirmation.id, decision)}
          />
        )
      })}

      {isSubmitting ? (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 rounded-[18px] bg-[#f5f5f7] px-4 py-2.5 text-[14px] tracking-[-0.22px] text-black/[0.58]">
            <DustoCharacter variant="cleaner" size={24} />
            Dusto is working...
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AssistantTranscript
