import type {
  AssistantRuntimeStatus,
  MeetingSummaryResult,
  MeetingSummarySections,
} from '@preload/api'
import { updateMeetingRecord, loadMeetings } from './storage'
import type { StoredMeetingRecord, StoredMeetingSummarySections } from './storage/types'
import {
  canManageRuntime,
  getAiProvider,
  getPreferredModel,
  getRuntimeStatus,
  isRuntimeManagedByApp,
} from './ai/runtime'
import type { AssistantRuntimeStatus as InternalAssistantRuntimeStatus } from './ai/types'

const activeSummaries = new Set<string>()

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
}

function normalizeSummarySections(value: unknown): MeetingSummarySections | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const summary = value as Record<string, unknown>
  if (typeof summary.conciseSummary !== 'string') {
    return null
  }

  return {
    conciseSummary: summary.conciseSummary.trim(),
    decisions: normalizeStringArray(summary.decisions),
    actionItems: normalizeStringArray(summary.actionItems),
    risksBlockers: normalizeStringArray(summary.risksBlockers),
    followUps: normalizeStringArray(summary.followUps),
  }
}

function extractJsonCandidate(text: string): string | null {
  const trimmed = text.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('{')) {
    return trimmed
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    const fencedContent = fencedMatch[1].trim()
    if (fencedContent.startsWith('{')) {
      return fencedContent
    }
  }

  const firstBraceIndex = trimmed.indexOf('{')
  const lastBraceIndex = trimmed.lastIndexOf('}')

  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return trimmed.slice(firstBraceIndex, lastBraceIndex + 1)
  }

  return null
}

function mapRuntimeStatus(status: InternalAssistantRuntimeStatus): AssistantRuntimeStatus {
  return {
    state: status.state,
    available: status.available,
    provider: 'local',
    model: status.model,
    selectedModel: status.selectedModel,
    availableModels: status.availableModels,
    issueCode: status.issueCode ?? null,
    reason: status.reason ?? null,
    canManage: canManageRuntime(),
    managedByApp: isRuntimeManagedByApp(),
  }
}

function buildSummaryMessage(meeting: StoredMeetingRecord): string {
  return [
    `Meeting title: ${meeting.title}`,
    '',
    'Transcript:',
    meeting.transcript ?? '',
  ].join('\n')
}

function buildSummarySystemPrompt(): string {
  return [
    'You are Dusto generating a local meeting summary from a saved transcript.',
    'Return strict JSON only, with no markdown fences, no commentary, and no extra keys.',
    'Use this exact shape:',
    '{"conciseSummary":"string","decisions":["string"],"actionItems":["string"],"risksBlockers":["string"],"followUps":["string"]}',
    'The conciseSummary should be 1-2 short sentences.',
    'Each array item should be a short, specific sentence fragment.',
    'If a section has nothing, use an empty array.',
    'Do not invent details that are not in the transcript.',
  ].join('\n')
}

function buildRenderedSummary(sections: MeetingSummarySections): string {
  const lines: string[] = []

  lines.push('Concise summary')
  lines.push(sections.conciseSummary)
  lines.push('')
  lines.push('Decisions')
  lines.push(...(sections.decisions.length > 0 ? sections.decisions.map((item) => `- ${item}`) : ['- None noted']))
  lines.push('')
  lines.push('Action items')
  lines.push(
    ...(sections.actionItems.length > 0
      ? sections.actionItems.map((item) => `- ${item}`)
      : ['- None noted'])
  )
  lines.push('')
  lines.push('Risks / blockers')
  lines.push(
    ...(sections.risksBlockers.length > 0
      ? sections.risksBlockers.map((item) => `- ${item}`)
      : ['- None noted'])
  )
  lines.push('')
  lines.push('Follow-ups')
  lines.push(
    ...(sections.followUps.length > 0 ? sections.followUps.map((item) => `- ${item}`) : ['- None noted'])
  )

  return lines.join('\n')
}

async function setMeetingSummaryPending(meetingId: string): Promise<StoredMeetingRecord | null> {
  return updateMeetingRecord(meetingId, (current) => ({
    ...current,
    status: 'summary_pending',
    updatedAt: Date.now(),
  }))
}

