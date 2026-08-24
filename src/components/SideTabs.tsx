import { useMemo, useState } from 'react'
import { POLYGONS } from '../game/polygons'
import { POKEMON, pokemonBySlug } from '../game/pokemon'
import { loadResult } from '../lib/storage'
import type { Puzzle } from '../game/types'
import helpIcon from '../resources/images/assets/Help.svg'
import dexIcon from '../resources/images/assets/Dex.svg'
import calendarIcon from '../resources/images/assets/Calendar.svg'
import numberIcon from '../resources/images/assets/Number.svg'
import hideIcon from '../resources/images/assets/Hide.svg'
import showIcon from '../resources/images/assets/Show.svg'
import exitIcon from '../resources/images/assets/Exit.svg'
import logo from '../resources/images/assets/Logo.svg'

export type PanelView = 'help' | 'dex'

interface Props {
  open: PanelView | null
  onOpen: (view: PanelView | null) => void
  /** Released puzzles, oldest first. */
  puzzles: Puzzle[]
  onSelectDate: (dateISO: string) => void
  /** Pulses the pokeball tab (shake + sparkle) when a result lands in the Dex. */
  notify: boolean
}

/**
 * The left-edge tab drawer. The ? and pokeball tabs are attached to the right
 * edge of a sliding panel: closed, the panel sits off-screen with only the
 * tabs poking out; open, panel and tabs slide right together, so the tabs stay
 * visible (and tappable to close) beside the open drawer — the behaviour in
 * the design mockups.
 */
