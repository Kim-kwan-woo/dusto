import React from 'react'
import { getCanvasBoardTitle } from './canvas.selectors'
import type { CanvasBoard } from './canvas.types'

const SF_DISPLAY = "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
const SF_TEXT = "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

function formatDate(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function handleCardKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  onOpen: () => void
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onOpen()
  }
}

interface CanvasBoardCardProps {
  board: CanvasBoard
  isActive: boolean
  onOpenBoard: (boardId: string) => void
  onRemoveBoard: (boardId: string) => void
}

function CanvasBoardCard({
  board,
  isActive,
  onOpenBoard,
  onRemoveBoard
}: CanvasBoardCardProps): React.JSX.Element {
  return (
    <li>
      <div
        className="flex h-full cursor-pointer flex-col rounded-[24px] border border-black/[0.05] bg-white p-5 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
        style={{ boxShadow: 'rgba(0,0,0,0.08) 3px 8px 28px 0px' }}
        onClick={() => onOpenBoard(board.id)}
        onKeyDown={(event) => handleCardKeyDown(event, () => onOpenBoard(board.id))}
        role="button"
        tabIndex={0}
        aria-label={`Open ${getCanvasBoardTitle(board.title)} board`}
      >
        <div className="flex-1 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span
                className="rounded-[999px] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em]"
                style={{
                  background: isActive ? '#0071e3' : '#f5f5f7',
                  color: isActive ? '#ffffff' : 'rgba(0,0,0,0.42)',
                  fontFamily: SF_TEXT
                }}
              >
                {isActive ? 'Last Opened' : 'Whiteboard'}
              </span>
              <p
                className="mt-4 truncate text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#1d1d1f]"
                style={{ fontFamily: SF_DISPLAY }}
              >
                {getCanvasBoardTitle(board.title)}
              </p>
            </div>

            <span
              className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[11px] tracking-[-0.12px]"
              style={{ color: 'rgba(0,0,0,0.46)', fontFamily: SF_TEXT }}
            >
              Open
            </span>
          </div>

          <p
            className="mt-8 text-[13px] leading-[1.5] tracking-[-0.224px]"
            style={{ color: 'rgba(0,0,0,0.4)', fontFamily: SF_TEXT }}
          >
            Updated {formatDate(board.updatedAt)}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-black/[0.05] pt-4">
          <p
            className="text-[12px] tracking-[-0.12px]"
            style={{ color: 'rgba(0,0,0,0.34)', fontFamily: SF_TEXT }}
          >
            Tap to enter the full canvas view.
          </p>
          <button
            onClick={(event) => {
              event.stopPropagation()
              onRemoveBoard(board.id)
            }}
            className="rounded-[999px] px-3 py-1.5 text-[12px] tracking-[-0.12px] transition-colors duration-100 hover:bg-[#f5f5f7]"
            style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}

export default React.memo(
  CanvasBoardCard,
  (prev, next) =>
    prev.board === next.board && prev.isActive === next.isActive
)
