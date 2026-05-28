import React from 'react'
import CanvasPanel from './CanvasPanel'

function CanvasPage(): React.JSX.Element {
  return (
    <div className="h-full overflow-hidden">
      <CanvasPanel />
    </div>
  )
}

export default CanvasPage
