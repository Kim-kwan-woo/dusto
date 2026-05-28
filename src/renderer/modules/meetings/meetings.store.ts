import { create } from 'zustand'
import type {
  DeleteMeetingResult,
  MeetingRecord,
  MeetingSummaryResult,
  MeetingTranscriptionResult,
  MeetingTranscriptionStatus,
  MicrophonePermissionStatus,
} from '@preload/api'

type TranscriptionState = 'idle' | 'queued' | 'transcribing' | 'saving' | 'completed' | 'error' | 'unavailable'
type SummaryState = 'idle' | 'queued' | 'summarizing' | 'completed' | 'error' | 'unavailable'

interface TranscriptionSnapshot {
  status: TranscriptionState
  progress: number | null
  message: string | null
  error: string | null
}

interface SummarySnapshot {
  status: SummaryState
  message: string | null
  error: string | null
}

interface MeetingsState {
  meetings: MeetingRecord[]
  selectedMeetingId: string | null
  hydrated: boolean
  permissionStatus: MicrophonePermissionStatus
  audioUrls: Record<string, string>
  transcriptionByMeetingId: Record<string, TranscriptionSnapshot>
  summaryByMeetingId: Record<string, SummarySnapshot>
  hydrate: () => Promise<void>
  refreshPermissionStatus: () => Promise<MicrophonePermissionStatus>
  requestPermission: () => Promise<MicrophonePermissionStatus>
  saveRecording: (request: {
    title: string
    durationMs: number
    mimeType: string
    audioData: ArrayBuffer
  }) => Promise<MeetingRecord>
  loadAudioUrl: (meetingId: string) => Promise<string | null>
  transcribeMeeting: (meetingId: string) => Promise<void>
  summarizeMeeting: (meetingId: string) => Promise<void>
  deleteMeeting: (meetingId: string) => Promise<DeleteMeetingResult>
  select: (meetingId: string) => void
}

let hydrationPromise: Promise<void> | null = null

function resolveSelectedMeetingId(
  meetings: MeetingRecord[],
  selectedMeetingId: string | null
): string | null {
  if (selectedMeetingId && meetings.some((meeting) => meeting.id === selectedMeetingId)) {
    return selectedMeetingId
  }

  return meetings[0]?.id ?? null
}

function getInitialTranscriptionSnapshot(): TranscriptionSnapshot {
  return {
    status: 'idle',
    progress: null,
    message: null,
    error: null,
  }
}

function getInitialSummarySnapshot(): SummarySnapshot {
  return {
    status: 'idle',
    message: null,
    error: null,
  }
}

function getMeetingTranscriptionSnapshot(meeting: MeetingRecord): TranscriptionSnapshot {
  if (meeting.transcript) {
    return {
      status: 'completed',
      progress: 100,
      message: 'Transcript is available.',
      error: null,
    }
  }

  if (meeting.status === 'transcribing') {
    return {
      status: 'transcribing',
      progress: null,
      message: 'Transcribing locally...',
      error: null,
    }
  }

  if (meeting.status === 'transcript_error') {
    return {
      status: 'error',
      progress: null,
      message: 'Transcription could not be completed.',
      error: meeting.transcriptError,
    }
  }

  return getInitialTranscriptionSnapshot()
}

function getMeetingSummarySnapshot(meeting: MeetingRecord): SummarySnapshot {
  if (meeting.summary) {
    return {
      status: 'completed',
      message: 'Summary is available.',
      error: null,
    }
  }

  if (meeting.status === 'summary_pending') {
    return {
      status: 'queued',
      message: 'Summary is waiting for the local AI runtime.',
      error: null,
    }
  }

  return getInitialSummarySnapshot()
}

function getUnavailableSnapshot(status: MeetingTranscriptionStatus): TranscriptionSnapshot {
  return {
    status: 'unavailable',
    progress: null,
    message: status.reason,
    error: status.reason,
  }
}

function getUnavailableSummarySnapshot(status: MeetingSummaryResult['status']): SummarySnapshot {
  return {
    status: 'unavailable',
    message: status.reason,
    error: status.reason,
  }
}

