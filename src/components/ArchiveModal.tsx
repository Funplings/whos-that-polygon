import { loadResult } from '../lib/storage'
import { MAX_GUESSES, type DayResult, type Puzzle } from '../game/types'

interface Props {
  open: boolean
  puzzles: Puzzle[]
  currentDate: string
  onSelect: (dateISO: string) => void
  onClose: () => void
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function parseLocalDate(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00`)
}

function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7)
}

function monthLabel(key: string): string {
  return parseLocalDate(`${key}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function dayNumber(dateISO: string): number {
  return parseLocalDate(dateISO).getDate()
}

function resultLabel(result: DayResult | null): string {
  if (!result) return 'Unplayed'
  if (result.status === 'won') return `Solved ${result.guesses.length}/${MAX_GUESSES}`
  if (result.status === 'lost') return `Missed X/${MAX_GUESSES}`
  return `${result.guesses.length}/${MAX_GUESSES} started`
}

function resultShortLabel(result: DayResult | null): string {
  if (!result) return ''
  if (result.status === 'won') return `${result.guesses.length}/${MAX_GUESSES}`
  if (result.status === 'lost') return `X/${MAX_GUESSES}`
  return `${result.guesses.length}/${MAX_GUESSES}`
}

function resultClasses(result: DayResult | null, selected: boolean): string {
  const selectedRing = selected ? 'border-2 border-ink' : 'border border-ink/30'
  if (!result) return `bg-paper text-ink/50 ${selectedRing}`
  if (result.status === 'won') return `bg-emerald-400 text-ink ${selectedRing}`
  if (result.status === 'lost') return `bg-red-400 text-ink ${selectedRing}`
  return `bg-amber-300 text-ink ${selectedRing}`
}

function groupByMonth(puzzles: Puzzle[]): Array<{ key: string; puzzles: Puzzle[] }> {
  const groups = new Map<string, Puzzle[]>()
  for (const puzzle of puzzles) {
    const key = monthKey(puzzle.date)
    groups.set(key, [...(groups.get(key) ?? []), puzzle])
  }
  return Array.from(groups, ([key, monthPuzzles]) => ({ key, puzzles: monthPuzzles }))
    .reverse()
}

export function ArchiveModal({
  open,
  puzzles,
  currentDate,
  onSelect,
  onClose,
}: Props) {
  if (!open) return null

  const months = groupByMonth(puzzles)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-title"
    >
      <div className="gb-frame max-h-full w-full max-w-md overflow-hidden bg-paper text-ink">
        <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-3">
          <h2 id="archive-title" className="text-lg">
            Archive
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close archive"
            className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper text-lg leading-none text-ink hover:bg-ink hover:text-paper"
          >
            <span className="glyph-center">×</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="grid gap-6">
            {months.map(({ key, puzzles: monthPuzzles }) => {
              // The full month renders, not just the days with puzzles: days
              // without one (future dates, and any pre-launch days in the
              // first month) show as inert greyed cells.
              const byDay = new Map(
                monthPuzzles.map((p) => [dayNumber(p.date), p]),
              )
              const firstOfMonth = parseLocalDate(`${key}-01`)
              const leadingBlanks = firstOfMonth.getDay()
              const daysInMonth = new Date(
                firstOfMonth.getFullYear(),
                firstOfMonth.getMonth() + 1,
                0,
              ).getDate()
              return (
                <section key={key} aria-label={monthLabel(key)}>
                  <h3 className="mb-3 text-sm text-ink">
                    {monthLabel(key)}
                  </h3>
                  <div className="mb-1 grid grid-cols-7 gap-1.5">
                    {WEEKDAYS.map((weekday, index) => (
                      <div
                        key={`${weekday}-${index}`}
                        className="text-center text-[0.65rem] text-ink/50"
                      >
                        {weekday}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: leadingBlanks }, (_, index) => (
                      <div key={`blank-${index}`} aria-hidden className="aspect-square" />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const day = dayIndex + 1
                      const puzzle = byDay.get(day)
                      if (!puzzle) {
                        return (
                          <div
                            key={`no-puzzle-${day}`}
                            aria-hidden
                            className="aspect-square min-w-0 border border-ink/20 bg-ink/15 p-1 text-center text-xs text-ink/35"
                          >
                            <span className="block leading-none">{day}</span>
                          </div>
                        )
                      }
                      const result = loadResult(puzzle.date)
                      const selected = puzzle.date === currentDate
                      return (
                        <button
                          key={puzzle.date}
                          type="button"
                          onClick={() => {
                            onSelect(puzzle.date)
                            onClose()
                          }}
                          aria-label={`Puzzle ${puzzle.number}, ${resultLabel(result)}`}
                          title={`#${puzzle.number} · ${resultLabel(result)}`}
                          className={`aspect-square min-w-0 p-1 text-center text-xs transition-transform hover:scale-105 ${resultClasses(
                            result,
                            selected,
                          )}`}
                        >
                          <span className="block leading-none">{dayNumber(puzzle.date)}</span>
                          <span className="mt-1 block text-[0.58rem] leading-none">
                            {resultShortLabel(result)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
