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
        className="gb-frame max-h-[85vh] w-full max-w-md overflow-auto bg-paper p-3 text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg">How to Play</h2>
          <button
            onClick={onClose}
            aria-label="Close rules"
            className="px-2 py-1 text-ink/60 hover:bg-ink hover:text-paper"
          >
            <span className="glyph-center">×</span>
          </button>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-ink">
          <p>
            Who's that Pokemon? You have three tries to figure it out!
          </p>
          <p>
            Every Pokemon is made with exactly three shapes. After every guess, you’ll get more detail (silhouette, black-and-white, full color). Most alternate forms are included! (Regional, Mega, Gigantamax, and more.)
          </p>
          <p>
            There is a new mystery Pokemon every day. Good luck and have fun!
          </p>
        </div>

        <button
          onClick={onClose}
          className="gb-btn mt-5 w-full bg-amber-300 py-2.5 text-ink hover:bg-amber-200"
        >
          ▶ Let’s go!
        </button>
      </div>
    </div>
  )
}
