import { enqueueWrite, readJsonFile, writeJsonFile, writeJsonFileSync } from './json-file'
import { readLegacyCanvas } from './legacy-store'
import {
  hydrateCanvasBoards,
  normalizeCanvasData,
  normalizeCanvasFromBoards,
} from './normalize'
import { getCanvasFilePath } from './paths'
import type {
  StoredCanvasData,
  StoredCanvasMetaState,
  StoredCanvasSceneUpdate,
  StoredCanvasSnapshot,
} from './types'

async function readCanvasData(): Promise<StoredCanvasData> {
  const canvas = await readJsonFile(getCanvasFilePath(), normalizeCanvasData)
  if (canvas !== null) {
    return canvas
  }

  return readLegacyCanvas()
}

function buildCanvasMetaData(
  current: StoredCanvasData,
  input: StoredCanvasMetaState
): StoredCanvasData {
  const boardIds = new Set(input.boards.map((board) => board.id))
  const scenes = Object.fromEntries(
    Object.entries(current.scenes).filter(([id]) => boardIds.has(id))
  )

  return {
    boards: input.boards,
    selectedBoardId:
      input.selectedBoardId && boardIds.has(input.selectedBoardId)
        ? input.selectedBoardId
        : (input.boards[0]?.id ?? null),
    scenes,
  }
}

function buildCanvasSceneData(
  current: StoredCanvasData,
  input: StoredCanvasSceneUpdate
): StoredCanvasData | null {
  const boardExists = current.boards.some((board) => board.id === input.id)
  if (!boardExists) {
    return null
  }

  return {
    boards: current.boards.map((board) =>
      board.id === input.id ? { ...board, updatedAt: input.updatedAt } : board
    ),
    selectedBoardId: current.selectedBoardId,
    scenes: {
      ...current.scenes,
      [input.id]: input.scene,
    },
  }
}

export async function loadCanvas(): Promise<StoredCanvasSnapshot> {
  const data = await readCanvasData()
  return {
    boards: hydrateCanvasBoards(data),
    selectedBoardId: data.selectedBoardId,
  }
}

export async function saveCanvas(input: StoredCanvasSnapshot): Promise<void> {
  return enqueueWrite(async () => {
    await writeJsonFile(
      getCanvasFilePath(),
      normalizeCanvasFromBoards(input.boards, input.selectedBoardId)
    )
  })
}

export async function saveCanvasMeta(input: StoredCanvasMetaState): Promise<void> {
  return enqueueWrite(async () => {
    const current = await readCanvasData()
    await writeJsonFile(getCanvasFilePath(), buildCanvasMetaData(current, input))
  })
}

export async function saveCanvasScene(input: StoredCanvasSceneUpdate): Promise<void> {
  return enqueueWrite(async () => {
    const current = await readCanvasData()
    const nextData = buildCanvasSceneData(current, input)
    if (!nextData) {
      return
    }

    await writeJsonFile(getCanvasFilePath(), nextData)
  })
}

export function saveCanvasSync(input: StoredCanvasSnapshot): void {
  writeJsonFileSync(
    getCanvasFilePath(),
    normalizeCanvasFromBoards(input.boards, input.selectedBoardId)
  )
}
