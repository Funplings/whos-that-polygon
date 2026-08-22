import type { ClueStage } from '../game/types'

interface Props {
  unlockedStage: ClueStage
  selectedStage: ClueStage
  onSelect: (stage: ClueStage) => void
}

const STAGES: Array<{ stage: ClueStage; label: string }> = [
  { stage: 0, label: 'Silhouette' },
  { stage: 1, label: 'B&W' },
  { stage: 2, label: 'Color' },
]

export function ClueProgression({
  unlockedStage,
  selectedStage,
  onSelect,
}: Props) {
  return (
    <div
      className="mx-auto grid h-11 w-full max-w-sm grid-cols-3 border-2 border-ink bg-paper p-1"
      role="group"
      aria-label="Puzzle view"
    >
      {STAGES.map(({ stage, label }) => {
        const unlocked = stage <= unlockedStage
        const selected = stage === selectedStage

        return (
          <button
            key={stage}
            type="button"
            disabled={!unlocked}
            aria-pressed={selected}
            aria-label={`${label} view${unlocked ? '' : ' locked'}`}
            onClick={() => onSelect(stage)}
            className={`min-w-0 px-2 text-[0.65rem] transition-colors sm:text-xs ${
              // Selected reads as Game Boy inverse video: ink box, paper text.
              selected
                ? 'bg-ink text-paper'
                : unlocked
                  ? 'text-ink hover:bg-ink/10'
                  : 'cursor-not-allowed text-ink/35'
            }`}
          >
            <span className="block truncate">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
