import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { ipcMain, systemPreferences } from 'electron'
import {
  MEETINGS_IPC_CHANNELS,
  type DeleteMeetingResult,
  type MeetingAudioDataUrlResult,
  type MeetingTranscriptionResult,
  type MeetingTranscriptionStatus,
  type MicrophonePermissionStatus,
  type SaveMeetingRecordingRequest,
  type SaveMeetingRecordingResult,
} from '@preload/api'
import { addMeetingRecord, deleteMeetingRecord, loadMeetings, updateMeetingRecord } from './storage'
import { getMeetingAudioDirectoryPath } from './storage/paths'
import { getMeetingTranscriptionStatus, transcribeMeetingAudio } from './stt'
import type { StoredMeetingRecord } from './storage/types'
import { summarizeMeetingTranscript } from './meeting-summary'

const activeTranscriptions = new Set<string>()

function normalizePermissionStatus(status: string): MicrophonePermissionStatus {
  if (
    status === 'not-determined' ||
    status === 'granted' ||
    status === 'denied' ||
    status === 'restricted' ||
    status === 'unknown'
  ) {
    return status
  }

  return 'unknown'
}

function getMicrophonePermissionStatus(): MicrophonePermissionStatus {
  if (process.platform !== 'darwin') {
    return 'granted'
  }

  return normalizePermissionStatus(systemPreferences.getMediaAccessStatus('microphone'))
}

async function requestMicrophonePermission(): Promise<MicrophonePermissionStatus> {
  if (process.platform !== 'darwin') {
    return 'granted'
  }

  const granted = await systemPreferences.askForMediaAccess('microphone')
  return granted ? 'granted' : getMicrophonePermissionStatus()
}

function getAudioExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

