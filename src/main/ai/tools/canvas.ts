import { loadCanvas, saveCanvasMeta } from '../../storage'
import type { AssistantToolContext, AssistantToolResult } from '../types'
import type { AssistantToolDefinition } from './registry'

type CanvasCreateArgs = Record<string, unknown> & {
  title?: unknown
  name?: unknown
}

type CanvasRenameArgs = Record<string, unknown> & {
  boardId?: unknown
  id?: unknown
  title?: unknown
  name?: unknown
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null
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

function createErrorResult(
  toolName: AssistantToolResult['toolName'],
  summary: string
): AssistantToolResult {
  return {
    toolName,
    status: 'error',
    summary,
  }
}

function getSelectedBoardId(context?: AssistantToolContext): string | null {
  return context?.selectedBoardId?.trim() || null
}

function getBoardTitle(args: CanvasCreateArgs | CanvasRenameArgs): string | null {
  return getString(args.title) ?? getString(args.name)
}

function getBoardId(args: CanvasRenameArgs, context?: AssistantToolContext): string | null {
  return getString(args.boardId) ?? getString(args.id) ?? getSelectedBoardId(context)
}

export const canvasCreateTool: AssistantToolDefinition<CanvasCreateArgs> = {
  name: 'canvas.create',
  description: 'Create a new canvas board.',
  confirmation: 'none',
  argumentSchema: '{"title":"string"}',
  async execute(call) {
    const title = getBoardTitle(call.arguments) ?? ''
    const stored = await loadCanvas()
    const now = Date.now()
    const board = {
      id: crypto.randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
      scene: '',
    }
    const boards = [board, ...stored.boards]

    await saveCanvasMeta({
      boards: boards.map(({ scene: _scene, ...meta }) => meta),
      selectedBoardId: board.id,
    })

    return {
      toolName: 'canvas.create',
      status: 'success',
      summary: `I created ${title ? `"${title}"` : 'a new canvas board'} and selected it.`,
      data: {
        boards,
        selectedBoardId: board.id,
        board,
      },
    }
  },
}

export const canvasRenameTool: AssistantToolDefinition<CanvasRenameArgs> = {
  name: 'canvas.rename',
  description: 'Rename the selected canvas board.',
  confirmation: 'none',
  argumentSchema: '{"title":"string"}',
  async execute(call, context) {
    const boardId = getBoardId(call.arguments, context.context)
    const nextTitle = getBoardTitle(call.arguments)

    if (!boardId) {
      return createBlockedResult('canvas.rename', 'there is no selected canvas board to rename.')
    }

    if (!nextTitle) {
      return createBlockedResult('canvas.rename', 'the new board title was empty.')
    }

    const stored = await loadCanvas()
    const target = stored.boards.find((board) => board.id === boardId)

    if (!target) {
      return createErrorResult('canvas.rename', 'the selected canvas board could not be found.')
    }

    const renamedBoard = {
      ...target,
      title: nextTitle,
      updatedAt: Date.now(),
    }
    const boards = stored.boards.map((board) => (board.id === boardId ? renamedBoard : board))
    const selectedBoardId = stored.selectedBoardId ?? boardId

    await saveCanvasMeta({
      boards: boards.map(({ scene: _scene, ...meta }) => meta),
      selectedBoardId,
    })

    return {
      toolName: 'canvas.rename',
      status: 'success',
      summary: `I renamed the canvas board to "${nextTitle}".`,
      data: {
        boards,
        selectedBoardId,
        board: renamedBoard,
      },
    }
  },
}
