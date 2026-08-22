import { useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { PuzzleImage } from './components/PuzzleImage'
import { SearchBar } from './components/SearchBar'
import { GuessRow } from './components/GuessRow'
import { NextPuzzleCountdown } from './components/NextPuzzleCountdown'
import { ResultReveal } from './components/ResultReveal'
import { RulesModal } from './components/RulesModal'
import { ClueProgression } from './components/ClueProgression'
import { ArchiveModal } from './components/ArchiveModal'
import { useGame } from './game/useGame'
import { puzzlesThrough, todayISO } from './game/puzzle'
import { hasSeenRules, markRulesSeen } from './lib/storage'
import type { ClueStage } from './game/types'

function App() {
  const [today] = useState(() => todayISO())
  const [selectedDate, setSelectedDate] = useState(today)
  const game = useGame(selectedDate)
  const archivePuzzles = useMemo(() => puzzlesThrough(today), [today])
  const isTodayPuzzle =
    !game.preview && !game.dateOverride && game.puzzle.date === today
  // Don't interrupt manual testing with the first-visit rules modal.
  const [rulesOpen, setRulesOpen] = useState(() => !game.preview && !hasSeenRules())
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [selectedClueStage, setSelectedClueStage] = useState<ClueStage>(
    game.clueStage,
  )

  useEffect(() => {
    setSelectedClueStage(game.clueStage)
  }, [game.clueStage, game.puzzle.answer])

  function closeRules() {
    markRulesSeen()
    setRulesOpen(false)
  }

  return (
    // The burst behind the puzzle is far larger than this box, and overflow to
    // the right or bottom extends the document's scrollable area — that showed
    // up as sideways scroll and ~320px of dead space under the page. Clipped on
    // both axes here.
    //
    // This doesn't stop the page scrolling: in-flow content makes this box
    // taller rather than overflowing it, so only the absolutely-positioned
    // burst is trimmed. `clip` over `hidden` because hidden establishes a
    // scroll container, which would also force the other axis to auto and put a
    // scroll context around the fixed-position rules modal.
    <div className="eyecatch min-h-screen overflow-clip">
      <Header
        onShowArchive={() => setArchiveOpen(true)}
        onShowRules={() => setRulesOpen(true)}
      />

      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
        {game.preview && (
          <div className="border-2 border-ink bg-amber-300 px-3 py-2 text-center text-xs text-ink">
            Preview mode · testing <strong>{game.puzzle.answer}</strong> · not saved
          </div>
        )}
        {game.dateOverride && (
          <div className="border-2 border-ink bg-sky-300 px-3 py-2 text-center text-xs text-ink">
            Testing <strong>{game.dateOverride}</strong> · puzzle #
            {game.puzzle.number} · not saved
          </div>
        )}
        {game.previewMiss && (
          <div className="border-2 border-ink bg-paper px-3 py-2 text-center text-xs text-red-700">
            No polygon found for “{game.previewMiss}” — showing today’s puzzle instead.
          </div>
        )}

        {/* Preview games aren't scheduled, so a puzzle number and date would be
            meaningless — the amber banner above already labels them. */}
        {!game.preview && (
          <div className="gb-frame mx-auto flex w-full max-w-sm flex-col gap-1 bg-paper px-2 py-1">
            <p className="text-center text-xl text-ink">
              {/* The puzzle's own date, which is the Eastern one it rolls over
                  on — not the viewer's local date. Those differ for most of the
                  world for part of each day, and showing the local one would
                  label the puzzle with a date it doesn't belong to. Parsed
                  without a Z so it lands on local midnight and formats as the
                  intended day rather than slipping back one. */}
              #{game.puzzle.number} ·{' '}
              {new Date(`${game.puzzle.date}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            {isTodayPuzzle && <NextPuzzleCountdown />}
          </div>
        )}

        <PuzzleImage slug={game.puzzle.answer} clueStage={selectedClueStage} />

        <ClueProgression
          unlockedStage={game.clueStage}
          selectedStage={selectedClueStage}
          onSelect={setSelectedClueStage}
        />

        <SearchBar
          disabled={game.status !== 'playing'}
          onSubmit={game.submitGuess}
        />

        <GuessRow guesses={game.guesses} answer={game.puzzle.answer} />

        <ResultReveal
          status={game.status}
          answer={game.puzzle.answer}
          guessCount={game.guesses.length}
          puzzleNumber={game.puzzle.number}
          preview={game.preview}
        />
      </main>

      <RulesModal open={rulesOpen} onClose={closeRules} />
      <ArchiveModal
        open={archiveOpen}
        puzzles={archivePuzzles}
        currentDate={game.puzzle.date}
        onSelect={setSelectedDate}
        onClose={() => setArchiveOpen(false)}
      />
    </div>
  )
}

export default App