export function SideTabs({ open, onOpen, puzzles, onSelectDate, notify }: Props) {
  // The drawer keeps showing its last content while sliding shut, instead of
  // flashing empty mid-animation.
  const [lastView, setLastView] = useState<PanelView>('help')
  const view = open ?? lastView

  function toggle(target: PanelView) {
    if (open === target) {
      onOpen(null)
    } else {
      setLastView(target)
      onOpen(target)
    }
  }

  return (
    <>
      {/* Dimmed backdrop; tapping it closes the drawer. */}
      <div
        aria-hidden
        onClick={() => onOpen(null)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`pointer-events-none fixed inset-y-0 left-0 z-50 flex transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-[calc(100%-3rem)]'
        }`}
      >
        {/* z-10 keeps the panel above the edge tabs' hidden extensions, so
            they slide out from underneath it rather than lying on top. */}
        <div className="pointer-events-auto relative z-10 h-full w-[min(85vw,24rem)]">
          {view === 'help' ? (
            <HelpPanel onClose={() => onOpen(null)} />
          ) : (
            <DexPanel
              puzzles={puzzles}
              onSelectDate={(d) => {
                onSelectDate(d)
                onOpen(null)
              }}
              onClose={() => onOpen(null)}
            />
          )}
        </div>
        {/* The edge tabs, riding on the panel's right side. */}
        <div className="pointer-events-auto flex w-12 flex-col gap-2 pt-16">
          <button
            type="button"
            onClick={() => toggle('help')}
            aria-label="How to play"
            aria-expanded={open === 'help'}
            // A third of the tab hides under the panel/screen edge (w-16 with
            // -ml-4), so the hover slide reveals more tab instead of opening
            // a gap behind it — it reads as pulled out, not detached. pl-4
            // recentres the icon in the visible portion.
            className="flex h-14 w-16 -ml-4 items-center justify-center rounded-r-2xl bg-white pl-4 shadow-[3px_3px_0_0_var(--color-ink)] transition-transform duration-100 hover:translate-x-1 active:translate-x-0"
          >
            <img src={helpIcon} alt="" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => toggle('dex')}
            aria-label="Open the Dex"
            aria-expanded={open === 'dex'}
            className="relative flex h-14 w-16 -ml-4 items-center justify-center rounded-r-2xl bg-coral pl-4 shadow-[3px_3px_0_0_var(--color-ink)] transition-transform duration-100 hover:translate-x-1 active:translate-x-0"
          >
            <img
              src={dexIcon}
              alt=""
              className={`h-6 w-6 ${notify ? 'dex-shake' : ''}`}
            />
            {notify && (
              <span
                aria-hidden
                className="sparkle-pop absolute -top-1.5 -right-1.5 text-lg text-gold"
              >
                ✦
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-paper p-5 pt-12 text-ink">
      <img
        src={logo}
        alt="Who’s That Polygon?"
        className="logo-outline mx-auto h-24 w-auto"
      />
      <h2 className="mt-4 text-lg">How to Play</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed">
        <p>Who's that Pokemon? You have three tries to figure it out!</p>
        <p>
          Every Pokemon is made with exactly three shapes. After every guess,
          you’ll get more detail (silhouette, black-and-white, full color). Most
          alternate forms are included! (Regional, Mega, Gigantamax, and more.)
        </p>
        <p>There is a new mystery Pokemon every day. Good luck and have fun!</p>
      </div>
      <button
        onClick={onClose}
        className="gb-btn mt-6 w-full bg-gold py-2.5 text-ink hover:bg-amber-300"
      >
        ▶ Let’s go!
      </button>
      {/* mt-auto pins the credits to the drawer's bottom edge. */}
      <footer className="mt-auto pt-6 text-right text-[0.6rem] leading-relaxed text-ink/60">
        inspired by{' '}
        <a
          href="https://www.youtube.com/watch?v=T-JPM3ieKv4"
          target="_blank"
          rel="noopener noreferrer"
          className="text-maroon underline hover:text-ink"
        >
          this video
        </a>{' '}
        and{' '}
        <a
          href="https://x.com/kishinates/status/2054958277788885329?s=20"
          target="_blank"
          rel="noopener noreferrer"
          className="text-maroon underline hover:text-ink"
        >
          this post
        </a>
      </footer>
    </div>
  )
}

type DexView = 'calendar' | 'number'

/**
 * The small always-on label along a Dex box's bottom edge: the box's date in
 * calendar view, the species' dex number in number view. It sits below the
 * box on the drawer background, so the art never shares space with it.
 */
function CellLabel({
  kind,
  children,
}: {
  kind: 'date' | 'number'
  children: React.ReactNode
}) {
  return (
    <span
      aria-hidden
      // Sized against the cell (a size container), as large as the content
      // fits the box width, capped at 0.7rem — the pixel font is too wide for
      // one fixed size to survive every panel width without colliding with
      // the neighbouring columns. M/D/YY dates (up to 7 chars) need a tighter
      // curve than dex numbers (up to 5).
      className={`mt-1 block text-center leading-none whitespace-nowrap text-maroon ${
        kind === 'date'
          ? 'text-[min(0.7rem,10cqw)]'
          : 'text-[min(0.7rem,19cqw)]'
      }`}
    >
      {children}
    </span>
  )
}

interface DexCell {
  /** null for a dex number with no polygon asset yet — a placeholder slot. */
  slug: string | null
  /** The released puzzle for this slug, if any — unreleased cells have none. */
  puzzle: Puzzle | null
  /** National Dex number, for the placeholder slots' captions and keys. */
  id: number | null
}

/** Highest National Dex number in the data — the dex view runs 1..this. */
const MAX_DEX_ID = POKEMON.reduce((max, p) => Math.max(max, p.id), 0)

function DexPanel({
  puzzles,
  onSelectDate,
  onClose,
}: {
  puzzles: Puzzle[]
  onSelectDate: (dateISO: string) => void
  onClose: () => void
}) {
  const [view, setView] = useState<DexView>('calendar')
  const [hideEmpty, setHideEmpty] = useState(false)

  // A slug can in principle recur in the schedule; the Dex box points at its
  // first appearance.
  const releasedBySlug = useMemo(() => {
    const map = new Map<string, Puzzle>()
    for (const p of puzzles) {
      if (!map.has(p.answer)) map.set(p.answer, p)
    }
    return map
  }, [puzzles])

  const cells: DexCell[] = useMemo(() => {
    if (view === 'calendar') {
      // Released puzzles in schedule order — no unreleased tail, so the user
      // never scrolls through hundreds of empty boxes after today.
      return puzzles.map((p) => ({
        slug: p.answer,
        puzzle: p,
        id: pokemonBySlug(p.answer)?.id ?? null,
      }))
    }
    // Dex-number view: one slot per National Dex number, 1..MAX_DEX_ID.
    // Numbers with polygon art get a box per form (a species can have several
    // — megas, regionals); numbers with no asset yet get a blank placeholder.
    const formsById = new Map<number, string[]>()
    for (const slug of Object.keys(POLYGONS)) {
      const id = pokemonBySlug(slug)?.id
      if (!id) continue
      formsById.set(id, [...(formsById.get(id) ?? []), slug])
    }
    const out: DexCell[] = []
    for (let id = 1; id <= MAX_DEX_ID; id += 1) {
      const forms = formsById.get(id)?.sort()
      if (!forms) {
        out.push({ slug: null, puzzle: null, id })
        continue
      }
      for (const slug of forms) {
        out.push({ slug, puzzle: releasedBySlug.get(slug) ?? null, id })
      }
    }
    return out
  }, [view, puzzles, releasedBySlug])

  // Hiding empties is a dex-number-view concern only — the calendar list is
  // short and chronological, so it always shows everything. "Empty" means
  // never finished: both won and lost days count as filled.
  const shown =
    view === 'number' && hideEmpty
      ? cells.filter((c) => {
          const status = c.puzzle && loadResult(c.puzzle.date)?.status
          return status === 'won' || status === 'lost'
        })
      : cells

  // Folder tabs rise slightly on hover and sit back down while pressed. Like
  // the edge tabs, their bottom 12px (h-14 with -mb-3) hides under the grid
  // area, so the rise reveals more tab instead of opening a gap — they pull
  // out of the drawer rather than detaching from it. pb-3 keeps the icon
  // centred in the visible portion.
  const tabBase =
    'flex h-14 w-13 -mb-3 items-center justify-center rounded-t-xl pb-3 shadow-[3px_3px_0_0_var(--color-ink)] transition-[background-color,transform] duration-100 hover:-translate-y-1 active:translate-y-0'

  return (
    <div
      className="relative flex h-full flex-col bg-coral"
      role="dialog"
      aria-label="Dex"
    >
      {/* Folder-tab toolbar: the selected sort's tab shares the grid's colour
          so it reads as the open drawer of the two. */}
      <div className="flex items-end gap-1.5 bg-black/25 px-3 pt-12">
        <button
          type="button"
          onClick={() => setView('calendar')}
          aria-label="Sort by calendar date"
          aria-pressed={view === 'calendar'}
          className={`${tabBase} ${view === 'calendar' ? 'bg-coral' : 'bg-paper'}`}
        >
          {/* Thin ink outline via four 1px drop-shadows: the calendar glyph is
              partly white and vanished into the unselected paper tab. */}
          <img
            src={calendarIcon}
            alt=""
            className="h-5 [filter:drop-shadow(1px_0_0_var(--color-ink))_drop-shadow(-1px_0_0_var(--color-ink))_drop-shadow(0_1px_0_var(--color-ink))_drop-shadow(0_-1px_0_var(--color-ink))]"
          />
        </button>
        <button
          type="button"
          onClick={() => setView('number')}
          aria-label="Sort by Pokédex number"
          aria-pressed={view === 'number'}
          className={`${tabBase} ${view === 'number' ? 'bg-coral' : 'bg-paper'}`}
        >
          <img src={numberIcon} alt="" className="h-5" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the Dex"
          className={`${tabBase} bg-maroon`}
        >
          <img src={exitIcon} alt="" className="h-4" />
        </button>
      </div>

      {/* Own bg + z-10 so the toolbar tabs' hidden extensions sit underneath
          this area and emerge from it on hover. */}
      <div className="relative z-10 grid flex-1 grid-cols-4 content-start gap-2 overflow-y-auto bg-coral p-3">
        {shown.map(({ slug, puzzle, id }) => {
          // Label content follows the sort: the box's calendar date in
          // calendar view, the species' National Dex number in dex view.
          const dexLabel = `#${id ?? '?'}`
          if (!slug) {
            // A dex number with no polygon asset yet: a faint empty well —
            // present so the numbering has no gaps, but clearly hollow next
            // to the filled and unreleased boxes.
            return (
              <div key={`empty-${id}`} aria-hidden className="@container">
                <div className="aspect-[287/278] rounded-2xl bg-black/10" />
                <CellLabel kind="number">{dexLabel}</CellLabel>
              </div>
            )
          }
          if (!puzzle) {
            // Unreleased: dark and inert, but still stamped with its dex
            // number (its position in the sorted grid implies it anyway).
            return (
              <div key={slug} aria-hidden className="@container">
                <div className="aspect-[287/278] rounded-2xl bg-maroon shadow-[2px_2px_0_0_rgba(32,32,32,0.25)]" />
                <CellLabel kind="number">{dexLabel}</CellLabel>
              </div>
            )
          }
          const result = loadResult(puzzle.date)
          // Completed either way — the answer was revealed, so the Dex shows
          // it in colour; the corner mark records whether it was earned.
          const won = result?.status === 'won'
          const completed = won || result?.status === 'lost'
          const name = pokemonBySlug(slug)?.displayName ?? slug
          // The puzzle's own ET date, parsed to local midnight so it formats
          // as the intended day rather than slipping back one. Pinned to
          // en-US numeric M/D/YY per the design call, not the viewer locale —
          // the 2-digit year is what lets it fit the box at a legible size.
          const dateLabel = new Date(
            `${puzzle.date}T00:00:00`,
          ).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit',
          })
          return (
            <button
              key={slug}
              type="button"
              onClick={() => onSelectDate(puzzle.date)}
              aria-label={
                completed
                  ? `${name}, ${won ? 'solved' : 'missed'} — open puzzle #${puzzle.number} (${dateLabel})`
                  : `Unsolved puzzle #${puzzle.number} (${dateLabel})`
              }
              // Box + caption as one column, all inside the button so the
              // caption is part of the tap target. Slight drop shadow lifts
              // the box off the drawer; hover feedback is a brightness pop
              // rather than a size change.
              className="@container block w-full transition-[filter,transform] duration-100 hover:brightness-110 active:scale-95"
            >
              <span className="relative block aspect-[287/278] rounded-2xl bg-paper p-1.5 shadow-[2px_2px_0_0_rgba(32,32,32,0.25)]">
                {/* The polygon art is the box's content: full colour once
                    completed, black silhouette (the same treatment as the
                    game's first clue stage) while unsolved. */}
                <img
                  src={POLYGONS[slug]}
                  alt=""
                  loading="lazy"
                  style={completed ? undefined : { filter: 'brightness(0)' }}
                  className="h-full w-full object-contain"
                />
                {completed && (
                  <span
                    aria-hidden
                    className={`absolute top-1 right-1.5 leading-none text-[min(0.8rem,15cqw)] ${
                      won ? 'text-emerald-600' : 'text-poke-red'
                    }`}
                  >
                    {won ? '✓' : '×'}
                  </span>
                )}
              </span>
              <CellLabel kind={view === 'calendar' ? 'date' : 'number'}>
                {view === 'calendar' ? dateLabel : dexLabel}
              </CellLabel>
            </button>
          )
        })}
      </div>

      {/* Hide/show-empties toggle: floats over the bottom of the drawer, and
          only in dex-number view — that's the only view with empty boxes
          worth hiding. z-20 keeps it above the grid layer. */}
      {view === 'number' && (
        <button
          type="button"
          onClick={() => setHideEmpty((h) => !h)}
          aria-label={hideEmpty ? 'Show empty boxes' : 'Hide empty boxes'}
          aria-pressed={hideEmpty}
          className="absolute right-3 bottom-3 z-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-paper shadow-[3px_3px_0_0_var(--color-ink)] transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0"
        >
          <img src={hideEmpty ? showIcon : hideIcon} alt="" className="h-5" />
        </button>
      )}
    </div>
  )
}
