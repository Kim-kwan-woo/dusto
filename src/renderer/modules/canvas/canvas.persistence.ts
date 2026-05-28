import type { CanvasBackupState, CanvasBoard, CanvasSnapshot } from './canvas.types'

const STORAGE_KEY = 'dusto-canvas-storage'
const BACKUP_DELAY_MS = 1500
const META_SAVE_DELAY_MS = 500

let hydrationPromise: Promise<CanvasSnapshot> | null = null
let backupTimer: number | null = null
let metadataSaveTimer: number | null = null

function isCanvasBoard(value: unknown): value is CanvasBoard {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const board = value as Record<string, unknown>
  return (
    typeof board.id === 'string' &&
    typeof board.title === 'string' &&
    typeof board.createdAt === 'number' &&
    typeof board.updatedAt === 'number' &&
    typeof board.scene === 'string'
  )
}

function toCanvasMetadata(boards: CanvasBoard[]): Array<{
  id: string
  title: string
  createdAt: number
  updatedAt: number
}> {
  return boards.map(({ scene: _scene, ...board }) => board)
}

function readLegacyCanvas(): CanvasBackupState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as { state?: CanvasBackupState }
    return parsed.state ?? {}
  } catch {
    return {}
  }
}

function writeCanvasBackup(snapshot: CanvasSnapshot): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: snapshot,
        version: 0
      })
    )
  } catch {
    // Ignore local backup failures and keep file storage as primary.
  }
}

export function clearCanvasBackupTimer(): void {
  if (backupTimer !== null) {
    window.clearTimeout(backupTimer)
    backupTimer = null
  }
}

export function clearCanvasMetadataSaveTimer(): void {
  if (metadataSaveTimer !== null) {
    window.clearTimeout(metadataSaveTimer)
    metadataSaveTimer = null
  }
}

export function writeCanvasBackupNow(snapshot: CanvasSnapshot): void {
  clearCanvasBackupTimer()
  writeCanvasBackup(snapshot)
}

export function scheduleCanvasBackup(snapshot: CanvasSnapshot): void {
  clearCanvasBackupTimer()
  backupTimer = window.setTimeout(() => {
    backupTimer = null
    writeCanvasBackup(snapshot)
  }, BACKUP_DELAY_MS)
}

export function normalizeCanvasSnapshot(input: CanvasBackupState): CanvasSnapshot {
  const boards = Array.isArray(input.boards) ? input.boards.filter(isCanvasBoard) : []
  const boardIds = new Set(boards.map((board) => board.id))

  return {
    boards,
    selectedBoardId:
      typeof input.selectedBoardId === 'string' && boardIds.has(input.selectedBoardId)
        ? input.selectedBoardId
        : (boards[0]?.id ?? null)
  }
}

export async function hydrateCanvasSnapshot(): Promise<CanvasSnapshot> {
  if (hydrationPromise) {
    return hydrationPromise
  }

  hydrationPromise = (async () => {
    const stored = await window.api.loadCanvas()
    const snapshot = normalizeCanvasSnapshot(
      stored.boards.length > 0 || stored.selectedBoardId !== null
        ? {
            boards: stored.boards,
            selectedBoardId: stored.selectedBoardId
          }
        : readLegacyCanvas()
    )

    if (stored.boards.length === 0 && snapshot.boards.length > 0) {
      writeCanvasBackup(snapshot)
      void window.api.saveCanvas(snapshot)
    }

    return snapshot
  })()

  try {
    return await hydrationPromise
  } finally {
    hydrationPromise = null
  }
}

export function saveCanvasMetadata(snapshot: CanvasSnapshot, hydrated: boolean): void {
  scheduleCanvasBackup(snapshot)
  if (!hydrated) {
    return
  }

  clearCanvasMetadataSaveTimer()
  metadataSaveTimer = window.setTimeout(() => {
    metadataSaveTimer = null
    void window.api.saveCanvasMeta({
      boards: toCanvasMetadata(snapshot.boards),
      selectedBoardId: snapshot.selectedBoardId
    })
  }, META_SAVE_DELAY_MS)
}

export function saveCanvasScene(
  id: string,
  scene: string,
  updatedAt: number,
  snapshot: CanvasSnapshot,
  hydrated: boolean
): void {
  scheduleCanvasBackup(snapshot)
  if (!hydrated) {
    return
  }

  void window.api.saveCanvasScene({
    id,
    scene,
    updatedAt
  })
}

export function flushCanvasSnapshot(snapshot: CanvasSnapshot, hydrated: boolean): void {
  clearCanvasMetadataSaveTimer()
  writeCanvasBackupNow(snapshot)
  if (!hydrated) {
    return
  }

  window.api.flushCanvas(snapshot)
}
