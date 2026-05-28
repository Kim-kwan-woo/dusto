import { mkdir, readFile, writeFile } from 'fs/promises'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'

let writeQueue = Promise.resolve()

export async function readJsonFile<T>(
  filePath: string,
  normalize: (value: unknown) => T
): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return normalize(JSON.parse(raw))
  } catch {
    return null
  }
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function writeJsonFileSync(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function enqueueWrite(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(task, task)
  return writeQueue
}
