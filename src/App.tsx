import { useState } from 'react'
import { Header } from './components/Header'
import { PuzzleImage } from './components/PuzzleImage'
import { SearchBar } from './components/SearchBar'
import { GuessRow } from './components/GuessRow'
import { ResultReveal } from './components/ResultReveal'
import { RulesModal } from './components/RulesModal'
import { useGame } from './game/useGame'
import { hasSeenRules, markRulesSeen } from './lib/storage'

function App() {
  const game = useGame()
  // Don't interrupt manual testing with the first-visit rules modal.
  const [rulesOpen, setRulesOpen] = useState(() => !game.preview && !hasSeenRules())

  function closeRules() {
    markRulesSeen()
    setRulesOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header
        puzzleNumber={game.puzzle.number}
        preview={game.preview}
        onShowRules={() => setRulesOpen(true)}
      />

      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
        {game.preview && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-300">
            Preview mode · testing <strong>{game.puzzle.answer}</strong> · not saved
          </div>
        )}
        {game.previewMiss && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
            No polygon found for “{game.previewMiss}” — showing today’s puzzle instead.
          </div>
        )}

        <PuzzleImage slug={game.puzzle.answer} clueStage={game.clueStage} />

        {game.status === 'playing' && (
          <p className="text-center text-sm text-slate-400">
            {game.guessesLeft} {game.guessesLeft === 1 ? 'guess' : 'guesses'} remaining
          </p>
        )}

        <SearchBar
          disabled={game.status !== 'playing'}
          onSubmit={game.submitGuess}
        />

        <GuessRow guesses={game.guesses} answer={game.puzzle.answer} />

        <ResultReveal
          status={game.status}
          answer={game.puzzle.answer}
          guessCount={game.guesses.length}
        />
      </main>

      <RulesModal open={rulesOpen} onClose={closeRules} />
    </div>
  )
}

export default App
