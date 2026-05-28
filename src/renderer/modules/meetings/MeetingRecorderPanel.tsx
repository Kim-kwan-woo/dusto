import React, { useEffect, useRef, useState } from 'react'
import type {
  MeetingRecord,
  MeetingSummarySections,
  MicrophonePermissionStatus,
} from '@preload/api'
import DustoCharacter from '../../components/DustoCharacter'
import useMeetingsStore, {
  getSelectedMeeting,
  hydrateMeetingsStore,
} from './meetings.store'

const SF_TEXT = "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

type RecordingState = 'idle' | 'recording' | 'saving'

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getPermissionCopy(status: MicrophonePermissionStatus): string {
  if (status === 'granted') return 'Microphone ready'
  if (status === 'not-determined') return 'Microphone permission needed'
  if (status === 'denied') return 'Microphone access denied'
  if (status === 'restricted') return 'Microphone access restricted'
  return 'Microphone status unknown'
}

function MeetingList({
  meetings,
  selectedMeetingId,
  hydrated,
  onSelect,
}: {
  meetings: MeetingRecord[]
  selectedMeetingId: string | null
  hydrated: boolean
  onSelect: (meetingId: string) => void
}): React.JSX.Element {
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {hydrated && meetings.length === 0 ? (
        <li
          className="px-4 py-6 text-center text-[13px] tracking-[-0.224px]"
          style={{ color: 'rgba(0,0,0,0.32)', fontFamily: SF_TEXT }}
        >
          No meeting records yet.
        </li>
      ) : null}
      {meetings.map((meeting) => {
        const isActive = meeting.id === selectedMeetingId
        return (
          <li key={meeting.id}>
            <button
              type="button"
              onClick={() => onSelect(meeting.id)}
              className={[
                'w-full px-4 py-3 text-left transition-colors duration-100',
                isActive ? 'bg-[#0071e3]' : 'bg-transparent hover:bg-[#f5f5f7]',
              ].join(' ')}
            >
              <p
                className="truncate text-[13px] font-medium tracking-[-0.224px]"
                style={{ color: isActive ? '#ffffff' : '#1d1d1f', fontFamily: SF_TEXT }}
              >
                {meeting.title}
              </p>
              <p
                className="mt-0.5 text-[11px] tracking-[-0.12px]"
                style={{
                  color: isActive ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.4)',
                  fontFamily: SF_TEXT,
                }}
              >
                {formatDate(meeting.createdAt)} · {formatDuration(meeting.durationMs)}
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function RecordingControls(): React.JSX.Element {
  const permissionStatus = useMeetingsStore((state) => state.permissionStatus)
  const requestPermission = useMeetingsStore((state) => state.requestPermission)
  const refreshPermissionStatus = useMeetingsStore((state) => state.refreshPermissionStatus)
  const saveRecording = useMeetingsStore((state) => state.saveRecording)
  const [title, setTitle] = useState('')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number>(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function stopTimer(): void {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  async function handlePermissionRequest(): Promise<void> {
    setError(null)
    await requestPermission()
  }

  async function startRecording(): Promise<void> {
    setError(null)

    let status = permissionStatus
    if (status !== 'granted') {
      status = await requestPermission()
    } else {
      status = await refreshPermissionStatus()
    }

    if (status !== 'granted') {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      streamRef.current = stream
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      })

      recorder.addEventListener('stop', () => {
        void persistRecording(recorder.mimeType)
      })

      recorder.start()
      setElapsedMs(0)
      setRecordingState('recording')
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current)
      }, 250)
    } catch {
      setError('Dusto could not start the microphone recorder.')
      setRecordingState('idle')
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      void refreshPermissionStatus()
    }
  }

  function stopRecording(): void {
    if (mediaRecorderRef.current?.state === 'recording') {
      setRecordingState('saving')
      stopTimer()
      setElapsedMs(Date.now() - startedAtRef.current)
      mediaRecorderRef.current.stop()
    }
  }

  async function persistRecording(mimeType: string): Promise<void> {
    try {
      const durationMs = Date.now() - startedAtRef.current
      const audioBlob = new Blob(chunksRef.current, {
        type: mimeType || chunksRef.current[0]?.type || 'audio/webm',
      })
      const audioData = await audioBlob.arrayBuffer()

      await saveRecording({
        title,
        durationMs,
        mimeType: audioBlob.type || 'audio/webm',
        audioData,
      })

      setTitle('')
      setError(null)
    } catch {
      setError('Dusto could not save this recording.')
    } finally {
      chunksRef.current = []
      mediaRecorderRef.current = null
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setRecordingState('idle')
      setElapsedMs(0)
    }
  }

  const isBusy = recordingState !== 'idle'
  const canRecord = permissionStatus === 'granted' && !isBusy

  return (
    <div className="border-b border-black/[0.06] px-5 py-4">
      <div className="rounded-[8px] bg-[#f5f5f7] p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-[13px] font-semibold tracking-[-0.224px] text-[#1d1d1f]"
              style={{ fontFamily: SF_TEXT }}
            >
              {getPermissionCopy(permissionStatus)}
            </p>
            <p
              className="mt-1 text-[12px] leading-[1.35] tracking-[-0.12px]"
              style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
            >
              Recordings stay local and only capture your microphone.
            </p>
          </div>

          {permissionStatus !== 'granted' ? (
            <button
              type="button"
              onClick={() => void handlePermissionRequest()}
              className="h-[32px] shrink-0 rounded-[8px] bg-[#0071e3] px-3 text-[13px] tracking-[-0.224px] text-white transition-colors duration-100 hover:bg-[#0077ed]"
              style={{ fontFamily: SF_TEXT }}
            >
              Allow Mic
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isBusy}
            placeholder="Meeting title"
            className="h-[38px] min-w-0 flex-1 rounded-[11px] border-[3px] border-black/[0.04] bg-[#fafafc] px-3 text-[13px] tracking-[-0.224px] text-[#1d1d1f] outline-none transition-colors duration-100 placeholder:text-[rgba(0,0,0,0.32)] focus:border-[#0071e3] disabled:opacity-50"
            style={{ fontFamily: SF_TEXT }}
          />

          {recordingState === 'recording' ? (
            <button
              type="button"
              onClick={stopRecording}
              className="h-[38px] rounded-[8px] bg-[#1d1d1f] px-4 text-[13px] tracking-[-0.224px] text-white transition-colors duration-100 hover:bg-black"
              style={{ fontFamily: SF_TEXT }}
            >
              Stop {formatDuration(elapsedMs)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={!canRecord}
              className="h-[38px] rounded-[8px] bg-[#0071e3] px-4 text-[13px] tracking-[-0.224px] text-white transition-colors duration-100 hover:bg-[#0077ed] disabled:opacity-40"
              style={{ fontFamily: SF_TEXT }}
            >
              {isBusy ? 'Saving' : 'Record'}
            </button>
          )}
        </div>

        {error ? (
          <p
            className="mt-3 text-[12px] tracking-[-0.12px]"
            style={{ color: '#b42318', fontFamily: SF_TEXT }}
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function getMeetingStatusLabel(meeting: MeetingRecord): string {
  if (meeting.summarySections || meeting.summary) {
    return 'Summary saved'
  }

  if (meeting.status === 'summary_pending') {
    return 'Summary pending'
  }

  if (meeting.transcript) {
    return 'Transcript saved'
  }

  if (meeting.status === 'transcript_pending') {
    return 'Transcript pending'
  }

  return 'Recorded'
}

function getTranscriptionStatusLabel(status: string | null | undefined): string {
  if (status === 'queued') return 'Queued'
  if (status === 'transcribing') return 'Transcribing'
  if (status === 'saving') return 'Saving'
  if (status === 'completed') return 'Done'
  if (status === 'error') return 'Needs attention'
  if (status === 'unavailable') return 'Unavailable'
  return 'Ready'
}

function getTranscriptionStatusTone(status: string | null | undefined): string {
  if (status === 'queued' || status === 'transcribing' || status === 'saving') {
    return 'bg-[#eef5ff] text-[#0066cc]'
  }

  if (status === 'completed') {
    return 'bg-[#edf9f0] text-[#1f7a3d]'
  }

  if (status === 'error' || status === 'unavailable') {
    return 'bg-[#fff5f4] text-[#b42318]'
  }

  return 'bg-black/[0.04] text-black/[0.56]'
}

function getTranscriptionCharacterVariant(status: string | null | undefined): 'detective' | 'cleaner' | 'shiny' | 'crying' | 'shy' {
  if (status === 'completed') return 'shiny'
  if (status === 'queued' || status === 'transcribing' || status === 'saving') return 'cleaner'
  if (status === 'error' || status === 'unavailable') return 'crying'
  return 'detective'
}

type SummarySectionKey = 'conciseSummary' | 'decisions' | 'actionItems' | 'risksBlockers' | 'followUps'

interface StructuredMeetingSummary {
  conciseSummary: string
  decisions: string[]
  actionItems: string[]
  risksBlockers: string[]
  followUps: string[]
}

function getEmptyStructuredMeetingSummary(): StructuredMeetingSummary {
  return {
    conciseSummary: '',
    decisions: [],
    actionItems: [],
    risksBlockers: [],
    followUps: [],
  }
}

function normalizeSummaryList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === 'string') {
      return value
        .split(/\r?\n+/)
        .map((line) => line.replace(/^\s*[-*•]\s*/, '').replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean)
    }

    return []
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
}

function normalizeSummaryText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function getSummarySectionFromHeading(line: string): SummarySectionKey | null {
  const normalized = line
    .replace(/^#{1,6}\s*/, '')
    .replace(/[:\-]\s*$/, '')
    .replace(/\s*\/\s*/g, '/')
    .trim()
    .toLowerCase()

  if (normalized === 'concise summary' || normalized === 'summary' || normalized === 'overview') {
    return 'conciseSummary'
  }

  if (normalized === 'decisions') {
    return 'decisions'
  }

  if (
    normalized === 'action items' ||
    normalized === 'actions' ||
    normalized === 'follow-up actions' ||
    normalized === 'next steps'
  ) {
    return 'actionItems'
  }

  if (
    normalized === 'risks/blockers' ||
    normalized === 'risks and blockers' ||
    normalized === 'risks' ||
    normalized === 'blockers'
  ) {
    return 'risksBlockers'
  }

  if (normalized === 'follow-ups' || normalized === 'follow ups' || normalized === 'follow up') {
    return 'followUps'
  }

  return null
}

function parseStructuredMeetingSummary(summary: string | null): StructuredMeetingSummary {
  const text = summary?.trim() ?? ''
  if (!text) {
    return getEmptyStructuredMeetingSummary()
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        conciseSummary: normalizeSummaryText(
          parsed.conciseSummary ?? parsed.summary ?? parsed.overview ?? parsed.highlights
        ),
        decisions: normalizeSummaryList(parsed.decisions ?? parsed.decision),
        actionItems: normalizeSummaryList(
          parsed.actionItems ?? parsed.actions ?? parsed.todos ?? parsed.nextSteps
        ),
        risksBlockers: normalizeSummaryList(
          parsed.risksBlockers ??
            parsed.risksAndBlockers ??
            parsed.blockers ??
            parsed.risks
        ),
        followUps: normalizeSummaryList(
          parsed.followUps ?? parsed.followUpItems ?? parsed.followUp ?? parsed.followup
        ),
      }
    }
  } catch {
    // Fall through to markdown/plain-text parsing.
  }

  const sections = {
    conciseSummary: [] as string[],
    decisions: [] as string[],
    actionItems: [] as string[],
    risksBlockers: [] as string[],
    followUps: [] as string[],
  }
  let currentSection: SummarySectionKey = 'conciseSummary'
  let sawExplicitHeading = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const heading = getSummarySectionFromHeading(line)
    if (heading) {
      currentSection = heading
      sawExplicitHeading = true
      continue
    }

    const cleanedLine = line.replace(/^\s*[-*•]\s*/, '').replace(/^\s*\d+[.)]\s*/, '')
    sections[currentSection].push(cleanedLine)
  }

  if (!sawExplicitHeading) {
    return {
      conciseSummary: text,
      decisions: [],
      actionItems: [],
      risksBlockers: [],
      followUps: [],
    }
  }

  return {
    conciseSummary: sections.conciseSummary.join('\n').trim(),
    decisions: sections.decisions,
    actionItems: sections.actionItems,
    risksBlockers: sections.risksBlockers,
    followUps: sections.followUps,
  }
}

function getStructuredMeetingSummary(
  summarySections: MeetingSummarySections | null,
  renderedSummary: string | null
): StructuredMeetingSummary {
  if (summarySections) {
    return {
      conciseSummary: summarySections.conciseSummary,
      decisions: summarySections.decisions,
      actionItems: summarySections.actionItems,
      risksBlockers: summarySections.risksBlockers,
      followUps: summarySections.followUps,
    }
  }

  return parseStructuredMeetingSummary(renderedSummary)
}

function getSummaryStatusLabel(status: string | null | undefined): string {
  if (status === 'queued' || status === 'summarizing') return 'Summarizing'
  if (status === 'completed') return 'Done'
  if (status === 'error') return 'Needs attention'
  if (status === 'unavailable') return 'Unavailable'
  return 'Ready'
}

function getSummaryStatusTone(status: string | null | undefined): string {
  if (status === 'queued' || status === 'summarizing') {
    return 'bg-[#eef5ff] text-[#0066cc]'
  }

  if (status === 'completed') {
    return 'bg-[#edf9f0] text-[#1f7a3d]'
  }

  if (status === 'error' || status === 'unavailable') {
    return 'bg-[#fff5f4] text-[#b42318]'
  }

  return 'bg-black/[0.04] text-black/[0.56]'
}

function getSummaryCharacterVariant(
  status: string | null | undefined
): 'detective' | 'cleaner' | 'shiny' | 'crying' | 'shy' {
  if (status === 'completed') return 'shiny'
  if (status === 'queued' || status === 'summarizing') return 'cleaner'
  if (status === 'error' || status === 'unavailable') return 'crying'
  return 'detective'
}

function SummarySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="border-t border-black/[0.06] px-4 py-3 first:border-t-0 first:pt-0">
      <h4
        className="text-[12px] font-semibold tracking-[-0.12px] text-[#1d1d1f]"
        style={{ fontFamily: SF_TEXT }}
      >
        {title}
      </h4>
      <div
        className="mt-1 text-[13px] leading-[1.55] tracking-[-0.224px] text-[#1d1d1f]"
        style={{ fontFamily: SF_TEXT }}
      >
        {children}
      </div>
    </section>
  )
}