const useMeetingsStore = create<MeetingsState>()((set, get) => ({
  meetings: [],
  selectedMeetingId: null,
  hydrated: false,
  permissionStatus: 'unknown',
  audioUrls: {},
  transcriptionByMeetingId: {},
  summaryByMeetingId: {},

  async hydrate() {
    if (get().hydrated) return
    if (hydrationPromise) return hydrationPromise

    hydrationPromise = (async () => {
      const [permissionStatus, stored] = await Promise.all([
        window.api.meetings.getMicrophonePermissionStatus(),
        window.api.meetings.loadMeetings(),
      ])

      set({
        meetings: stored.meetings,
        selectedMeetingId: resolveSelectedMeetingId(
          stored.meetings,
          stored.selectedMeetingId
        ),
        permissionStatus,
        hydrated: true,
        transcriptionByMeetingId: stored.meetings.reduce<Record<string, TranscriptionSnapshot>>(
          (accumulator, meeting) => {
            accumulator[meeting.id] = getMeetingTranscriptionSnapshot(meeting)
            return accumulator
          },
          {}
        ),
        summaryByMeetingId: stored.meetings.reduce<Record<string, SummarySnapshot>>(
          (accumulator, meeting) => {
            accumulator[meeting.id] = getMeetingSummarySnapshot(meeting)
            return accumulator
          },
          {}
        ),
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

  async refreshPermissionStatus() {
    const permissionStatus = await window.api.meetings.getMicrophonePermissionStatus()
    set({ permissionStatus })
    return permissionStatus
  },

  async requestPermission() {
    const permissionStatus = await window.api.meetings.requestMicrophonePermission()
    set({ permissionStatus })
    return permissionStatus
  },

  async saveRecording(request) {
    const result = await window.api.meetings.saveRecording(request)
    set((state) => ({
      meetings: [
        result.meeting,
        ...state.meetings.filter((meeting) => meeting.id !== result.meeting.id),
      ],
      selectedMeetingId: result.meeting.id,
      hydrated: true,
      transcriptionByMeetingId: {
        ...state.transcriptionByMeetingId,
        [result.meeting.id]: getMeetingTranscriptionSnapshot(result.meeting),
      },
      summaryByMeetingId: {
        ...state.summaryByMeetingId,
        [result.meeting.id]: getMeetingSummarySnapshot(result.meeting),
      },
    }))

    return result.meeting
  },

  async loadAudioUrl(meetingId) {
    const cached = get().audioUrls[meetingId]
    if (cached) {
      return cached
    }

    const result = await window.api.meetings.getAudioDataUrl(meetingId)
    if (!result.success || !result.dataUrl) {
      return null
    }

    set((state) => ({
      audioUrls: {
        ...state.audioUrls,
        [meetingId]: result.dataUrl ?? '',
      },
    }))

    return result.dataUrl
  },

  async transcribeMeeting(meetingId) {
    const meeting = get().meetings.find((item) => item.id === meetingId)
    if (!meeting) {
      return
    }

    set((state) => ({
      transcriptionByMeetingId: {
        ...state.transcriptionByMeetingId,
        [meetingId]: {
          status: 'queued',
          progress: 0,
          message: 'Transcription request sent to the local runtime.',
          error: null,
        },
      },
    }))

    try {
      set((state) => ({
        transcriptionByMeetingId: {
          ...state.transcriptionByMeetingId,
          [meetingId]: {
            status: 'transcribing',
            progress: 0,
            message: 'Transcribing locally...',
            error: null,
          },
        },
      }))

      const result: MeetingTranscriptionResult = await window.api.meetings.transcribeRecording(
        meetingId
      )
      const updatedMeeting = result.meeting

      if (updatedMeeting) {
        set((state) => ({
          meetings: state.meetings.map((item) => (item.id === meetingId ? updatedMeeting : item)),
          transcriptionByMeetingId: {
            ...state.transcriptionByMeetingId,
            [meetingId]: result.success
              ? getMeetingTranscriptionSnapshot(updatedMeeting)
              : {
                  ...getMeetingTranscriptionSnapshot(updatedMeeting),
                  error: result.error ?? updatedMeeting.transcriptError,
                },
          },
          summaryByMeetingId: {
            ...state.summaryByMeetingId,
            [meetingId]: getMeetingSummarySnapshot(updatedMeeting),
          },
        }))
        return
      }

      set((state) => ({
        transcriptionByMeetingId: {
          ...state.transcriptionByMeetingId,
          [meetingId]: result.status.available
            ? {
                status: 'error',
                progress: null,
                message: 'Transcription finished without returning an updated meeting record.',
                error: result.error ?? 'No transcript result was returned.',
              }
            : getUnavailableSnapshot(result.status),
        },
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The local transcription request failed.'
      set((state) => ({
        transcriptionByMeetingId: {
          ...state.transcriptionByMeetingId,
          [meetingId]: {
            status: 'error',
            progress: null,
            message: 'Transcription could not be completed.',
            error: message,
          },
        },
      }))
    }
  },

  async summarizeMeeting(meetingId) {
    const meeting = get().meetings.find((item) => item.id === meetingId)
    if (!meeting) {
      return
    }

    if (!meeting.transcript?.trim()) {
      set((state) => ({
        summaryByMeetingId: {
          ...state.summaryByMeetingId,
          [meetingId]: {
            status: 'error',
            message: 'A transcript is required before Dusto can generate a summary.',
            error: 'This meeting does not have transcript text yet.',
          },
        },
      }))
      return
    }

    set((state) => ({
      summaryByMeetingId: {
        ...state.summaryByMeetingId,
        [meetingId]: {
          status: 'queued',
          message: 'Summary request sent to the local AI runtime.',
          error: null,
        },
      },
    }))

    try {
      set((state) => ({
        summaryByMeetingId: {
          ...state.summaryByMeetingId,
          [meetingId]: {
            status: 'summarizing',
            message: 'Summarizing locally...',
            error: null,
          },
        },
      }))

      const result = await window.api.meetings.summarizeMeeting(meetingId)
      const updatedMeeting = result.meeting

      if (updatedMeeting) {
        set((state) => ({
          meetings: state.meetings.map((item) => (item.id === meetingId ? updatedMeeting : item)),
          summaryByMeetingId: {
            ...state.summaryByMeetingId,
            [meetingId]: result.success
              ? getMeetingSummarySnapshot(updatedMeeting)
              : {
                  ...getMeetingSummarySnapshot(updatedMeeting),
                  error: result.error,
                },
          },
        }))
        return
      }

      set((state) => ({
        summaryByMeetingId: {
          ...state.summaryByMeetingId,
          [meetingId]: result.status.available
            ? {
                status: 'error',
                message: 'Summary generation finished without returning an updated meeting record.',
                error: result.error ?? 'No summary result was returned.',
              }
            : getUnavailableSummarySnapshot(result.status),
        },
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The local summary request failed.'
      set((state) => ({
        summaryByMeetingId: {
          ...state.summaryByMeetingId,
          [meetingId]: {
            status: 'error',
            message: 'Summary could not be completed.',
            error: message,
          },
        },
      }))
    }
  },

  async deleteMeeting(meetingId) {
    const result = await window.api.meetings.deleteMeeting(meetingId)

    if (!result.success) {
      return result
    }

    set((state) => {
      const nextAudioUrls = { ...state.audioUrls }
      const nextTranscriptionByMeetingId = { ...state.transcriptionByMeetingId }
      const nextSummaryByMeetingId = { ...state.summaryByMeetingId }

      delete nextAudioUrls[meetingId]
      delete nextTranscriptionByMeetingId[meetingId]
      delete nextSummaryByMeetingId[meetingId]

      return {
        meetings: result.meetings,
        selectedMeetingId: resolveSelectedMeetingId(result.meetings, result.selectedMeetingId),
        audioUrls: nextAudioUrls,
        transcriptionByMeetingId: nextTranscriptionByMeetingId,
        summaryByMeetingId: nextSummaryByMeetingId,
      }
    })

    return result
  },

  select(meetingId) {
    set((state) => {
      if (!state.meetings.some((meeting) => meeting.id === meetingId)) {
        return {}
      }

      return { selectedMeetingId: meetingId }
    })
  },
}))

export function hydrateMeetingsStore(): Promise<void> {
  return useMeetingsStore.getState().hydrate()
}

export function getSelectedMeeting(
  meetings: MeetingRecord[],
  selectedMeetingId: string | null
): MeetingRecord | null {
  if (!selectedMeetingId) {
    return null
  }

  return meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null
}

export default useMeetingsStore
