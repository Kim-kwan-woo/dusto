import { create } from 'zustand'

export interface Note {
  id: string
  body: string
  createdAt: number
  updatedAt: number
}

interface NotesState {
  notes: Note[]
  selectedId: string | null
  hydrated: boolean

  hydrate: () => Promise<void>
  syncFromAssistant: (payload: { notes: Note[]; selectedId: string | null }) => void
  create: () => void
  update: (id: string, body: string) => void
  remove: (id: string) => void
  select: (id: string) => void
}

let hydrationPromise: Promise<void> | null = null
let backupTimer: number | null = null
let saveTimer: number | null = null
const BACKUP_DELAY_MS = 1500
const SAVE_DELAY_MS = 700

function writeNotesBackup(notes: Note[], selectedId: string | null): void {
  try {
    localStorage.setItem(
      'dusto-notes-storage',
      JSON.stringify({
        state: { notes, selectedId },
        version: 0
      })
    )
  } catch {
    // Ignore local backup failures and keep the file storage path as primary.
  }
}

function clearBackupTimer(): void {
  if (backupTimer !== null) {
    window.clearTimeout(backupTimer)
    backupTimer = null
  }
}

function clearSaveTimer(): void {
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer)
    saveTimer = null
  }
}

function resolveSelectedNoteId(notes: Note[], selectedId: string | null): string | null {
  if (!selectedId) {
    return notes[0]?.id ?? null
  }

  return notes.some((note) => note.id === selectedId) ? selectedId : (notes[0]?.id ?? null)
}

function readLegacyNotes(): { notes: Note[]; selectedId: string | null } {
  try {
    const raw = localStorage.getItem('dusto-notes-storage')
    if (!raw) {
      return { notes: [], selectedId: null }
    }

    const parsed = JSON.parse(raw) as {
      state?: { notes?: Note[]; selectedId?: string | null }
    }

    return {
      notes: Array.isArray(parsed.state?.notes) ? parsed.state.notes : [],
      selectedId: typeof parsed.state?.selectedId === 'string' ? parsed.state.selectedId : null
    }
  } catch {
    return { notes: [], selectedId: null }
  }
}

const useNotesStore = create<NotesState>()((set, get) => {
  function scheduleBackup(notes: Note[], selectedId: string | null): void {
    clearBackupTimer()
    backupTimer = window.setTimeout(() => {
      backupTimer = null
      writeNotesBackup(notes, selectedId)
    }, BACKUP_DELAY_MS)
  }

  function saveState(notes: Note[], selectedId: string | null): void {
    scheduleBackup(notes, selectedId)
    if (!get().hydrated) return
    void window.api.saveNotes({ notes, selectedNoteId: selectedId })
  }

  function scheduleNoteSave(notes: Note[], selectedId: string | null): void {
    scheduleBackup(notes, selectedId)
    if (!get().hydrated) return

    clearSaveTimer()
    saveTimer = window.setTimeout(() => {
      saveTimer = null
      void window.api.saveNotes({ notes, selectedNoteId: selectedId })
    }, SAVE_DELAY_MS)
  }

  return {
    notes: [],
    selectedId: null,
    hydrated: false,

    async hydrate() {
      if (get().hydrated) return
      if (hydrationPromise) return hydrationPromise

      hydrationPromise = (async () => {
        const stored = await window.api.loadNotes()
        const legacy = readLegacyNotes()
        const notes = stored.notes.length > 0 ? stored.notes : legacy.notes
        const selectedNoteId =
          stored.notes.length > 0 || stored.selectedNoteId !== null
            ? stored.selectedNoteId
            : legacy.selectedId
        const resolvedSelectedId = resolveSelectedNoteId(notes, selectedNoteId)

        if (stored.notes.length === 0 && notes.length > 0) {
          void window.api.saveNotes({
            notes,
            selectedNoteId: resolvedSelectedId
          })
        }

        set({
          notes,
          selectedId: resolvedSelectedId,
          hydrated: true
        })
      })()

      try {
        await hydrationPromise
      } catch {
        set({ hydrated: true })
      } finally {
        hydrationPromise = null
      }
    },

    syncFromAssistant(payload) {
      clearBackupTimer()
      clearSaveTimer()
      const selectedId = resolveSelectedNoteId(payload.notes, payload.selectedId)

      set({
        notes: payload.notes,
        selectedId,
        hydrated: true
      })

      writeNotesBackup(payload.notes, selectedId)
    },

    create() {
      const now = Date.now()
      const note: Note = {
        id: crypto.randomUUID(),
        body: '',
        createdAt: now,
        updatedAt: now
      }

      set((state) => {
        const notes = [note, ...state.notes]
        saveState(notes, note.id)
        return { notes, selectedId: note.id }
      })
    },

    update(id, body) {
      set((state) => {
        const notes = state.notes.map((n) =>
          n.id === id ? { ...n, body, updatedAt: Date.now() } : n
        )
        scheduleNoteSave(notes, state.selectedId)
        return { notes }
      })
    },

    remove(id) {
      set((state) => {
        const notes = state.notes.filter((n) => n.id !== id)
        const selectedId =
          state.selectedId === id ? (notes[0]?.id ?? null) : state.selectedId
        saveState(notes, selectedId)
        return { notes, selectedId }
      })
    },

    select(id) {
      set((state) => {
        if (state.selectedId === id || !state.notes.some((note) => note.id === id)) {
          return {}
        }

        saveState(state.notes, id)
        return { selectedId: id }
      })
    }
  }
})

export function hydrateNotesStore(): Promise<void> {
  return useNotesStore.getState().hydrate()
}

export function syncNotesStoreFromAssistant(payload: {
  notes: Note[]
  selectedId: string | null
}): void {
  useNotesStore.getState().syncFromAssistant(payload)
}

export function getSelectedNote(notes: Note[], selectedId: string | null): Note | null {
  if (!selectedId) {
    return null
  }

  return notes.find((note) => note.id === selectedId) ?? null
}

export function flushNotesStore(): void {
  const { notes, selectedId, hydrated } = useNotesStore.getState()
  clearBackupTimer()
  clearSaveTimer()
  writeNotesBackup(notes, selectedId)
  if (!hydrated) return
  window.api.flushNotes({ notes, selectedNoteId: selectedId })
}

export function getNoteTitle(body: string): string {
  const first = body.split('\n')[0].trim()
  return first || 'Untitled'
}

export default useNotesStore
