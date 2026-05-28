import React from 'react'

interface AssistantPromptChip {
  id: string
  label: string
  prompt?: string
  navigateTo?: string
  group: 'ask' | 'open'
}

interface AssistantPromptChipsProps {
  chips: AssistantPromptChip[]
  disabled?: boolean
  onPromptSelect: (prompt: string) => void
  onNavigate: (moduleId: string) => void
}

function AssistantPromptChips({
  chips,
  disabled = false,
  onPromptSelect,
  onNavigate
}: AssistantPromptChipsProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const isNavigationChip = Boolean(chip.navigateTo)

        return (
          <button
            key={chip.id}
            type="button"
            disabled={disabled && !isNavigationChip}
            onClick={() => {
              if (chip.navigateTo) {
                onNavigate(chip.navigateTo)
                return
              }

              if (chip.prompt) {
                onPromptSelect(chip.prompt)
              }
            }}
            className={[
              'rounded-full border px-3 py-2 text-[13px] tracking-[-0.22px] transition-colors duration-150',
              chip.navigateTo
                ? 'border-[#0071e3]/20 bg-[#0071e3]/6 text-[#0066cc] hover:border-[#0071e3]/30 hover:bg-[#0071e3]/10'
                : 'border-black/[0.08] bg-white text-black/[0.72] hover:border-black/[0.12] hover:bg-[#f5f5f7]',
              disabled && !isNavigationChip ? 'cursor-not-allowed opacity-50' : ''
            ].join(' ')}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

export default AssistantPromptChips
