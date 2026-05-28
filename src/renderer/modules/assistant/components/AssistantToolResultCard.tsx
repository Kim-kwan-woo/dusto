import React from 'react'
import DustoCharacter, { type DustoVariant } from '../../../components/DustoCharacter'
import type { AssistantToolCall } from '../../../../preload/api'

interface AssistantToolResultCardProps {
  toolCall: AssistantToolCall
  onNavigate: (moduleId: string) => void
}

function getStatusLabel(status: AssistantToolCall['status']): string {
  if (status === 'completed') {
    return 'Done'
  }

  if (status === 'pending') {
    return 'Waiting'
  }

  if (status === 'cancelled') {
    return 'Cancelled'
  }

  return 'Needs attention'
}

function getToolLabel(toolName: AssistantToolCall['name']): string {
  if (toolName.startsWith('notes.')) {
    return 'Note'
  }

  if (toolName.startsWith('todo.')) {
    return 'Todo'
  }

  if (toolName.startsWith('canvas.')) {
    return 'Canvas'
  }

  return 'HTML'
}

function trimLine(value: string, fallback: string): string {
  const firstLine = value.trim().split('\n')[0]?.trim() ?? ''
  return firstLine || fallback
}

function buildHeadline(toolCall: AssistantToolCall): string {
  const result = toolCall.result ?? {}

  if (toolCall.status !== 'completed') {
    return toolCall.error ?? toolCall.title
  }

  if (toolCall.name === 'notes.create' || toolCall.name === 'notes.rewrite') {
    const note = result['note']
    if (note && typeof note === 'object' && typeof (note as { body?: unknown }).body === 'string') {
      return trimLine((note as { body: string }).body, 'Untitled note')
    }
  }

  if (toolCall.name === 'notes.summarize' && typeof result['summary'] === 'string') {
    return trimLine(result['summary'], 'Summary ready')
  }

  if (toolCall.name === 'todo.create') {
    const todo = result['todo']
    if (todo && typeof todo === 'object' && typeof (todo as { text?: unknown }).text === 'string') {
      return trimLine((todo as { text: string }).text, 'Task added')
    }
  }

  if (toolCall.name === 'todo.extract') {
    const created = result['created']
    if (Array.isArray(created)) {
      return `${created.length} item${created.length === 1 ? '' : 's'}`
    }
  }

  if (toolCall.name === 'todo.cleanup' && typeof result['removedCount'] === 'number') {
    return `${result['removedCount']} cleared`
  }

  if (toolCall.name === 'canvas.create' || toolCall.name === 'canvas.rename') {
    const board = result['board']
    if (board && typeof board === 'object' && typeof (board as { title?: unknown }).title === 'string') {
      return trimLine((board as { title: string }).title, 'Untitled board')
    }
  }

  if (toolCall.name === 'html.generate') {
    return 'Draft preview ready'
  }

  if (toolCall.name === 'html.rewrite') {
    return 'Current document replaced'
  }

  return toolCall.title
}

function getOpenLabel(toolName: AssistantToolCall['name']): string {
  if (toolName.startsWith('notes.')) {
    return 'Open Notes'
  }

  if (toolName.startsWith('todo.')) {
    return 'Open Todo'
  }

  if (toolName.startsWith('canvas.')) {
    return 'Open Canvas'
  }

  return 'Open HTML'
}

function getTargetModule(toolName: AssistantToolCall['name']): string {
  if (toolName.startsWith('notes.')) {
    return 'notes'
  }

  if (toolName.startsWith('todo.')) {
    return 'todo'
  }

  if (toolName.startsWith('canvas.')) {
    return 'canvas'
  }

  return 'htmleditor'
}

function getStatusVariant(status: AssistantToolCall['status']): DustoVariant {
  if (status === 'completed') {
    return 'shiny'
  }

  if (status === 'pending') {
    return 'cleaner'
  }

  if (status === 'cancelled') {
    return 'hidden'
  }

  return 'crying'
}

function AssistantToolResultCard({
  toolCall,
  onNavigate
}: AssistantToolResultCardProps): React.JSX.Element {
  const statusLabel = getStatusLabel(toolCall.status)
  const headline = buildHeadline(toolCall)
  const toolLabel = getToolLabel(toolCall.name)
  const statusVariant = getStatusVariant(toolCall.status)
  const statusDotClass =
    toolCall.status === 'completed'
      ? 'bg-[#34c759]'
      : toolCall.status === 'pending'
        ? 'bg-[#0071e3]'
        : 'bg-[#ff3b30]'

  return (
    <article className="flex justify-start">
      <div className="flex w-full max-w-[88%] flex-wrap items-center gap-3 rounded-[18px] border border-black/[0.06] bg-[#fbfbfc] px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <DustoCharacter variant={statusVariant} size={28} />
          <span className={['h-2.5 w-2.5 flex-none rounded-full', statusDotClass].join(' ')} />
          <p className="min-w-0 truncate text-[14px] leading-[1.4] tracking-[-0.22px] text-[#1d1d1f]">
            <span className="font-semibold">{toolLabel}</span>
            <span className="mx-1.5 text-black/[0.26]">·</span>
            <span>{headline}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium tracking-[0.01em] text-black/[0.5]">
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => {
              onNavigate(getTargetModule(toolCall.name))
            }}
            className="rounded-full border border-[#0071e3]/18 px-3 py-1.5 text-[12px] font-medium tracking-[-0.18px] text-[#0066cc] transition-colors duration-150 hover:bg-[#eef5ff]"
          >
            {getOpenLabel(toolCall.name)}
          </button>
        </div>
      </div>
    </article>
  )
}

export default AssistantToolResultCard
