import { useEffect, useRef, useState } from 'react'

/**
 * "Skip guess N?" — the confirmation behind the guess row's Skip button.
 * Same frame as StatsModal and UpdateNotice. Cancel takes focus, so a stray
 * Enter or double-tap can't throw a guess away; Escape and the backdrop
 * cancel too. "Don't show again" only takes effect if the skip is confirmed.
 */
export function SkipConfirm({
  guessNumber,
  last,
  onConfirm,
  onCancel,
}: {
  /** 1-based number of the guess being skipped. */
  guessNumber: number
  /** Skipping the final guess ends the game, so the button says so. */
  last: boolean
  /** Called with whether "Don't show again" was ticked. */
  onConfirm: (dontShowAgain: boolean) => void
  onCancel: () => void
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  })

  useEffect(() => {
    cancelRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancelRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="skip-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm border-2 border-ink bg-paper px-5 pt-6 pb-5 text-ink shadow-[4px_4px_0_0_var(--color-ink)]"
      >
        <h2 id="skip-title" className="text-sm text-poke-red">
          Skip guess {guessNumber}?
        </h2>
        <div className="mt-5 flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="gb-btn flex-1 bg-paper py-2 text-ink hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(dontShowAgain)}
            className="gb-btn flex-1 bg-gold py-2 text-ink hover:bg-amber-300"
          >
            {last ? 'Give up' : 'Skip'}
          </button>
        </div>
        {/* A toggle rather than a native checkbox, so the box is drawn in
            the game's own pixel style. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={dontShowAgain}
          onClick={() => setDontShowAgain((v) => !v)}
          className="mt-4 flex items-center gap-2 text-xs text-ink/70 hover:text-ink"
        >
          <span
            aria-hidden
            className="flex h-4 w-4 shrink-0 items-center justify-center border-2 border-ink bg-white"
          >
            {/* Ticked: a solid ink square inset from the border. */}
            {dontShowAgain && <span className="h-1.5 w-1.5 bg-ink" />}
          </span>
          Don’t show again
        </button>
      </div>
    </div>
  )
}
