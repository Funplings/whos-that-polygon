interface Props {
  puzzleNumber: number
  preview?: boolean
  onShowRules: () => void
}

export function Header({ puzzleNumber, preview, onShowRules }: Props) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-amber-300">
            Who’s That Polygon?
          </h1>
          <p className="text-xs text-slate-500">
            {preview
              ? 'Preview'
              : `#${puzzleNumber} · ${new Date().toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}`}
          </p>
        </div>
        <button
          onClick={onShowRules}
          aria-label="How to play"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          ?
        </button>
      </div>
    </header>
  )
}
