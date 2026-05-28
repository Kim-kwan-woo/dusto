import React, { useEffect, useState } from 'react'
import HtmlEditorPanel from './HtmlEditorPanel'
import useHtmlEditorStore from './htmleditor.store'

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error'

function HtmlEditorPage(): React.JSX.Element {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const { html } = useHtmlEditorStore()

  // Auto-dismiss success and error after 3 seconds
  useEffect(() => {
    if (status !== 'success' && status !== 'error') return
    const id = setTimeout(() => setStatus('idle'), 3000)
    return () => clearTimeout(id)
  }, [status])

  async function handleExport() {
    setStatus('exporting')
    try {
      const result = await window.api.exportPdf(html)
      // result.success === false means user cancelled — silent reset
      setStatus(result.success ? 'success' : 'idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <HtmlEditorPanel
        onExport={handleExport}
        status={status}
      />
    </div>
  )
}

export default HtmlEditorPage
