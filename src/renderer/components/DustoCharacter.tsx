import React from 'react'
import angryUrl from '@assets/characters/dust_angry.svg'
import cleanerUrl from '@assets/characters/dust_cleaner.svg'
import cryingUrl from '@assets/characters/dust_crying.svg'
import detectiveUrl from '@assets/characters/dust_detective.svg'
import happyUrl from '@assets/characters/dust_happy.svg'
import hiddenUrl from '@assets/characters/dust_hidden.svg'
import miniUrl from '@assets/characters/dust_mini.svg'
import ribbonUrl from '@assets/characters/dust_ribbon.svg'
import shinyUrl from '@assets/characters/dust_shiny.svg'
import shyUrl from '@assets/characters/dust_shy.svg'
import sleepyUrl from '@assets/characters/dust_sleepy.svg'
import surprisedUrl from '@assets/characters/dust_surprised.svg'

export type DustoVariant =
  | 'angry'
  | 'cleaner'
  | 'crying'
  | 'detective'
  | 'happy'
  | 'hidden'
  | 'mini'
  | 'ribbon'
  | 'shiny'
  | 'shy'
  | 'sleepy'
  | 'surprised'

const VARIANT_URL: Record<DustoVariant, string> = {
  angry: angryUrl,
  cleaner: cleanerUrl,
  crying: cryingUrl,
  detective: detectiveUrl,
  happy: happyUrl,
  hidden: hiddenUrl,
  mini: miniUrl,
  ribbon: ribbonUrl,
  shiny: shinyUrl,
  shy: shyUrl,
  sleepy: sleepyUrl,
  surprised: surprisedUrl
}

interface DustoCharacterProps {
  variant?: DustoVariant
  size?: number
  className?: string
}

function DustoCharacter({
  variant = 'shy',
  size = 64,
  className = ''
}: DustoCharacterProps): React.JSX.Element {
  return (
    <img
      src={VARIANT_URL[variant]}
      width={size}
      height={size}
      alt={`Dusto ${variant}`}
      draggable={false}
      className={['shrink-0', className].filter(Boolean).join(' ')}
    />
  )
}

export default DustoCharacter
