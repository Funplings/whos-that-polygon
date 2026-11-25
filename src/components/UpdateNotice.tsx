import { useEffect, useRef } from 'react'

/**
 * One-time apology for puzzle #101's wrong answer, shown to returning players
 * on their next visit (see applyPuzzleCorrection in lib/storage). Same frame
 * as StatsModal and BirthdayModal.
 */
export function UpdateNotice({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    closeRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm border-2 border-ink bg-paper px-5 pt-10 pb-6 text-ink shadow-[4px_4px_0_0_var(--color-ink)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center text-lg leading-none hover:text-poke-red"
        >
          <span aria-hidden className="glyph-center">
            ×
          </span>
        </button>
        <h2 id="update-title" className="mb-4 text-sm text-poke-red">
          Update 11/25/26
        </h2>
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            Whoops, we programmed the wrong answer for Puzzle #101! We’ve reset
            it for everyone. Sorry for the confusion.
          </p>
          <p>
            In other news, we have a Twitter account (
            <a
              href="https://x.com/WhosThatPolygon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-poke-red underline hover:text-ink"
            >
              @WhosThatPolygon
            </a>
            ), where you are free to make fun of us for this blunder.
          </p>
        </div>
      </div>
    </div>
  )
}
