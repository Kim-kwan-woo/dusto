import React from 'react'
import PageHeader from '../../components/PageHeader'
import MeetingRecorderPanel from './MeetingRecorderPanel'

function MeetingsPage(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Meetings" subtitle="Record microphone audio into local meeting records." />
      <div className="min-h-0 flex-1 overflow-hidden">
        <MeetingRecorderPanel />
      </div>
    </div>
  )
}

export default MeetingsPage
