import React, { useEffect, useRef } from 'react'
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState
} from '@excalidraw/excalidraw/types'
import { REQUEST_RENDERER_FLUSH_EVENT } from '../../stores/persistence'
import { getCanvasBoardTitle } from './canvas.selectors'
import type { CanvasBoard } from './canvas.types'

const SF_DISPLAY = "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
const SF_TEXT = "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
const SAVE_DELAY_MS = 1000

function BackIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.75 3.5L5.25 8L9.75 12.5" />
    </svg>
  )
}

interface CanvasBoardEditorProps {
  board: CanvasBoard
  initialData: ExcalidrawInitialDataState | null
  onBack: () => void
  onRename: (id: string, title: string) => void
  onSceneChange: (id: string, scene: string) => void
}

function CanvasBoardEditor({
  board,
  initialData,
  onBack,
  onRename,
  onSceneChange
}: CanvasBoardEditorProps): React.JSX.Element {
  const saveTimeoutRef = useRef<number | null>(null)
  const lastSerializedSceneRef = useRef<string>(board.scene)
  const pendingSceneRef = useRef<string | null>(null)

  useEffect(() => {
    lastSerializedSceneRef.current = board.scene
  }, [board.id, board.scene])

  useEffect(() => {
    function flushPendingScene(): void {
      if (pendingSceneRef.current === null) {
        return
      }

      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      const pendingScene = pendingSceneRef.current
      pendingSceneRef.current = null
      onSceneChange(board.id, pendingScene)
    }

    window.addEventListener(REQUEST_RENDERER_FLUSH_EVENT, flushPendingScene)

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current)
      }
      window.removeEventListener(REQUEST_RENDERER_FLUSH_EVENT, flushPendingScene)
    }
  }, [board.id, onSceneChange])

  function queueSceneSave(nextScene: string): void {
    pendingSceneRef.current = nextScene

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null
      pendingSceneRef.current = null
      onSceneChange(board.id, nextScene)
    }, SAVE_DELAY_MS)
  }

  function handleChange(
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ): void {
    const scene = serializeAsJSON(elements, appState, files, 'local')
    if (scene === lastSerializedSceneRef.current) {
      return
    }

    lastSerializedSceneRef.current = scene
    queueSceneSave(scene)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-black/[0.06] px-5 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-[#f5f5f7] text-[rgba(29,29,31,0.75)] transition-colors duration-100 hover:bg-[#ebebef]"
            aria-label="Back to board list"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <input
              value={board.title}
              onChange={(event) => onRename(board.id, event.target.value)}
              placeholder="Untitled Board"
              className="w-full max-w-[360px] bg-transparent text-[22px] font-semibold leading-[1.15] tracking-[-0.45px] outline-none"
              style={{ color: '#1d1d1f', fontFamily: SF_DISPLAY }}
            />
            <p
              className="mt-1 text-[12px] tracking-[-0.12px]"
              style={{ color: 'rgba(0,0,0,0.38)', fontFamily: SF_TEXT }}
            >
              {getCanvasBoardTitle(board.title)} saves after you pause for a moment.
            </p>
          </div>
        </div>

        <div
          className="ml-4 hidden rounded-[12px] border border-black/[0.05] bg-white px-3 py-2 md:block"
          style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 2px 10px 0px' }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.08em]"
            style={{ color: 'rgba(0,0,0,0.3)', fontFamily: SF_TEXT }}
          >
            Tools
          </p>
          <p
            className="mt-1 text-[12px] tracking-[-0.12px]"
            style={{ color: 'rgba(0,0,0,0.52)', fontFamily: SF_TEXT }}
          >
            Select, hand, draw, text, shapes
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className="h-full min-h-0">
          <Excalidraw
            key={board.id}
            initialData={initialData}
            onChange={handleChange}
            theme="light"
            gridModeEnabled
            autoFocus
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: true,
                clearCanvas: true,
                export: {},
                loadScene: false,
                saveToActiveFile: false,
                saveAsImage: true,
                toggleTheme: false
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default CanvasBoardEditor
