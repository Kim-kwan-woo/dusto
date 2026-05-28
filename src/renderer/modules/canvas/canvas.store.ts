import { create } from 'zustand'
import {
  clearCanvasBackupTimer,
  clearCanvasMetadataSaveTimer,
  flushCanvasSnapshot,
  hydrateCanvasSnapshot,
  normalizeCanvasSnapshot,
  saveCanvasMetadata,
  saveCanvasScene,
  writeCanvasBackupNow
} from './canvas.persistence'
import { EMPTY_SCENE } from './canvas.selectors'
import type { CanvasBoard, CanvasSnapshot } from './canvas.types'

interface CanvasState {
  boards: CanvasBoard[]
  selectedBoardId: string | null
  hydrated: boolean

  hydrate: () => Promise<void>
  syncFromAssistant: (payload: { boards: CanvasBoard[]; selectedBoardId: string | null }) => void
  createBoard: () => void
  updateBoardTitle: (id: string, title: string) => void
  removeBoard: (id: string) => void
  selectBoard: (id: string) => void
  updateBoardScene: (id: string, scene: string) => void
}

function createSnapshot(boards: CanvasBoard[], selectedBoardId: string | null): CanvasSnapshot {
  return { boards, selectedBoardId }
}

const useCanvasStore = create<CanvasState>()((set, get) => ({
  boards: [],
  selectedBoardId: null,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return

    try {
      const snapshot = await hydrateCanvasSnapshot()
      set({
        ...snapshot,
        hydrated: true
      })
    } catch {
      set({ hydrated: true })
    }
  },

  syncFromAssistant(payload) {
    clearCanvasBackupTimer()
    clearCanvasMetadataSaveTimer()
    const snapshot = normalizeCanvasSnapshot(payload)

    set({
      boards: snapshot.boards,
      selectedBoardId: snapshot.selectedBoardId,
      hydrated: true
    })

    writeCanvasBackupNow(snapshot)
  },

  createBoard() {
    const now = Date.now()
    const board: CanvasBoard = {
      id: crypto.randomUUID(),
      title: '',
      createdAt: now,
      updatedAt: now,
      scene: EMPTY_SCENE
    }

    set((state) => {
      const boards = [board, ...state.boards]
      saveCanvasMetadata(createSnapshot(boards, board.id), state.hydrated)

      return {
        boards,
        selectedBoardId: board.id
      }
    })
  },

  updateBoardTitle(id, title) {
    set((state) => {
      const boards = state.boards.map((board) =>
        board.id === id
          ? {
              ...board,
              title,
              updatedAt: Date.now()
            }
          : board
      )
      saveCanvasMetadata(createSnapshot(boards, state.selectedBoardId), state.hydrated)
      return { boards }
    })
  },

  removeBoard(id) {
    set((state) => {
      const boards = state.boards.filter((board) => board.id !== id)
      const selectedBoardId =
        state.selectedBoardId === id ? (boards[0]?.id ?? null) : state.selectedBoardId

      saveCanvasMetadata(createSnapshot(boards, selectedBoardId), state.hydrated)

      return {
        boards,
        selectedBoardId
      }
    })
  },

  selectBoard(id) {
    set((state) => {
      if (state.selectedBoardId === id) {
        return {}
      }

      saveCanvasMetadata(createSnapshot(state.boards, id), state.hydrated)
      return { selectedBoardId: id }
    })
  },

  updateBoardScene(id, scene) {
    set((state) => {
      const currentBoard = state.boards.find((board) => board.id === id)
      if (!currentBoard || currentBoard.scene === scene) {
        return {}
      }

      const updatedAt = Date.now()
      const boards = state.boards.map((board) =>
        board.id === id
          ? {
              ...board,
              scene,
              updatedAt
            }
          : board
      )

      saveCanvasScene(
        id,
        scene,
        updatedAt,
        createSnapshot(boards, state.selectedBoardId),
        state.hydrated
      )

      return { boards }
    })
  }
}))

export function hydrateCanvasStore(): Promise<void> {
  return useCanvasStore.getState().hydrate()
}

export function flushCanvasStore(): void {
  const { boards, selectedBoardId, hydrated } = useCanvasStore.getState()
  flushCanvasSnapshot(createSnapshot(boards, selectedBoardId), hydrated)
}

export function syncCanvasStoreFromAssistant(payload: {
  boards: CanvasBoard[]
  selectedBoardId: string | null
}): void {
  useCanvasStore.getState().syncFromAssistant(payload)
}

export type { CanvasBoard }

export default useCanvasStore
