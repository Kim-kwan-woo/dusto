import { loadNotes, saveNotes } from '../../storage'
import type { AssistantToolContext, AssistantToolResult } from '../types'
import type { AssistantToolDefinition, AssistantToolExecutionContext } from './registry'

type NotesCreateArgs = Record<string, unknown> & {
  body?: unknown
  content?: unknown
  text?: unknown
}

type NotesRewriteArgs = Record<string, unknown> & {
  body?: unknown
  content?: unknown
  replacement?: unknown
  text?: unknown
}

type NotesSummarizeArgs = Record<string, unknown> & {
  summary?: unknown
  bullets?: unknown
  highlights?: unknown
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null
}

function getStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function getSelectedNoteId(context?: AssistantToolContext): string | null {
  return context?.selectedNoteId?.trim() || null
}

function getSelectedNoteBody(context?: AssistantToolContext): string | null {
  return context?.selectedNoteBody?.trim() || null
}

function getSelectedNoteTitle(context?: AssistantToolContext): string {
  const title = context?.selectedNoteTitle?.trim()
  return title || 'Selected note'
}

function getNoteBody(args: NotesCreateArgs | NotesRewriteArgs): string | null {
  return (
    getString(args.body) ??
    getString(args.content) ??
    getString(args.replacement) ??
    getString(args.text)
  )
}

function createErrorResult(toolName: AssistantToolResult['toolName'], summary: string): AssistantToolResult {
  return {
    toolName,
    status: 'error',
    summary,
  }
}

function createBlockedResult(
  toolName: AssistantToolResult['toolName'],
  summary: string
): AssistantToolResult {
  return {
    toolName,
    status: 'blocked',
    summary,
  }
}

function buildRewritePreview(
  args: NotesRewriteArgs,
  context: AssistantToolExecutionContext
): string | null {
  const nextBody = getNoteBody(args)
  const currentBody = getSelectedNoteBody(context.context)

  if (!nextBody) {
    return currentBody
  }

  return [nextBody].join('\n').slice(0, 420)
}

export const notesCreateTool: AssistantToolDefinition<NotesCreateArgs> = {
  name: 'notes.create',
  description: 'Create a new note from user-provided text.',
  confirmation: 'none',
  argumentSchema: '{"body":"string"}',
  async execute(call) {
    const body = getNoteBody(call.arguments)

    if (!body) {
      return createBlockedResult('notes.create', 'the note content was empty.')
    }

    const stored = await loadNotes()
    const now = Date.now()
    const note = {
      id: crypto.randomUUID(),
      body,
      createdAt: now,
      updatedAt: now,
    }
    const notes = [note, ...stored.notes]

    await saveNotes({
      notes,
      selectedNoteId: note.id,
    })

    return {
      toolName: 'notes.create',
      status: 'success',
      summary: 'I created a new note and opened it in Notes.',
      data: {
        note,
        notes,
        selectedNoteId: note.id,
      },
    }
  },
}

export const notesRewriteTool: AssistantToolDefinition<NotesRewriteArgs> = {
  name: 'notes.rewrite',
  description: 'Replace the selected note body with a rewritten version.',
  confirmation: 'required',
  argumentSchema: '{"body":"string"}',
  createConfirmation(call, context) {
    return {
      id: `${context.sessionId}:${Date.now()}:${call.name}`,
      sessionId: context.sessionId,
      toolCall: call,
      context: context.context,
      title: 'Replace selected note?',
      message: 'Dusto will overwrite the current note body with the rewritten version.',
      confirmLabel: 'Replace note',
      cancelLabel: 'Keep current note',
      preview: buildRewritePreview(call.arguments, context),
      createdAt: Date.now(),
    }
  },
  async execute(call, context) {
    const selectedNoteId = getSelectedNoteId(context.context)
    const nextBody = getNoteBody(call.arguments)

    if (!selectedNoteId) {
      return createBlockedResult('notes.rewrite', 'there is no selected note to rewrite.')
    }

    if (!nextBody) {
      return createBlockedResult('notes.rewrite', 'the rewritten note content was empty.')
    }

    const stored = await loadNotes()
    const target = stored.notes.find((note) => note.id === selectedNoteId)

    if (!target) {
      return createErrorResult('notes.rewrite', 'the selected note could not be found.')
    }

    const updatedNote = {
      ...target,
      body: nextBody,
      updatedAt: Date.now(),
    }
    const notes = stored.notes.map((note) => (note.id === selectedNoteId ? updatedNote : note))

    await saveNotes({
      notes,
      selectedNoteId,
    })

    return {
      toolName: 'notes.rewrite',
      status: 'success',
      summary: `I rewrote "${getSelectedNoteTitle(context.context)}".`,
      data: {
        note: updatedNote,
        notes,
        selectedNoteId,
      },
    }
  },
}

export const notesSummarizeTool: AssistantToolDefinition<NotesSummarizeArgs> = {
  name: 'notes.summarize',
  description: 'Summarize the selected note without modifying it.',
  confirmation: 'none',
  argumentSchema: '{"summary":"string","bullets":["string"]}',
  async execute(call, context) {
    const selectedNoteId = getSelectedNoteId(context.context)
    const selectedNoteBody = getSelectedNoteBody(context.context)
    const summary = getString(call.arguments.summary)
    const bullets = getStringList(call.arguments.bullets).concat(
      getStringList(call.arguments.highlights)
    )

    if (!selectedNoteId || !selectedNoteBody) {
      return createBlockedResult('notes.summarize', 'there is no selected note to summarize.')
    }

    if (!summary && bullets.length === 0) {
      return createBlockedResult('notes.summarize', 'the summary content was empty.')
    }

    return {
      toolName: 'notes.summarize',
      status: 'success',
      summary: summary ?? `I summarized "${getSelectedNoteTitle(context.context)}".`,
      data: {
        selectedNoteId,
        summary: summary ?? bullets.join('\n'),
        bullets,
      },
    }
  },
}
