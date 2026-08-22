import logo from '../resources/images/misc/whos-that-polygon-logo.svg'

interface Props {
  onShowArchive: () => void
  onShowRules: () => void
}

export function Header({ onShowArchive, onShowRules }: Props) {
  // No background or bottom border on the header — the eyecatch runs straight
  // up behind the title, which is why it carries its own outlines instead.
  return (
    <header>
      {/* Doubled at lg and up. Pokemon Solid is wide: the title needs ~596px on
          one line at 60px, so the header controls are allowed to wrap on narrow
          screens instead of forcing the title to break. leading-tight, not
          leading-none — this font's descenders overflow a 1.0 line box.

          max-w-5xl, not 4xl: logo + title + buttons need ~870px at lg sizes,
          and inside a 4xl box the nowrap title ran under the buttons. */}
      <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 lg:max-w-5xl lg:flex-nowrap lg:px-8 lg:py-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 lg:gap-6">
          {/* Decorative: the h1 beside it already names the game. */}
          <img src={logo} alt="" aria-hidden className="h-7 w-auto sm:h-9 lg:h-18" />
          {/* data-text feeds the ::before copy that draws the inner blue
              stroke; it must stay in sync with the visible text. aria-hidden on
              that layer isn't needed — generated content isn't exposed. */}
          <h1
            data-text="Who’s That Polygon?"
            className="title-outline whitespace-nowrap font-display text-lg leading-tight text-amber-300 sm:text-2xl lg:text-6xl"
          >
            Who’s That Polygon?
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onShowArchive}
            aria-label="Open archive"
            className="gb-btn flex h-7 items-center justify-center bg-amber-300 px-3 text-xs text-ink hover:bg-amber-200 lg:h-11 lg:px-4 lg:text-sm"
          >
            Archive
          </button>
          <button
            onClick={onShowRules}
            aria-label="How to play"
            className="gb-btn flex h-7 w-7 items-center justify-center bg-amber-300 text-sm text-ink hover:bg-amber-200 lg:h-11 lg:w-11 lg:text-xl"
          >
            <span className="glyph-center">?</span>
          </button>
        </div>
      </div>
    </header>
  )
}
