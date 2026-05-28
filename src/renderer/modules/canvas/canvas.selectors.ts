import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import type { CanvasBoard } from './canvas.types'

export const EMPTY_SCENE = JSON.stringify({
  type: 'excalidraw',
  version: 2,
  source: 'dusto',
  elements: [],
  appState: {
    viewBackgroundColor: '#fbfbfd'
  },
  files: {}
})

export function getCanvasBoardTitle(title: string): string {
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : 'Untitled Board'
}

export function getSelectedCanvasBoard(
  boards: CanvasBoard[],
  selectedBoardId: string | null
): CanvasBoard | null {
  if (!selectedBoardId) {
    return null
  }

  return boards.find((board) => board.id === selectedBoardId) ?? null
}

export function getCanvasBoardScene(board: CanvasBoard | null): ExcalidrawInitialDataState | null {
  if (!board) {
    return null
  }

  try {
    return JSON.parse(board.scene) as ExcalidrawInitialDataState
  } catch {
    return JSON.parse(EMPTY_SCENE) as ExcalidrawInitialDataState
  }
}
