import React from 'react'
import type { CanvasBoard } from './canvas.types'
import CanvasBoardCard from './CanvasBoardCard'

interface CanvasBoardGridProps {
  boards: CanvasBoard[]
  selectedBoardId: string | null
  onOpenBoard: (boardId: string) => void
  onRemoveBoard: (boardId: string) => void
}

function CanvasBoardGrid({
  boards,
  selectedBoardId,
  onOpenBoard,
  onRemoveBoard
}: CanvasBoardGridProps): React.JSX.Element {
  return (
    <ul className="grid grid-cols-1 gap-4 pb-2 pt-2 md:grid-cols-2 xl:grid-cols-3">
      {boards.map((board) => (
        <CanvasBoardCard
          key={board.id}
          board={board}
          isActive={board.id === selectedBoardId}
          onOpenBoard={onOpenBoard}
          onRemoveBoard={onRemoveBoard}
        />
      ))}
    </ul>
  )
}

export default React.memo(CanvasBoardGrid)
