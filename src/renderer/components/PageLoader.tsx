import React from 'react'
import DustoCharacter from './DustoCharacter'

const SF_DISPLAY = "'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
const SF_TEXT = "'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-[#fbfbfd] px-6">
      <div className="flex max-w-[320px] flex-col items-center text-center">
        <DustoCharacter variant="cleaner" size={52} />
        <p
          className="mt-4 text-[20px] font-semibold tracking-[-0.32px] text-[#1d1d1f]"
          style={{ fontFamily: SF_DISPLAY }}
        >
          Loading module…
        </p>
        <p
          className="mt-2 text-[13px] leading-[1.5] tracking-[-0.18px]"
          style={{ color: 'rgba(0,0,0,0.46)', fontFamily: SF_TEXT }}
        >
          Dusto is bringing in just what this screen needs.
        </p>
      </div>
    </div>
  )
}

export default PageLoader
