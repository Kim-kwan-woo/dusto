import { loadTodos, saveTodos } from '../../storage'
import type { AssistantToolResult } from '../types'
import type { AssistantToolDefinition, AssistantToolExecutionContext } from './registry'

type TodoCreateArgs = Record<string, unknown> & {
  text?: unknown
  item?: unknown
}

type TodoExtractArgs = Record<string, unknown> & {
  items?: unknown
  todos?: unknown
  lines?: unknown
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null
}

function getStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  const single = getString(value)
  if (!single) {
    return []
  }

  return single
    .split('\n')
    .map((entry) => entry.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
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

function normalizeItemText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

function buildCleanupPreview(context: AssistantToolExecutionContext): string | null {
  const completed = (context.context?.selectedTodoItems ?? [])
    .filter((item) => item.done)
    .slice(0, 6)
    .map((item) => `• ${item.text}`)

  if (completed.length === 0) {
    return null
  }

  return completed.join('\n')
}

export const todoCreateTool: AssistantToolDefinition<TodoCreateArgs> = {
  name: 'todo.create',
  description: 'Create one todo item from user-provided text.',
  confirmation: 'none',
  argumentSchema: '{"text":"string"}',
  async execute(call) {
    const text = getString(call.arguments.text) ?? getString(call.arguments.item)

    if (!text) {
      return createBlockedResult('todo.create', 'the todo text was empty.')
    }

    const items = await loadTodos()
    const todo = {
      id: crypto.randomUUID(),
      text,
      done: false,
      createdAt: Date.now(),
    }
    const nextItems = [...items, todo]

    await saveTodos(nextItems)

    return {
      toolName: 'todo.create',
      status: 'success',
      summary: 'I added that task to Todo.',
      data: {
        todo,
        items: nextItems,
      },
    }
  },
}

export const todoExtractTool: AssistantToolDefinition<TodoExtractArgs> = {
  name: 'todo.extract',
  description: 'Extract todo items from the selected note.',
  confirmation: 'none',
  argumentSchema: '{"items":["string"]}',
  async execute(call, context) {
    const itemsToCreate = [
      ...getStringList(call.arguments.items),
      ...getStringList(call.arguments.todos),
      ...getStringList(call.arguments.lines),
    ]
    const noteId = context.context?.selectedNoteId?.trim() || null

    if (!noteId || !context.context?.selectedNoteBody?.trim()) {
      return createBlockedResult('todo.extract', 'there is no selected note to extract from.')
    }

    if (itemsToCreate.length === 0) {
      return createBlockedResult('todo.extract', 'no todo items were extracted from the note.')
    }

    const existingItems = await loadTodos()
    const seen = new Set(existingItems.map((item) => normalizeItemText(item.text)))
    const created = itemsToCreate
      .filter((text) => {
        const normalized = normalizeItemText(text)
        if (!normalized || seen.has(normalized)) {
          return false
        }

        seen.add(normalized)
        return true
      })
      .map((text) => ({
        id: crypto.randomUUID(),
        text,
        done: false,
        createdAt: Date.now(),
      }))

    if (created.length === 0) {
      return createBlockedResult('todo.extract', 'every extracted task already existed in Todo.')
    }

    const items = [...existingItems, ...created]
    await saveTodos(items)

    return {
      toolName: 'todo.extract',
      status: 'success',
      summary: `I added ${created.length} task${created.length === 1 ? '' : 's'} from the note.`,
      data: {
        created,
        items,
        sourceNoteId: noteId,
      },
    }
  },
}

export const todoCleanupTool: AssistantToolDefinition<Record<string, unknown>> = {
  name: 'todo.cleanup',
  description: 'Remove completed todo items in bulk.',
  confirmation: 'required',
  argumentSchema: '{}',
  createConfirmation(call, context) {
    const completedCount = (context.context?.selectedTodoItems ?? []).filter((item) => item.done).length

    return {
      id: `${context.sessionId}:${Date.now()}:${call.name}`,
      sessionId: context.sessionId,
      toolCall: call,
      context: context.context,
      title: 'Clear completed tasks?',
      message:
        completedCount > 0
          ? `Dusto will remove ${completedCount} completed task${completedCount === 1 ? '' : 's'} from Todo.`
          : 'Dusto will remove all completed tasks from Todo.',
      confirmLabel: 'Clear completed',
      cancelLabel: 'Keep tasks',
      preview: buildCleanupPreview(context),
      createdAt: Date.now(),
    }
  },
  async execute() {
    const items = await loadTodos()
    const remaining = items.filter((item) => !item.done)
    const removedCount = items.length - remaining.length

    if (removedCount === 0) {
      return createBlockedResult('todo.cleanup', 'there were no completed tasks to remove.')
    }

    await saveTodos(remaining)

    return {
      toolName: 'todo.cleanup',
      status: 'success',
      summary: `I removed ${removedCount} completed task${removedCount === 1 ? '' : 's'}.`,
      data: {
        items: remaining,
        removedCount,
      },
    }
  },
}
