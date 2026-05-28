import { enqueueWrite, readJsonFile, writeJsonFile, writeJsonFileSync } from './json-file'
import { readLegacyNotes } from './legacy-store'
import { normalizeNotesData } from './normalize'
import { getNotesFilePath } from './paths'
import type { StoredNotesData } from './types'

async function readNotesData(): Promise<StoredNotesData> {
  const notes = await readJsonFile(getNotesFilePath(), normalizeNotesData)
  if (notes !== null) {
    return notes
  }

  return readLegacyNotes()
}

export async function loadNotes(): Promise<StoredNotesData> {
  return readNotesData()
}

export async function saveNotes(input: StoredNotesData): Promise<void> {
  return enqueueWrite(async () => {
    await writeJsonFile(getNotesFilePath(), normalizeNotesData(input))
  })
}

export function saveNotesSync(input: StoredNotesData): void {
  writeJsonFileSync(getNotesFilePath(), normalizeNotesData(input))
}
