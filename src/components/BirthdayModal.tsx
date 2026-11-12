import { useEffect, useRef } from 'react'

/**
 * What the Stats button opens on the birthday level, in place of the global
 * results (which the level never reports to). Same frame as StatsModal.
 */
export function BirthdayModal({ onClose }: { onClose: () => void }) {
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
        aria-labelledby="birthday-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm border-2 border-ink bg-paper px-5 py-10 text-ink shadow-[4px_4px_0_0_var(--color-ink)]"
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
        <h2
          id="birthday-title"
          className="text-center text-lg leading-relaxed text-poke-red"
        >
          Happy Birthday, Alex!
        </h2>
      </div>
    </div>
  )
}
