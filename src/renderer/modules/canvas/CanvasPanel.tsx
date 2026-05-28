import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import DustoCharacter from '../../components/DustoCharacter'
import PageLoader from '../../components/PageLoader'
import CanvasBoardGrid from './CanvasBoardGrid'
import { getCanvasBoardScene, getSelectedCanvasBoard } from './canvas.selectors'
import useCanvasStore, { hydrateCanvasStore } from './canvas.store'

const SF_DISPLAY = "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
const SF_TEXT = "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
const CanvasBoardEditor = lazy(() => import('./CanvasBoardEditor'))

interface CanvasErrorBoundaryState {
  hasError: boolean
  message: string
}

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = {
    hasError: false,
    message: ''
  }

  static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return {
      hasError: true,
      message: error.message
    }
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex h-full items-center justify-center bg-[#fbfbfd] p-8">
        <div className="max-w-[420px] rounded-[18px] border border-[#ff3b30]/15 bg-white px-6 py-5 shadow-[rgba(0,0,0,0.08)_3px_8px_24px_0px]">
          <p
            className="text-[17px] font-semibold tracking-[-0.374px] text-[#1d1d1f]"
            style={{ fontFamily: SF_DISPLAY }}
          >
            Canvas failed to load.
          </p>
          <p
            className="mt-2 text-[13px] leading-[1.5] tracking-[-0.224px]"
            style={{ color: 'rgba(0,0,0,0.54)', fontFamily: SF_TEXT }}
          >
            {this.state.message || 'A renderer error happened while mounting the whiteboard.'}
          </p>
        </div>
      </div>
    )
  }
}

function CanvasPanel(): React.JSX.Element {
  const boards = useCanvasStore((state) => state.boards)
  const selectedBoardId = useCanvasStore((state) => state.selectedBoardId)
  const hydrated = useCanvasStore((state) => state.hydrated)
  const createBoard = useCanvasStore((state) => state.createBoard)
  const updateBoardTitle = useCanvasStore((state) => state.updateBoardTitle)
  const removeBoard = useCanvasStore((state) => state.removeBoard)
  const selectBoard = useCanvasStore((state) => state.selectBoard)
  const updateBoardScene = useCanvasStore((state) => state.updateBoardScene)
  const [isBoardOpen, setIsBoardOpen] = useState(false)

  useEffect(() => {
    void hydrateCanvasStore()
  }, [])

  const selectedBoard = getSelectedCanvasBoard(boards, selectedBoardId)
  const initialData = useMemo(() => getCanvasBoardScene(selectedBoard), [selectedBoard])

  function handleOpenBoard(boardId: string): void {
    selectBoard(boardId)
    setIsBoardOpen(true)
  }

  function handleCreateBoard(): void {
    createBoard()
    setIsBoardOpen(true)
  }

  const isListView = !isBoardOpen || selectedBoard === null

  return (
    <div className="h-full min-h-0 bg-[#f6f6f8]">
      {isListView ? (
        <div className="flex h-full flex-col">
          <div className="flex-shrink-0 px-10 pb-6 pt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1
                  className="text-[28px] font-semibold leading-[1.14] tracking-[0.196px] text-[#1d1d1f]"
                  style={{ fontFamily: SF_DISPLAY }}
                >
                  Canvas
                </h1>
                <p
                  className="mt-2 text-[14px] tracking-[-0.224px]"
                  style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
                >
                  Open a board first, then step into a full-screen whiteboard for drawing and mapping ideas.
                </p>
              </div>

              <button
                onClick={handleCreateBoard}
                className="h-[38px] rounded-[999px] bg-[#0071e3] px-4 text-[13px] tracking-[-0.224px] text-white transition-colors duration-100 hover:bg-[#0077ed]"
                style={{ fontFamily: SF_TEXT }}
              >
                + New Board
              </button>
            </div>
            <div className="mt-6 h-px bg-black/[0.06]" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-10 pb-10">
            {hydrated && boards.length === 0 ? (
              <div className="flex h-full min-h-[420px] items-center justify-center">
                <div
                  className="flex w-full max-w-[440px] flex-col items-center rounded-[28px] border border-black/[0.05] bg-white px-8 py-10 text-center"
                  style={{ boxShadow: 'rgba(0,0,0,0.08) 3px 8px 28px 0px' }}
                >
                  <DustoCharacter variant="ribbon" size={60} />
                  <p
                    className="mt-5 text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#1d1d1f]"
                    style={{ fontFamily: SF_DISPLAY }}
                  >
                    Start your first whiteboard.
                  </p>
                  <p
                    className="mt-3 text-[14px] leading-[1.5] tracking-[-0.224px]"
                    style={{ color: 'rgba(0,0,0,0.44)', fontFamily: SF_TEXT }}
                  >
                    Sketch ideas, place text freely, connect shapes, and let each board open into a focused canvas.
                  </p>
                  <button
                    onClick={handleCreateBoard}
                    className="mt-6 rounded-[999px] bg-[#0071e3] px-4 py-2 text-[13px] tracking-[-0.224px] text-white transition-colors duration-100 hover:bg-[#0077ed]"
                    style={{ fontFamily: SF_TEXT }}
                  >
                    Create Board
                  </button>
                </div>
              </div>
            ) : (
              <CanvasBoardGrid
                boards={boards}
                selectedBoardId={selectedBoardId}
                onOpenBoard={handleOpenBoard}
                onRemoveBoard={removeBoard}
              />
            )}
          </div>
        </div>
      ) : (
        <CanvasErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <CanvasBoardEditor
              board={selectedBoard}
              initialData={initialData}
              onBack={() => setIsBoardOpen(false)}
              onRename={updateBoardTitle}
              onSceneChange={updateBoardScene}
            />
          </Suspense>
        </CanvasErrorBoundary>
      )}
    </div>
  )
}

export default CanvasPanel
