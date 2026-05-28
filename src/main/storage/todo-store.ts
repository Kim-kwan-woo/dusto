import { enqueueWrite, readJsonFile, writeJsonFile, writeJsonFileSync } from './json-file'
import { readLegacyTodos } from './legacy-store'
import { normalizeTodosData } from './normalize'
import { getTodosFilePath } from './paths'
import type { StoredTodoItem } from './types'

async function readTodosData(): Promise<StoredTodoItem[]> {
  const todos = await readJsonFile(getTodosFilePath(), normalizeTodosData)
  if (todos !== null) {
    return todos
  }

  return readLegacyTodos()
}

export async function loadTodos(): Promise<StoredTodoItem[]> {
  return readTodosData()
}

export async function saveTodos(todos: StoredTodoItem[]): Promise<void> {
  return enqueueWrite(async () => {
    await writeJsonFile(getTodosFilePath(), normalizeTodosData(todos))
  })
}

export function saveTodosSync(todos: StoredTodoItem[]): void {
  writeJsonFileSync(getTodosFilePath(), normalizeTodosData(todos))
}
