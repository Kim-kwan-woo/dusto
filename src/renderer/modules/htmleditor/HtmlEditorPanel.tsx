import React, { useRef, useEffect, useCallback, useState } from 'react'
import useHtmlEditorStore from './htmleditor.store'
import DustoCharacter from '../../components/DustoCharacter'

const SF_TEXT = "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
const SF_MONO = "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace"
const MIN_PANE_WIDTH = 240

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'

interface HtmlEditorPanelProps {
  onExport: () => void
  status: ExportStatus
}

function serializeIframeDocument(doc: Document): string {
  const clonedRoot = doc.documentElement.cloneNode(true)

  if (!(clonedRoot instanceof HTMLElement)) {
    return doc.documentElement.outerHTML
  }

  clonedRoot.querySelector('body')?.removeAttribute('contenteditable')

  return `<!DOCTYPE html>\n${clonedRoot.outerHTML}`
}

function HtmlEditorPanel({ onExport, status }: HtmlEditorPanelProps): React.JSX.Element {
  const html = useHtmlEditorStore((state) => state.html)
  const assistantDraft = useHtmlEditorStore((state) => state.assistantDraft)
  const isPreviewingAssistantDraft = useHtmlEditorStore((state) => state.isPreviewingAssistantDraft)
  const setHtml = useHtmlEditorStore((state) => state.setHtml)
  const applyAssistantDraft = useHtmlEditorStore((state) => state.applyAssistantDraft)
  const dismissAssistantDraft = useHtmlEditorStore((state) => state.dismissAssistantDraft)
  const setPreviewingAssistantDraft = useHtmlEditorStore((state) => state.setPreviewingAssistantDraft)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const splitPaneRef = useRef<HTMLDivElement>(null)
  const [editorWidthPercent, setEditorWidthPercent] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  // Tracks what's currently rendered in the iframe to avoid unnecessary rewrites
  const iframeContentRef = useRef<string>('')

  const updateEditorWidth = useCallback((clientX: number) => {
    const splitPane = splitPaneRef.current
    if (!splitPane) return

    const { left, width } = splitPane.getBoundingClientRect()
    if (width <= 0) return

    const minPercent = Math.min((MIN_PANE_WIDTH / width) * 100, 45)
    const maxPercent = 100 - minPercent
    const nextPercent = ((clientX - left) / width) * 100
    setEditorWidthPercent(Math.min(maxPercent, Math.max(minPercent, nextPercent)))
  }, [])

  useEffect(() => {
    if (!isResizing) return

    function handlePointerMove(event: PointerEvent) {
      updateEditorWidth(event.clientX)
    }

    function handlePointerUp() {
      setIsResizing(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [isResizing, updateEditorWidth])

  // Write html into the iframe and inject contenteditable on body
  const writeToIframe = useCallback((content: string, editable: boolean) => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(content)
    doc.close()
    if (doc.body) {
      doc.body.contentEditable = editable ? 'true' : 'false'
      doc.body.style.outline = 'none'
    }
    if (editable) {
      // Listen for input events inside the iframe to sync back to editor
      doc.body?.addEventListener('input', () => {
        if (!doc.body) return
        const updated = serializeIframeDocument(doc)
        // Mark that the iframe already reflects this content so the effect won't rewrite it
        iframeContentRef.current = updated
        setHtml(updated)
      })
    }
  }, [setHtml])

  const previewHtml =
    assistantDraft && isPreviewingAssistantDraft ? assistantDraft.html : html
  const isPreviewEditable = !(assistantDraft && isPreviewingAssistantDraft)

  // Only rewrite the iframe when the content actually differs from what's in it
  useEffect(() => {
    if (!previewHtml.trim()) return
    if (previewHtml === iframeContentRef.current) return
    iframeContentRef.current = previewHtml
    writeToIframe(previewHtml, isPreviewEditable)
  }, [isPreviewEditable, previewHtml, writeToIframe])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el = e.currentTarget
    const { selectionStart, selectionEnd, value } = el
    const next = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd)
    setHtml(next)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = selectionStart + 2
    })
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setHtml(e.target.value)
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsResizing(true)
    updateEditorWidth(event.clientX)
  }

  function handleResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? -1 : 1
    const step = event.shiftKey ? 10 : 2
    setEditorWidthPercent((current) => Math.min(80, Math.max(20, current + direction * step)))
  }

  const isExporting = status === 'exporting'
  const canExport = !isExporting && html.trim().length > 0

  const feedbackColor = status === 'success' ? '#34c759' : '#ff3b30'
  const feedbackText = status === 'success' ? 'Saved.' : status === 'error' ? 'Export failed.' : ''

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-5 border-b border-black/[0.06] flex-shrink-0"
        style={{ height: '48px' }}
      >
        <span
          className="text-[15px] font-semibold text-[#1d1d1f] tracking-[-0.374px]"
          style={{ fontFamily: "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" }}
        >
          HTML
        </span>

        <div className="flex items-center gap-3">
          {/* Working character + label during export */}
          <div
            className="flex items-center gap-1.5 overflow-hidden transition-all duration-200"
            style={{ width: isExporting ? 'auto' : 0, opacity: isExporting ? 1 : 0 }}
          >
            <DustoCharacter variant="cleaner" size={24} />
            <span
              className="text-[12px] tracking-[-0.12px] whitespace-nowrap"
              style={{ color: 'rgba(0,0,0,0.48)', fontFamily: SF_TEXT }}
            >
              Exporting…
            </span>
          </div>

          {/* Success / error feedback — auto-dismissed by parent */}
          {feedbackText && (
            <span
              className="flex items-center gap-1.5 text-[12px] tracking-[-0.12px]"
              style={{ color: feedbackColor, fontFamily: SF_TEXT }}
            >
              <DustoCharacter variant={status === 'success' ? 'shiny' : 'surprised'} size={22} />
              {feedbackText}
            </span>
          )}

          <button
            onClick={onExport}
            disabled={!canExport}
            className="h-[30px] px-4 rounded-[7px] text-[13px] tracking-[-0.224px] transition-colors duration-100 disabled:opacity-40"
            style={{
              background: '#0071e3',
              color: '#ffffff',
              fontFamily: SF_TEXT,
              fontWeight: 400
            }}
            onMouseEnter={(e) => {
              if (canExport) e.currentTarget.style.background = '#0077ed'
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0071e3')}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div ref={splitPaneRef} className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div
          className="flex min-w-[240px] flex-col"
          style={{ flexBasis: `${editorWidthPercent}%` }}
        >
          {assistantDraft ? (
            <div className="border-b border-[#0071e3]/12 bg-[#eef5ff] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-[#0066cc]/70">
                    Assistant draft
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.45] tracking-[-0.2px] text-black/[0.68]">
                    {assistantDraft.source === 'rewrite'
                      ? 'A rewritten HTML version is ready to review before replacing your editor content.'
                      : 'A fresh HTML draft is ready. Preview it first, then apply it when you are ready.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewingAssistantDraft(true)}
                    className={[
                      'rounded-full px-3 py-2 text-[12px] tracking-[-0.12px] transition-colors duration-150',
                      isPreviewingAssistantDraft
                        ? 'bg-[#0071e3] text-white'
                        : 'border border-[#0071e3]/18 bg-white text-[#0066cc]'
                    ].join(' ')}
                  >
                    Preview draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewingAssistantDraft(false)}
                    className={[
                      'rounded-full px-3 py-2 text-[12px] tracking-[-0.12px] transition-colors duration-150',
                      !isPreviewingAssistantDraft
                        ? 'bg-[#1d1d1f] text-white'
                        : 'border border-black/[0.08] bg-white text-black/[0.68]'
                    ].join(' ')}
                  >
                    Show current
                  </button>
                  <button
                    type="button"
                    onClick={applyAssistantDraft}
                    className="rounded-full bg-[#0071e3] px-3 py-2 text-[12px] tracking-[-0.12px] text-white transition-colors duration-150 hover:bg-[#0077ed]"
                  >
                    Replace editor
                  </button>
                  <button
                    type="button"
                    onClick={dismissAssistantDraft}
                    className="rounded-full border border-black/[0.08] bg-white px-3 py-2 text-[12px] tracking-[-0.12px] text-black/[0.68] transition-colors duration-150 hover:bg-black/[0.03]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="px-4 py-1.5 border-b border-black/[0.04] flex-shrink-0"
            style={{ background: '#fafafa' }}
          >
            <span
              className="text-[11px] tracking-[0.04em] uppercase"
              style={{ color: 'rgba(0,0,0,0.32)', fontFamily: SF_TEXT }}
            >
              Editor
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={html}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            wrap="off"
            className="flex-1 resize-none outline-none px-4 py-4 bg-white text-[13px] leading-[1.6]"
            style={{
              fontFamily: SF_MONO,
              color: '#1d1d1f',
              tabSize: 2
            }}
          />
        </div>

        <div
          role="separator"
          aria-label="Resize editor and preview panes"
          aria-orientation="vertical"
          aria-valuemin={20}
          aria-valuemax={80}
          aria-valuenow={Math.round(editorWidthPercent)}
          tabIndex={0}
          onPointerDown={handleResizePointerDown}
          onKeyDown={handleResizeKeyDown}
          className={[
            'group relative z-10 flex w-[11px] flex-shrink-0 cursor-col-resize items-center justify-center bg-white outline-none',
            'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-black/[0.06]',
            'after:absolute after:inset-y-0 after:left-1/2 after:w-[3px] after:-translate-x-1/2 after:bg-[#0071e3] after:opacity-0 after:transition-opacity after:duration-150',
            'hover:after:opacity-100 focus-visible:after:opacity-100',
            isResizing ? 'after:opacity-100' : ''
          ].join(' ')}
        >
          <span className="h-8 w-[3px] rounded-full bg-black/[0.16] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
        </div>

        {/* Preview */}
        <div className="flex min-w-[240px] flex-1 flex-col">
          <div
            className="px-4 py-1.5 border-b border-black/[0.04] flex-shrink-0"
            style={{ background: '#fafafa' }}
          >
            <span
              className="text-[11px] tracking-[0.04em] uppercase"
              style={{ color: 'rgba(0,0,0,0.32)', fontFamily: SF_TEXT }}
            >
              Preview
            </span>
            <span
              className="ml-2 text-[10px] tracking-[0.02em]"
              style={{ color: 'rgba(0,0,0,0.24)', fontFamily: SF_TEXT }}
            >
              {assistantDraft && isPreviewingAssistantDraft ? '· assistant draft' : '· editable'}
            </span>
          </div>

          {previewHtml.trim() ? (
            <iframe
              ref={iframeRef}
              sandbox="allow-same-origin"
              className={[
                'flex-1 border-none bg-white',
                isResizing ? 'pointer-events-none' : ''
              ].join(' ')}
              title="HTML Preview"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p
                className="text-[14px] tracking-[-0.224px]"
                style={{ color: 'rgba(0,0,0,0.28)', fontFamily: SF_TEXT }}
              >
                Preview will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HtmlEditorPanel