async function saveMeetingSummary(
  meetingId: string,
  summarySections: MeetingSummarySections
): Promise<StoredMeetingRecord | null> {
  const renderedSummary = buildRenderedSummary(summarySections)

  return updateMeetingRecord(meetingId, (current) => ({
    ...current,
    status: 'transcript_ready',
    updatedAt: Date.now(),
    summary: renderedSummary,
    summarySections: summarySections as StoredMeetingSummarySections,
  }))
}

async function clearMeetingSummaryPending(
  meetingId: string
): Promise<StoredMeetingRecord | null> {
  return updateMeetingRecord(meetingId, (current) => ({
    ...current,
    status: current.transcript ? 'transcript_ready' : current.status,
    updatedAt: Date.now(),
  }))
}

export async function summarizeMeetingTranscript(meetingId: string): Promise<MeetingSummaryResult> {
  if (activeSummaries.has(meetingId)) {
    const runtime = mapRuntimeStatus(await getRuntimeStatus())
    return {
      success: false,
      meeting: null,
      status: {
        ...runtime,
        state: 'busy',
        available: false,
        reason: 'This meeting is already being summarized.',
      },
      error: 'This meeting is already being summarized.',
      summarySections: null,
    }
  }

  const state = await loadMeetings()
  const meeting = state.meetings.find((item) => item.id === meetingId)

  if (!meeting) {
    const runtime = mapRuntimeStatus(await getRuntimeStatus())
    return {
      success: false,
      meeting: null,
      status: runtime,
      error: 'This meeting could not be found.',
      summarySections: null,
    }
  }

  if (!meeting.transcript?.trim()) {
    const runtime = mapRuntimeStatus(await getRuntimeStatus())
    return {
      success: false,
      meeting: null,
      status: runtime,
      error: 'This meeting does not have a saved transcript yet.',
      summarySections: null,
    }
  }

  const runtime = mapRuntimeStatus(await getRuntimeStatus(true))
  if (!runtime.available) {
    return {
      success: false,
      meeting: null,
      status: runtime,
      error: runtime.reason ?? 'The local runtime is not available.',
      summarySections: null,
    }
  }

  const selectedModel = runtime.model ?? runtime.selectedModel ?? getPreferredModel()
  if (!selectedModel) {
    return {
      success: false,
      meeting: null,
      status: {
        ...runtime,
        state: 'missing_model',
        available: false,
        selectedModel: runtime.selectedModel ?? null,
        reason: 'Choose a local model before generating a meeting summary.',
      },
      error: 'Choose a local model before generating a meeting summary.',
      summarySections: null,
    }
  }

  activeSummaries.add(meetingId)

  try {
    const pendingMeeting = await setMeetingSummaryPending(meetingId)
    if (!pendingMeeting) {
      throw new Error('The meeting could not be updated for summary generation.')
    }

    const provider = getAiProvider()
    const response = await provider.chat({
      model: selectedModel,
      systemPrompt: buildSummarySystemPrompt(),
      messages: [
        {
          id: `user:${Date.now()}:summary`,
          role: 'user',
          text: buildSummaryMessage(meeting),
          createdAt: Date.now(),
        },
      ],
      tools: [],
    })

    const candidate = extractJsonCandidate(response.text)
    if (!candidate) {
      throw new Error('The local model returned an unexpected summary response.')
    }

    const parsed = normalizeSummarySections(JSON.parse(candidate))
    if (!parsed) {
      throw new Error('The local model returned an invalid summary response.')
    }

    const updatedMeeting = await saveMeetingSummary(meetingId, parsed)
    if (!updatedMeeting) {
      throw new Error('The meeting summary could not be saved.')
    }

    return {
      success: true,
      meeting: updatedMeeting,
      status: runtime,
      error: null,
      summarySections: parsed,
    }
  } catch (error) {
    await clearMeetingSummaryPending(meetingId)

    const message =
      error instanceof Error ? error.message : 'Local summary generation failed unexpectedly.'

    return {
      success: false,
      meeting: null,
      status: runtime,
      error: message,
      summarySections: null,
    }
  } finally {
    activeSummaries.delete(meetingId)
  }
}
