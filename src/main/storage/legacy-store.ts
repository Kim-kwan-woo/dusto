import { readJsonFile } from './json-file'
import { getDefaultLegacyData, normalizeCanvasFromBoards, normalizeLegacyData } from './normalize'
import { getLegacyStorageFilePath } from './paths'
import type { AppStorageData, StoredCanvasData, StoredNotesData, StoredTodoItem } from './types'

async function readLegacyData(): Promise<AppStorageData> {
  return (await readJsonFile(getLegacyStorageFilePath(), normalizeLegacyData)) ?? getDefaultLegacyData()
}

export async function readLegacyTodos(): Promise<StoredTodoItem[]> {
  return (await readLegacyData()).todos
}

export async function readLegacyNotes(): Promise<StoredNotesData> {
  const legacy = await readLegacyData()
  return {
    notes: legacy.notes,
    selectedNoteId: legacy.selectedNoteId,
  }
}

export async function readLegacyCanvas(): Promise<StoredCanvasData> {
  const legacy = await readLegacyData()
  return normalizeCanvasFromBoards(legacy.canvasBoards, legacy.selectedCanvasBoardId)
}
