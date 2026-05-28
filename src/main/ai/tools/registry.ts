import type {
  AssistantConfirmationRequest,
  AssistantToolCall,
  AssistantToolContext,
  AssistantToolName,
  AssistantToolResult,
  AssistantToolRunResult,
} from '../types'
import { canvasCreateTool, canvasRenameTool } from './canvas'
import { htmlGenerateTool, htmlRewriteTool } from './html'
import { notesCreateTool, notesRewriteTool, notesSummarizeTool } from './notes'
import { todoCleanupTool, todoCreateTool, todoExtractTool } from './todo'

export type AssistantToolConfirmationPolicy = 'none' | 'required'

export interface AssistantToolExecutionContext {
  sessionId: string
  context?: AssistantToolContext
}

export interface AssistantToolDefinition<TArgs = Record<string, unknown>> {
  name: AssistantToolName
  description: string
  confirmation: AssistantToolConfirmationPolicy
  argumentSchema: string
  createConfirmation?: (
    call: AssistantToolCall<TArgs>,
    context: AssistantToolExecutionContext
  ) => AssistantConfirmationRequest
  execute: (
    call: AssistantToolCall<TArgs>,
    context: AssistantToolExecutionContext
  ) => Promise<AssistantToolResult>
}

const registry = {
  'notes.create': notesCreateTool,
  'notes.rewrite': notesRewriteTool,
  'notes.summarize': notesSummarizeTool,
  'todo.create': todoCreateTool,
  'todo.extract': todoExtractTool,
  'todo.cleanup': todoCleanupTool,
  'canvas.create': canvasCreateTool,
  'canvas.rename': canvasRenameTool,
  'html.generate': htmlGenerateTool,
  'html.rewrite': htmlRewriteTool,
} satisfies Record<AssistantToolName, AssistantToolDefinition>

export function getToolDefinitions(): AssistantToolDefinition[] {
  return Object.values(registry)
}

export function getToolDefinition(name: AssistantToolName): AssistantToolDefinition {
  return registry[name]
}

export async function runTool(
  toolCall: AssistantToolCall,
  context: AssistantToolExecutionContext
): Promise<AssistantToolRunResult> {
  const definition = getToolDefinition(toolCall.name)

  if (definition.confirmation === 'required' && definition.createConfirmation) {
    return {
      requiresConfirmation: true,
      confirmation: definition.createConfirmation(toolCall, context),
    }
  }

  return {
    requiresConfirmation: false,
    result: await definition.execute(toolCall, context),
  }
}