function renderSummaryList(items: string[], emptyCopy: string): React.JSX.Element {
  if (items.length === 0) {
    return <p style={{ color: 'rgba(0,0,0,0.48)' }}>{emptyCopy}</p>
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0071e3]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function SummaryPanel({
  meeting,
  summary,
  onSummarize,
}: {
  meeting: MeetingRecord
  summary: {
    status: string
    message: string | null
    error: string | null
  } | null
  onSummarize: () => void
}): React.JSX.Element {
  const transcriptText = meeting.transcript?.trim() ?? ''
  const summaryText = meeting.summary?.trim() ?? ''
  const hasTranscript = transcriptText.length > 0
  const hasSummary = summaryText.length > 0
  const status = summary?.status ?? (hasSummary ? 'completed' : meeting.status === 'summary_pending' ? 'queued' : 'idle')
  const isActive = status === 'queued' || status === 'summarizing'
  const canSummarize = hasTranscript && !isActive && status !== 'unavailable'
  const parsedSummary = getStructuredMeetingSummary(meeting.summarySections, summaryText || null)

  return (
    <section className="rounded-[8px] bg-[#f5f5f7] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            className="text-[14px] font-semibold tracking-[-0.224px] text-[#1d1d1f]"
            style={{ fontFamily: SF_TEXT }}
          >
            Summary
          </h3>
          <p
            className="mt-1 text-[12px] tracking-[-0.12px]"
            style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
          >
            Keep the concise meeting summary beside the transcript.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={[
              'rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[-0.08px]',
              getSummaryStatusTone(status),
            ].join(' ')}
            style={{ fontFamily: SF_TEXT }}
          >
            {getSummaryStatusLabel(status)}
          </span>

          <button
            type="button"
            onClick={onSummarize}
            disabled={!canSummarize}
            className="rounded-[8px] bg-[#0071e3] px-3 py-2 text-[13px] tracking-[-0.224px] text-white transition-colors duration-100 hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: SF_TEXT }}
          >
            {!hasTranscript
              ? 'No transcript'
              : status === 'unavailable'
                ? 'Unavailable'
                : isActive
                  ? 'Summarizing'
                  : hasSummary
                    ? 'Re-summarize'
                    : 'Summarize'}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-[8px] bg-white p-4">
        <div className="flex items-start gap-3">
          <DustoCharacter variant={getSummaryCharacterVariant(status)} size={34} />
          <div className="min-w-0 flex-1">
            <p
              className="text-[13px] font-medium tracking-[-0.224px] text-[#1d1d1f]"
              style={{ fontFamily: SF_TEXT }}
            >
              {hasSummary
                ? 'Summary is ready'
                : isActive
                  ? 'Dusto is writing the meeting summary locally.'
                  : hasTranscript
                    ? status === 'unavailable'
                      ? 'The local AI runtime is unavailable right now.'
                      : 'Generate a structured local summary from the transcript.'
                    : 'Transcribe the meeting first to unlock the summary.'}
            </p>
            <p
              className="mt-1 text-[12px] leading-[1.45] tracking-[-0.12px]"
              style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
            >
              {summary?.message ||
                (hasSummary
                  ? 'The saved summary stays with this meeting record.'
                  : hasTranscript
                    ? status === 'unavailable'
                      ? 'The local AI runtime could not be reached for meeting summaries.'
                      : 'The local AI runtime will fill in concise summary, decisions, action items, risks/blockers, and follow-ups.'
                    : 'This meeting still needs transcript text before Dusto can summarize it.')}
            </p>
          </div>
        </div>

        {summary?.error ? (
          <p
            className="mt-3 rounded-[8px] bg-[#fff5f4] px-3 py-2 text-[12px] leading-[1.45] tracking-[-0.12px] text-[#b42318]"
            style={{ fontFamily: SF_TEXT }}
          >
            {summary.error}
          </p>
        ) : null}

        {hasTranscript ? (
          hasSummary ? (
            <div className="mt-4 overflow-hidden rounded-[8px] border border-black/[0.06]">
              <SummarySection title="Concise summary">
                <p className="whitespace-pre-wrap">
                  {parsedSummary.conciseSummary || 'No concise summary was captured.'}
                </p>
              </SummarySection>
              <SummarySection title="Decisions">
                {renderSummaryList(parsedSummary.decisions, 'No decisions were captured.')}
              </SummarySection>
              <SummarySection title="Action items">
                {renderSummaryList(parsedSummary.actionItems, 'No action items were captured.')}
              </SummarySection>
              <SummarySection title="Risks / blockers">
                {renderSummaryList(
                  parsedSummary.risksBlockers,
                  'No risks or blockers were captured.'
                )}
              </SummarySection>
              <SummarySection title="Follow-ups">
                {renderSummaryList(parsedSummary.followUps, 'No follow-ups were captured.')}
              </SummarySection>
            </div>
          ) : (
            <div className="mt-4 rounded-[8px] border border-dashed border-black/[0.08] bg-white px-4 py-6 text-center">
              <p
                className="text-[13px] leading-[1.45] tracking-[-0.224px]"
                style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
              >
                Dusto will render concise summary, decisions, action items, risks/blockers, and follow-ups here.
              </p>
            </div>
          )
        ) : (
          <div className="mt-4 rounded-[8px] border border-dashed border-black/[0.08] bg-white px-4 py-6 text-center">
            <p
              className="text-[13px] leading-[1.45] tracking-[-0.224px]"
              style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
            >
              No transcript is stored yet.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function TranscriptionPanel({
  meeting,
  transcription,
  onTranscribe,
}: {
  meeting: MeetingRecord
  transcription: {
    status: string
    progress: number | null
    message: string | null
    error: string | null
  } | null
  onTranscribe: () => void
}): React.JSX.Element {
  const status = transcription?.status ?? (meeting.transcript ? 'completed' : 'idle')
  const transcriptText = meeting.transcript?.trim() ?? ''
  const isActive = status === 'queued' || status === 'transcribing' || status === 'saving'
  const progress = transcription?.progress ?? null
  const hasTranscript = transcriptText.length > 0
  const canTranscribe = Boolean(meeting.audio) && !isActive

  return (
    <section className="rounded-[8px] bg-[#f5f5f7] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            className="text-[14px] font-semibold tracking-[-0.224px] text-[#1d1d1f]"
            style={{ fontFamily: SF_TEXT }}
          >
            Transcript
          </h3>
          <p
            className="mt-1 text-[12px] tracking-[-0.12px]"
            style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
          >
            Keep the raw local transcript beside the recording.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={[
              'rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[-0.08px]',
              getTranscriptionStatusTone(status),
            ].join(' ')}
            style={{ fontFamily: SF_TEXT }}
          >
            {getTranscriptionStatusLabel(status)}
          </span>

          <button
            type="button"
            onClick={onTranscribe}
            disabled={!canTranscribe}
            className="rounded-[8px] bg-[#0071e3] px-3 py-2 text-[13px] tracking-[-0.224px] text-white transition-colors duration-100 hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontFamily: SF_TEXT }}
          >
            {!meeting.audio ? 'No audio' : isActive ? 'Transcribing' : hasTranscript ? 'Re-transcribe' : 'Transcribe'}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-[8px] bg-white p-4">
        <div className="flex items-start gap-3">
          <DustoCharacter variant={getTranscriptionCharacterVariant(status)} size={34} />
          <div className="min-w-0 flex-1">
            <p
              className="text-[13px] font-medium tracking-[-0.224px] text-[#1d1d1f]"
              style={{ fontFamily: SF_TEXT }}
            >
              {hasTranscript
                ? 'Transcript is ready'
                : isActive
                  ? 'Dusto is transcribing this recording locally.'
                  : 'Transcribe the saved audio to reveal the meeting text.'}
            </p>
            <p
              className="mt-1 text-[12px] leading-[1.45] tracking-[-0.12px]"
              style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
            >
              {transcription?.message ||
                (hasTranscript
                  ? 'Saved transcript text stays in the meeting record.'
                  : meeting.audio
                    ? 'The local STT runtime will fill in the transcript here when available.'
                    : 'This meeting does not have saved audio to transcribe.')}
            </p>
          </div>
        </div>

        {isActive ? (
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full bg-[#0071e3] transition-all duration-300"
                style={{
                  width: `${progress !== null ? Math.max(5, progress) : 36}%`,
                }}
              />
            </div>
            <p
              className="mt-2 text-[11px] tracking-[-0.12px]"
              style={{ color: 'rgba(0,0,0,0.42)', fontFamily: SF_TEXT }}
            >
              {progress !== null ? `${Math.round(progress)}%` : 'Working through the recording...'}
            </p>
          </div>
        ) : null}

        {transcription?.error ? (
          <p
            className="mt-3 rounded-[8px] bg-[#fff5f4] px-3 py-2 text-[12px] leading-[1.45] tracking-[-0.12px] text-[#b42318]"
            style={{ fontFamily: SF_TEXT }}
          >
            {transcription.error}
          </p>
        ) : null}

        {hasTranscript ? (
          <div className="mt-4 rounded-[8px] bg-[#f5f5f7] p-3">
            <pre
              className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words text-[13px] leading-[1.6] tracking-[-0.224px] text-[#1d1d1f]"
              style={{ fontFamily: SF_TEXT }}
            >
              {transcriptText}
            </pre>
            <p
              className="mt-3 text-[11px] tracking-[-0.12px]"
              style={{ color: 'rgba(0,0,0,0.42)', fontFamily: SF_TEXT }}
            >
              {transcriptText.split(/\s+/).filter(Boolean).length} words · {getMeetingStatusLabel(meeting)}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-[8px] border border-dashed border-black/[0.08] bg-white px-4 py-6 text-center">
            <p
              className="text-[13px] leading-[1.45] tracking-[-0.224px]"
              style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
            >
              No transcript is stored yet.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function MeetingDetail({ meeting }: { meeting: MeetingRecord | null }): React.JSX.Element {
  const loadAudioUrl = useMeetingsStore((state) => state.loadAudioUrl)
  const audioUrls = useMeetingsStore((state) => state.audioUrls)
  const transcribeMeeting = useMeetingsStore((state) => state.transcribeMeeting)
  const summarizeMeeting = useMeetingsStore((state) => state.summarizeMeeting)
  const deleteMeeting = useMeetingsStore((state) => state.deleteMeeting)
  const transcription = useMeetingsStore((state) =>
    meeting ? state.transcriptionByMeetingId[meeting.id] ?? null : null
  )
  const summary = useMeetingsStore((state) =>
    meeting ? state.summaryByMeetingId[meeting.id] ?? null : null
  )
  const [audioLoadFailed, setAudioLoadFailed] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setAudioLoadFailed(false)
    setDeleteError(null)
    if (!meeting?.audio) {
      return
    }

    void loadAudioUrl(meeting.id).then((url) => {
      if (!url) {
        setAudioLoadFailed(true)
      }
    })
  }, [loadAudioUrl, meeting])

  if (!meeting) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <DustoCharacter variant="detective" size={52} />
        <p
          className="text-[14px] tracking-[-0.224px]"
          style={{ color: 'rgba(0,0,0,0.32)', fontFamily: SF_TEXT }}
        >
          Record a meeting to begin.
        </p>
      </div>
    )
  }

  const selectedMeeting = meeting
  const audioUrl = audioUrls[selectedMeeting.id] ?? null

  async function handleDelete(): Promise<void> {
    const confirmed = window.confirm(
      `Delete "${selectedMeeting.title}"?\n\nThis removes the saved meeting record and its local audio file.`
    )
    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const result = await deleteMeeting(selectedMeeting.id)
      if (!result.success) {
        setDeleteError(result.error ?? 'Dusto could not delete this meeting.')
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Dusto could not delete this meeting.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <div className="max-w-[760px]">
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] pb-4">
          <div className="min-w-0">
            <h2
              className="truncate text-[24px] font-semibold leading-[1.14] tracking-normal text-[#1d1d1f]"
              style={{ fontFamily: "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" }}
            >
              {meeting.title}
            </h2>
            <p
              className="mt-1 text-[13px] tracking-[-0.224px]"
              style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
            >
              {formatDate(meeting.createdAt)} · {formatDuration(meeting.durationMs)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="rounded-[980px] bg-[#f5f5f7] px-3 py-1 text-[12px] tracking-[-0.12px] text-[rgba(0,0,0,0.56)]"
              style={{ fontFamily: SF_TEXT }}
            >
              {getMeetingStatusLabel(meeting)}
            </span>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="rounded-[8px] bg-[#fff5f4] px-3 py-1.5 text-[12px] tracking-[-0.12px] text-[#b42318] transition-colors duration-100 hover:bg-[#ffe7e4] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: SF_TEXT }}
            >
              {isDeleting ? 'Deleting' : 'Delete'}
            </button>
          </div>
        </div>

        {deleteError ? (
          <p
            className="mt-3 rounded-[8px] bg-[#fff5f4] px-3 py-2 text-[12px] leading-[1.45] tracking-[-0.12px] text-[#b42318]"
            style={{ fontFamily: SF_TEXT }}
          >
            {deleteError}
          </p>
        ) : null}

        <section className="py-5">
          <h3
            className="text-[14px] font-semibold tracking-[-0.224px] text-[#1d1d1f]"
            style={{ fontFamily: SF_TEXT }}
          >
            Audio
          </h3>
          <div className="mt-3 rounded-[8px] bg-[#f5f5f7] p-4">
            {audioUrl ? (
              <audio controls src={audioUrl} className="w-full" />
            ) : (
              <p
                className="text-[13px] tracking-[-0.224px]"
                style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
              >
                {audioLoadFailed ? 'Audio file could not be opened.' : 'Loading audio...'}
              </p>
            )}
            {meeting.audio ? (
              <p
                className="mt-3 text-[12px] tracking-[-0.12px]"
                style={{ color: 'rgba(0,0,0,0.42)', fontFamily: SF_TEXT }}
              >
                {meeting.audio.mimeType} · {formatBytes(meeting.audio.byteLength)}
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 pb-8 md:grid-cols-2">
          <TranscriptionPanel
            meeting={meeting}
            transcription={transcription}
            onTranscribe={() => {
              void transcribeMeeting(meeting.id)
            }}
          />
          <SummaryPanel
            meeting={meeting}
            summary={summary}
            onSummarize={() => {
              void summarizeMeeting(meeting.id)
            }}
          />
        </section>
      </div>
    </div>
  )
}

function MeetingRecorderPanel(): React.JSX.Element {
  const meetings = useMeetingsStore((state) => state.meetings)
  const selectedMeetingId = useMeetingsStore((state) => state.selectedMeetingId)
  const hydrated = useMeetingsStore((state) => state.hydrated)
  const select = useMeetingsStore((state) => state.select)
  const selectedMeeting = getSelectedMeeting(meetings, selectedMeetingId)

  useEffect(() => {
    void hydrateMeetingsStore()
  }, [])

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-[280px] shrink-0 flex-col border-r border-black/[0.06]">
        <RecordingControls />
        <MeetingList
          meetings={meetings}
          selectedMeetingId={selectedMeetingId}
          hydrated={hydrated}
          onSelect={select}
        />
      </div>
      <MeetingDetail meeting={selectedMeeting} />
    </div>
  )
}

export default React.memo(MeetingRecorderPanel)
