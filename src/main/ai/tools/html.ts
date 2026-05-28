import type { AssistantToolContext, AssistantToolResult } from '../types'
import type { AssistantToolDefinition, AssistantToolExecutionContext } from './registry'

type HtmlGenerateArgs = Record<string, unknown> & {
  html?: unknown
  document?: unknown
  draft?: unknown
  content?: unknown
}

type HtmlRewriteArgs = HtmlGenerateArgs

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null
}

function getHtmlDocument(args: HtmlGenerateArgs | HtmlRewriteArgs): string | null {
  return (
    getString(args.html) ??
    getString(args.document) ??
    getString(args.draft) ??
    getString(args.content)
  )
}

function getCurrentHtmlDocument(context?: AssistantToolContext): string | null {
  return context?.currentHtmlDocument?.trim() || null
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

function buildHtmlPreview(
  args: HtmlRewriteArgs,
  context: AssistantToolExecutionContext
): string | null {
  return getHtmlDocument(args) ?? getCurrentHtmlDocument(context.context)
}

export const htmlGenerateTool: AssistantToolDefinition<HtmlGenerateArgs> = {
  name: 'html.generate',
  description: 'Generate a fresh HTML draft without replacing the current document.',
  confirmation: 'none',
  argumentSchema: '{"html":"string"}',
  async execute(call) {
    const html = getHtmlDocument(call.arguments)

    if (!html) {
      return createBlockedResult('html.generate', 'the generated HTML draft was empty.')
    }

    return {
      toolName: 'html.generate',
      status: 'success',
      summary: 'I prepared a new HTML draft for preview in the HTML editor.',
      data: {
        draftHtml: html,
        mode: 'draft',
      },
    }
  },
}

export const htmlRewriteTool: AssistantToolDefinition<HtmlRewriteArgs> = {
  name: 'html.rewrite',
  description: 'Rewrite the existing HTML document and replace the current editor content.',
  confirmation: 'required',
  argumentSchema: '{"html":"string"}',
  createConfirmation(call, context) {
    return {
      id: `${context.sessionId}:${Date.now()}:${call.name}`,
      sessionId: context.sessionId,
      toolCall: call,
      context: context.context,
      title: 'Replace current HTML document?',
      message: 'Dusto will overwrite the current HTML editor content with the rewritten version.',
      confirmLabel: 'Replace HTML',
      cancelLabel: 'Keep current HTML',
      preview: buildHtmlPreview(call.arguments, context),
      createdAt: Date.now(),
    }
  },
  async execute(call, context) {
    const currentHtml = getCurrentHtmlDocument(context.context)
    const html = getHtmlDocument(call.arguments)

    if (!currentHtml) {
      return createBlockedResult('html.rewrite', 'there is no current HTML document to rewrite.')
    }

    if (!html) {
      return createBlockedResult('html.rewrite', 'the rewritten HTML content was empty.')
    }

    return {
      toolName: 'html.rewrite',
      status: 'success',
      summary: 'I replaced the current HTML document with the rewritten version.',
      data: {
        html,
        mode: 'replace',
      },
    }
  },
}
