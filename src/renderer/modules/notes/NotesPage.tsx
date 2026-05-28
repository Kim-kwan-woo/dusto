import React from 'react'
import PageHeader from '../../components/PageHeader'
import NotesPanel from './NotesPanel'

function NotesPage(): React.JSX.Element {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Notes" subtitle="Capture thoughts quickly." />
      <div className="flex-1 overflow-hidden">
        <NotesPanel />
      </div>
    </div>
  )
}

export default NotesPage