function buildMeetingTitle(title: string, createdAt: number): string {
  const trimmed = title.trim()
  if (trimmed) {
    return trimmed
  }

  return `Meeting ${new Date(createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

async function saveMeetingRecording(
  request: SaveMeetingRecordingRequest
): Promise<SaveMeetingRecordingResult> {
  const now = Date.now()
  const id = crypto.randomUUID()
  const extension = getAudioExtension(request.mimeType)
  const fileName = `${id}.${extension}`
  const audioDirectory = getMeetingAudioDirectoryPath()
  const audioBuffer = Buffer.from(new Uint8Array(request.audioData))

  await mkdir(audioDirectory, { recursive: true })
  await writeFile(join(audioDirectory, fileName), audioBuffer)

  const meeting: StoredMeetingRecord = {
    id,
    title: buildMeetingTitle(request.title, now),
    createdAt: now,
    updatedAt: now,
    durationMs: Math.max(0, Math.round(request.durationMs)),
    status: 'recorded',
    audio: {
      fileName,
      mimeType: request.mimeType || 'audio/webm',
      byteLength: audioBuffer.byteLength,
    },
    transcript: null,
    transcriptError: null,
    summary: null,
    summarySections: null,
  }

  await addMeetingRecord(meeting)

  return {
    success: true,
    meeting,
  }
}

async function getMeetingAudioDataUrl(meetingId: string): Promise<MeetingAudioDataUrlResult> {
  const state = await loadMeetings()
  const meeting = state.meetings.find((item) => item.id === meetingId)
  if (!meeting?.audio) {
    return { success: false, dataUrl: null }
  }

  const filePath = join(getMeetingAudioDirectoryPath(), meeting.audio.fileName)
  try {
    const audio = await readFile(filePath)
    return {
      success: true,
      dataUrl: `data:${meeting.audio.mimeType};base64,${audio.toString('base64')}`,
    }
  } catch {
    return { success: false, dataUrl: null }
  }
}

function getTranscriptionStatus(): MeetingTranscriptionStatus {
  return getMeetingTranscriptionStatus(activeTranscriptions.size > 0)
}

async function markMeetingTranscribing(
  meeting: StoredMeetingRecord
): Promise<StoredMeetingRecord | null> {
  return updateMeetingRecord(meeting.id, (current) => ({
    ...current,
    status: 'transcribing',
    updatedAt: Date.now(),
    transcriptError: null,
  }))
}

async function saveMeetingTranscript(
  meetingId: string,
  transcript: string
): Promise<StoredMeetingRecord | null> {
  return updateMeetingRecord(meetingId, (current) => ({
    ...current,
    status: 'transcript_ready',
    updatedAt: Date.now(),
    transcript,
    transcriptError: null,
  }))
}

async function saveMeetingTranscriptError(
  meetingId: string,
  error: string
): Promise<StoredMeetingRecord | null> {
  return updateMeetingRecord(meetingId, (current) => ({
    ...current,
    status: 'transcript_error',
    updatedAt: Date.now(),
    transcriptError: error,
  }))
}

async function transcribeMeetingRecording(meetingId: string): Promise<MeetingTranscriptionResult> {
  if (activeTranscriptions.has(meetingId)) {
    return {
      success: false,
      meeting: null,
      status: getMeetingTranscriptionStatus(true),
      error: 'This meeting is already being transcribed.',
    }
  }

  const availability = getMeetingTranscriptionStatus(activeTranscriptions.size > 0)
  if (!availability.available) {
    return {
      success: false,
      meeting: null,
      status: availability,
      error: availability.reason,
    }
  }

  const state = await loadMeetings()
  const meeting = state.meetings.find((item) => item.id === meetingId)
  if (!meeting?.audio) {
    return {
      success: false,
      meeting: null,
      status: availability,
      error: 'This meeting does not have a saved audio recording.',
    }
  }

  activeTranscriptions.add(meetingId)
  await markMeetingTranscribing(meeting)

  try {
    const transcript = await transcribeMeetingAudio(
      join(getMeetingAudioDirectoryPath(), meeting.audio.fileName)
    )
    const updatedMeeting = await saveMeetingTranscript(meetingId, transcript)
    activeTranscriptions.delete(meetingId)

    return {
      success: true,
      meeting: updatedMeeting,
      status: getMeetingTranscriptionStatus(false),
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Local transcription failed.'
    const updatedMeeting = await saveMeetingTranscriptError(meetingId, message)
    activeTranscriptions.delete(meetingId)

    return {
      success: false,
      meeting: updatedMeeting,
      status: getMeetingTranscriptionStatus(false),
      error: message,
    }
  }
}

async function deleteMeeting(meetingId: string): Promise<DeleteMeetingResult> {
  const deletedMeeting = await deleteMeetingRecord(meetingId)
  if (!deletedMeeting) {
    const state = await loadMeetings()
    return {
      success: false,
      meetings: state.meetings,
      selectedMeetingId: state.selectedMeetingId,
      deletedMeetingId: null,
      audioDeleted: false,
      error: 'This meeting could not be found.',
    }
  }

  let audioDeleted = false
  if (deletedMeeting.audio) {
    try {
      await rm(join(getMeetingAudioDirectoryPath(), deletedMeeting.audio.fileName), {
        force: true,
      })
      audioDeleted = true
    } catch {
      audioDeleted = false
    }
  }

  const state = await loadMeetings()
  return {
    success: true,
    meetings: state.meetings,
    selectedMeetingId: state.selectedMeetingId,
    deletedMeetingId: deletedMeeting.id,
    audioDeleted,
    error: null,
  }
}

export function registerMeetingsIpc(): void {
  ipcMain.handle(MEETINGS_IPC_CHANNELS.getMicrophonePermissionStatus, () => {
    return getMicrophonePermissionStatus()
  })

  ipcMain.handle(MEETINGS_IPC_CHANNELS.requestMicrophonePermission, async () => {
    return requestMicrophonePermission()
  })

  ipcMain.handle(MEETINGS_IPC_CHANNELS.loadMeetings, async () => {
    return loadMeetings()
  })

  ipcMain.handle(MEETINGS_IPC_CHANNELS.saveRecording, async (_event, request) => {
    return saveMeetingRecording(request)
  })

  ipcMain.handle(MEETINGS_IPC_CHANNELS.getAudioDataUrl, async (_event, meetingId) => {
    return getMeetingAudioDataUrl(meetingId)
  })

  ipcMain.handle(MEETINGS_IPC_CHANNELS.getTranscriptionStatus, () => {
    return getTranscriptionStatus()
  })

  ipcMain.handle(MEETINGS_IPC_CHANNELS.transcribeRecording, async (_event, meetingId) => {
    return transcribeMeetingRecording(meetingId)
  })

  ipcMain.handle(MEETINGS_IPC_CHANNELS.summarizeMeeting, async (_event, meetingId) => {
    return summarizeMeetingTranscript(meetingId)
  })

  ipcMain.handle(MEETINGS_IPC_CHANNELS.deleteMeeting, async (_event, meetingId) => {
    return deleteMeeting(meetingId)
  })
}
