import { enqueueWrite, readJsonFile, writeJsonFile } from './json-file'
import { normalizeMeetingsData } from './normalize'
import { getMeetingsFilePath } from './paths'
import type { StoredMeetingRecord, StoredMeetingsData } from './types'

function resolveSelectedMeetingId(
  meetings: StoredMeetingRecord[],
  selectedMeetingId: string | null
): string | null {
  if (selectedMeetingId && meetings.some((meeting) => meeting.id === selectedMeetingId)) {
    return selectedMeetingId
  }

  return meetings[0]?.id ?? null
}

export async function loadMeetings(): Promise<StoredMeetingsData> {
  const meetings = await readJsonFile(getMeetingsFilePath(), normalizeMeetingsData)
  return meetings ?? { meetings: [], selectedMeetingId: null }
}

export async function addMeetingRecord(meeting: StoredMeetingRecord): Promise<StoredMeetingsData> {
  return enqueueWrite(async () => {
    const current = await loadMeetings()
    const meetings = [meeting, ...current.meetings.filter((item) => item.id !== meeting.id)]
    const next: StoredMeetingsData = {
      meetings,
      selectedMeetingId: meeting.id,
    }

    await writeJsonFile(getMeetingsFilePath(), next)
  }).then(loadMeetings)
}

export async function updateMeetingRecord(
  meetingId: string,
  update: (meeting: StoredMeetingRecord) => StoredMeetingRecord
): Promise<StoredMeetingRecord | null> {
  let updatedMeeting: StoredMeetingRecord | null = null

  await enqueueWrite(async () => {
    const current = await loadMeetings()
    const meetings = current.meetings.map((meeting) => {
      if (meeting.id !== meetingId) {
        return meeting
      }

      updatedMeeting = update(meeting)
      return updatedMeeting
    })

    await writeJsonFile(getMeetingsFilePath(), {
      meetings,
      selectedMeetingId: resolveSelectedMeetingId(meetings, current.selectedMeetingId),
    })
  })

  return updatedMeeting
}

export async function deleteMeetingRecord(meetingId: string): Promise<StoredMeetingRecord | null> {
  let deletedMeeting: StoredMeetingRecord | null = null

  await enqueueWrite(async () => {
    const current = await loadMeetings()
    const meetings = current.meetings.filter((meeting) => {
      if (meeting.id !== meetingId) {
        return true
      }

      deletedMeeting = meeting
      return false
    })

    await writeJsonFile(getMeetingsFilePath(), {
      meetings,
      selectedMeetingId: resolveSelectedMeetingId(meetings, current.selectedMeetingId),
    })
  })

  return deletedMeeting
}

export async function saveMeetings(input: StoredMeetingsData): Promise<void> {
  return enqueueWrite(async () => {
    const selectedMeetingId = resolveSelectedMeetingId(input.meetings, input.selectedMeetingId)
    await writeJsonFile(getMeetingsFilePath(), {
      meetings: input.meetings,
      selectedMeetingId,
    })
  })
}
