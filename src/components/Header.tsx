import logo from '../resources/images/misc/whos-that-polygon-logo.svg'

interface Props {
  onShowRules: () => void
}

export function Header({ onShowRules }: Props) {
  // No background or bottom border on the header — the eyecatch runs straight
  // up behind the title, which is why it carries its own outlines instead.
  return (
    <header>
      {/* Doubled at lg and up. Pokemon Solid is wide: the title needs ~596px on
          one line at 60px, so with the logo and rules button beside it the full
          size only fits from about 1024px. Below that it steps back down rather
          than wrapping. leading-tight, not leading-none — this font's descenders
          overflow a 1.0 line box. */}
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 lg:max-w-4xl lg:px-8 lg:py-6">
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Decorative: the h1 beside it already names the game. */}
          <img src={logo} alt="" aria-hidden className="h-9 w-auto lg:h-18" />
          {/* data-text feeds the ::before copy that draws the inner blue
              stroke; it must stay in sync with the visible text. aria-hidden on
              that layer isn't needed — generated content isn't exposed. */}
          <h1
            data-text="Who’s That Polygon?"
            className="title-outline font-display text-2xl leading-tight text-amber-300 lg:text-6xl"
          >
            Who’s That Polygon?
          </h1>
        </div>
        <button
          onClick={onShowRules}
          aria-label="How to play"
          // bg-slate-800 to match the search input's fill, so the two read as
          // the same UI surface against the eyecatch.
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-100 hover:bg-slate-700 lg:h-11 lg:w-11 lg:text-xl"
        >
          ?
        </button>
      </div>
    </header>
  )
}
