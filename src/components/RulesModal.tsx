interface Props {
  open: boolean
  onClose: () => void
}

export function RulesModal({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-auto rounded-2xl bg-slate-800 p-6 shadow-2xl ring-1 ring-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-amber-300">How to Play</h2>
          <button
            onClick={onClose}
            aria-label="Close rules"
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          <p>
            Guess the Pokémon from its <strong>polygon art</strong> — every
            Pokémon is drawn with just three shapes. You get{' '}
            <strong>three guesses</strong>.
          </p>

          <div>
            <h3 className="mb-1 font-semibold text-slate-100">Clues</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>Guess 1:</strong> silhouette only
              </li>
              <li>
                <strong>Guess 2:</strong> grayscale shapes
              </li>
              <li>
                <strong>Guess 3:</strong> full color
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-1 font-semibold text-slate-100">Tips</h3>
            <ul className="list-inside list-disc space-y-1">
              <li>Not all Pokémon forms are valid answers.</li>
              <li>
                The shape doesn’t always show the whole Pokémon — sometimes
                it’s just the head, and symmetry is sometimes missing.
              </li>
              <li>
                Made in Figma. Three shapes each. That’s the whole methodology.
              </li>
            </ul>
          </div>

          <p className="text-slate-400">
            A new puzzle drops every day at midnight. Good luck!
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-amber-400 py-2.5 font-bold text-slate-900 hover:bg-amber-300"
        >
          Let’s go!
        </button>
      </div>
    </div>
  )
}
