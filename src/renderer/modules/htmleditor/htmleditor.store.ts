import { create } from 'zustand'

export interface AssistantHtmlDraft {
  html: string
  source: 'generate' | 'rewrite'
  createdAt: number
}

interface HtmlEditorState {
  html: string
  assistantDraft: AssistantHtmlDraft | null
  isPreviewingAssistantDraft: boolean
  setHtml: (html: string) => void
  stageAssistantDraft: (html: string, source: AssistantHtmlDraft['source']) => void
  applyAssistantDraft: () => void
  dismissAssistantDraft: () => void
  setPreviewingAssistantDraft: (value: boolean) => void
  replaceHtmlFromAssistant: (html: string) => void
}

const INITIAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: -apple-system, sans-serif;
      padding: 2rem;
      color: #1d1d1f;
      line-height: 1.6;
    }
    h1 { font-size: 2rem; font-weight: 600; margin-bottom: 0.5rem; }
    p  { color: rgba(0,0,0,0.6); }
  </style>
</head>
<body>
  <h1>Hello, Dusto</h1>
  <p>Edit this HTML and export it as a PDF.</p>
</body>
</html>`

const useHtmlEditorStore = create<HtmlEditorState>((set) => ({
  html: INITIAL_HTML,
  assistantDraft: null,
  isPreviewingAssistantDraft: false,

  setHtml: (html) =>
    set((state) => ({
      html,
      assistantDraft:
        state.assistantDraft && state.assistantDraft.html === html ? null : state.assistantDraft,
      isPreviewingAssistantDraft:
        state.assistantDraft && state.assistantDraft.html === html
          ? false
          : state.isPreviewingAssistantDraft,
    })),

  stageAssistantDraft: (html, source) =>
    set({
      assistantDraft: {
        html,
        source,
        createdAt: Date.now(),
      },
      isPreviewingAssistantDraft: true,
    }),

  applyAssistantDraft: () =>
    set((state) => {
      if (!state.assistantDraft) {
        return {}
      }

      return {
        html: state.assistantDraft.html,
        assistantDraft: null,
        isPreviewingAssistantDraft: false,
      }
    }),

  dismissAssistantDraft: () =>
    set({
      assistantDraft: null,
      isPreviewingAssistantDraft: false,
    }),

  setPreviewingAssistantDraft: (value) =>
    set((state) => ({
      isPreviewingAssistantDraft: state.assistantDraft ? value : false,
    })),

  replaceHtmlFromAssistant: (html) =>
    set({
      html,
      assistantDraft: null,
      isPreviewingAssistantDraft: false,
    }),
}))

export function stageHtmlDraftFromAssistant(
  html: string,
  source: AssistantHtmlDraft['source']
): void {
  useHtmlEditorStore.getState().stageAssistantDraft(html, source)
}

export function replaceHtmlFromAssistant(html: string): void {
  useHtmlEditorStore.getState().replaceHtmlFromAssistant(html)
}

export default useHtmlEditorStore
