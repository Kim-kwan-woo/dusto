import { app } from 'electron'
import { join } from 'path'

function getStorageDirectoryPath(): string {
  return join(app.getPath('userData'), 'storage')
}

export function getLegacyStorageFilePath(): string {
  return join(getStorageDirectoryPath(), 'app-data.json')
}

export function getTodosFilePath(): string {
  return join(getStorageDirectoryPath(), 'todos.json')
}

export function getNotesFilePath(): string {
  return join(getStorageDirectoryPath(), 'notes.json')
}

export function getCanvasFilePath(): string {
  return join(getStorageDirectoryPath(), 'canvas.json')
}

export function getMeetingsFilePath(): string {
  return join(getStorageDirectoryPath(), 'meetings.json')
}

export function getMeetingAudioDirectoryPath(): string {
  return join(getStorageDirectoryPath(), 'meeting-audio')
}
