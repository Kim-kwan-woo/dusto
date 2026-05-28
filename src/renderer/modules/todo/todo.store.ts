import { create } from 'zustand'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

interface TodoState {
  items: TodoItem[]
  hydrated: boolean
  hydrate: () => Promise<void>
  syncFromAssistant: (items: TodoItem[]) => void
  add: (text: string) => void
  toggle: (id: string) => void
  remove: (id: string) => void
}

let hydrationPromise: Promise<void> | null = null
let backupTimer: number | null = null
const BACKUP_DELAY_MS = 1500

function writeTodoBackup(items: TodoItem[]): void {
  try {
    localStorage.setItem(
      'dusto-todo-storage',
      JSON.stringify({
        state: { items },
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

function readLegacyTodoItems(): TodoItem[] {
  try {
    const raw = localStorage.getItem('dusto-todo-storage')
    if (!raw) return []

    const parsed = JSON.parse(raw) as {
      state?: { items?: TodoItem[] }
    }

    return Array.isArray(parsed.state?.items) ? parsed.state.items : []
  } catch {
    return []
  }
}

const useTodoStore = create<TodoState>()((set, get) => {
  function scheduleBackup(items: TodoItem[]): void {
    clearBackupTimer()
    backupTimer = window.setTimeout(() => {
      backupTimer = null
      writeTodoBackup(items)
    }, BACKUP_DELAY_MS)
  }

  function saveItems(items: TodoItem[]): void {
    scheduleBackup(items)
    if (!get().hydrated) return
    void window.api.saveTodos(items)
  }

  return {
    items: [],
    hydrated: false,

    async hydrate() {
      if (get().hydrated) return
      if (hydrationPromise) return hydrationPromise

      hydrationPromise = (async () => {
        const storedItems = await window.api.loadTodos()
        const items = storedItems.length > 0 ? storedItems : readLegacyTodoItems()

        if (storedItems.length === 0 && items.length > 0) {
          void window.api.saveTodos(items)
        }

        set({ items, hydrated: true })
      })()

      try {
        await hydrationPromise
      } catch {
        set({ hydrated: true })
      } finally {
        hydrationPromise = null
      }
    },

    syncFromAssistant(items) {
      clearBackupTimer()
      set({
        items,
        hydrated: true
      })
      writeTodoBackup(items)
    },

    add(text) {
      const trimmed = text.trim()
      if (!trimmed) return

      set((state) => {
        const items = [
          ...state.items,
          { id: crypto.randomUUID(), text: trimmed, done: false, createdAt: Date.now() }
        ]
        saveItems(items)
        return { items }
      })
    },

    toggle(id) {
      set((state) => {
        const items = state.items.map((item) =>
          item.id === id ? { ...item, done: !item.done } : item
        )
        saveItems(items)
        return { items }
      })
    },

    remove(id) {
      set((state) => {
        const items = state.items.filter((item) => item.id !== id)
        saveItems(items)
        return { items }
      })
    }
  }
})

export function hydrateTodoStore(): Promise<void> {
  return useTodoStore.getState().hydrate()
}

export function syncTodoStoreFromAssistant(items: TodoItem[]): void {
  useTodoStore.getState().syncFromAssistant(items)
}

export function getPendingTodoItems(items: TodoItem[]): TodoItem[] {
  return items.filter((item) => !item.done)
}

export function getCompletedTodoItems(items: TodoItem[]): TodoItem[] {
  return items.filter((item) => item.done)
}

export function flushTodoStore(): void {
  const { items, hydrated } = useTodoStore.getState()
  clearBackupTimer()
  writeTodoBackup(items)
  if (!hydrated) return
  window.api.flushTodos(items)
}

export default useTodoStore
