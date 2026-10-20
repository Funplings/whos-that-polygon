import { useEffect, useMemo, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { PuzzleImage } from "./components/PuzzleImage";
import { SearchBar } from "./components/SearchBar";
import { GuessRow } from "./components/GuessRow";
import { SolutionBox, SwapButton } from "./components/SolutionBox";
import { StatsModal } from "./components/StatsModal";
import { ShareBar } from "./components/ShareBar";
import { SideTabs, type PanelView } from "./components/SideTabs";
import { ClueProgression } from "./components/ClueProgression";
import { GenHint } from "./components/GenHint";
import { useGame } from "./game/useGame";
import { isCorrectGuess, pokemonBySlug } from "./game/pokemon";
import { msUntilNextPuzzle, puzzlesThrough, todayISO } from "./game/puzzle";
import { hasSeenRules, loadResult, markRulesSeen } from "./lib/storage";
import { useGlobalResults } from "./lib/globalResults";
import { playLossBuzzer, playWinJingle } from "./lib/sfx";
import logo from "./resources/images/assets/Logo.svg";
import type { ClueStage } from "./game/types";

// ?rays=parallel swaps the backdrop for the strictly-parallel comparison
// variant — a design A/B, not a player-facing switch.
const PARALLEL_RAYS =
  new URLSearchParams(window.location.search).get("rays") === "parallel";

function App() {
  const [today] = useState(() => todayISO());
  const [selectedDate, setSelectedDate] = useState(today);
  // Tapping an empty guess slot focuses the answer bar (see GuessRow).
  const searchInputRef = useRef<HTMLInputElement>(null);
  const game = useGame(selectedDate);
  const archivePuzzles = useMemo(() => puzzlesThrough(today), [today]);
  const isTodayPuzzle =
    !game.preview && !game.dateOverride && game.puzzle.date === today;
  const ended = game.status !== "playing";

  // Don't interrupt manual testing with the first-visit rules panel.
  const [panel, setPanel] = useState<PanelView | null>(() =>
    !game.preview && !hasSeenRules() ? "help" : null,
  );
  // The selected clue stage and guesses/solution toggle are DERIVED from
  // keyed picks rather than synced by effects: an effect-based reset painted
  // one frame of the new puzzle with the previous puzzle's view before
  // correcting itself, which re-ran the stage cross-fade on every Dex
  // navigation. A pick only applies while its key matches; any change of
  // puzzle (or newly unlocked stage) falls back to the default in the same
  // render.
  const puzzleKey = game.puzzle.date + game.puzzle.answer;
  const stageKey = puzzleKey + game.clueStage;
  const [stagePick, setStagePick] = useState<{
    key: string;
    stage: ClueStage;
  } | null>(null);
  const selectedClueStage =
    stagePick?.key === stageKey ? stagePick.stage : game.clueStage;
  // The finished game leads with the solution; the corner button swaps the
  // guess list back in (and vice versa).
  const [solutionPick, setSolutionPick] = useState<{
    key: string;
    show: boolean;
  } | null>(null);
  const showSolution =
    solutionPick?.key === puzzleKey ? solutionPick.show : true;
  // The Stats popup, opened from beside the share button. Keyed like the
  // picks above so switching days from the Dex never leaves it open.
  const [statsFor, setStatsFor] = useState<string | null>(null);
  const statsOpen = statsFor === puzzleKey;

  // Finished games report to the global tally and load it. Date probes
  // (/MM-DD-YYYY) can look but don't submit — they're not real plays.
  const finishedGame =
    ended && !game.preview
      ? {
          guesses: game.guesses.length,
          won: game.status === "won",
          wrong: game.guesses.filter(
            (g) => !isCorrectGuess(g, game.puzzle.answer),
          ),
        }
      : null;
  const globalResults = useGlobalResults(
    game.puzzle.date,
    finishedGame,
    !game.dateOverride,
  );

  // Pokémon the player has caught on earlier days, marked with a pokeball in
  // the guess dropdown. Read fresh each render rather than memoised — it's a
  // few dozen localStorage reads, and App only re-renders on game events, so
  // a win always shows up on the next day's dropdown.
  const caughtSlugs = new Set<string>();
  for (const p of archivePuzzles) {
    if (loadResult(p.date)?.status === "won") caughtSlugs.add(p.answer);
  }
  // One shake+sparkle on the pokeball tab, a second after the puzzle resolves,
  // to say the result landed in the Dex. Delayed so the player reads the
  // solution first; only fires on a transition actually played this session.
  const [dexNotify, setDexNotify] = useState(false);
  // Status is tracked per puzzle: without the key, opening an already-finished
  // day from the Dex reads as a playing→won "transition" and would ring the
  // jingle and shake the pokeball just for browsing.
  const prevResult = useRef({
    key: game.puzzle.date + game.puzzle.answer,
    status: game.status,
  });

  useEffect(() => {
    const key = game.puzzle.date + game.puzzle.answer;
    const was = prevResult.current;
    prevResult.current = { key, status: game.status };
    const resolvedThisSession =
      ended && was.key === key && was.status === "playing";
    if (!resolvedThisSession) return;

    // The result jingle — square-wave chiptune, see lib/sfx. Previews get the
    // sound too (it's feedback on the guess), but not the Dex notification.
    if (game.status === "won") playWinJingle();
    else playLossBuzzer();

    if (game.preview) return;
    const showTimer = setTimeout(() => setDexNotify(true), 1000);
    const hideTimer = setTimeout(() => setDexNotify(false), 3500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [ended, game.status, game.preview, game.puzzle.date, game.puzzle.answer]);

  // The puzzle is resolved once when the app mounts, so past midnight the page
  // would keep serving yesterday's polygon — and save guesses against
  // yesterday's date. Reloading swaps in the new one. Progress is persisted
  // per date, so nothing in flight is lost. (The visible countdown is gone by
  // design; the rollover behaviour stays.)
  useEffect(() => {
    if (!isTodayPuzzle) return;
    const id = setInterval(() => {
      if (msUntilNextPuzzle() === 0) window.location.reload();
    }, 1000);
    return () => clearInterval(id);
  }, [isTodayPuzzle]);

  function closePanel(next: PanelView | null) {
    if (panel === "help" && next === null) markRulesSeen();
    setPanel(next);
  }

  // The clue-stage toggle only appears once there is something to toggle —
  // after the first guess unlocks a second view.
  const showClueToggle = game.guesses.length > 0 || ended;
  const gen = pokemonBySlug(game.puzzle.answer)?.gen;

  return (
    // One screen, no scrolling: top bar, starburst filling the middle, and the
    // controls locked to the bottom. overflow-clip (not hidden) so no scroll
    // container forms around the fixed-position drawer.
    <div
      className={`eyecatch flex h-dvh flex-col overflow-clip ${
        PARALLEL_RAYS ? "eyecatch-parallel" : ""
      }`}
    >
      {/* The logo anchors the top-left corner; the edge tabs start 64px down,
          so the corner is its alone. */}
      <header className="flex items-start justify-between gap-3 px-3 pt-3">
        <img
          src={logo}
          alt="Who’s That Polygon?"
          className="logo-outline h-10 w-auto lg:h-12"
        />
        {/* The puzzle's own date, which is the Eastern one it rolls over on —
            not the viewer's local date. Those differ for most of the world for
            part of each day, and showing the local one would label the puzzle
            with a date it doesn't belong to. Parsed without a Z so it lands on
            local midnight and formats as the intended day. */}
        {!game.preview && (
          <div className="gb-frame gb-frame-sm bg-paper px-2 text-sm text-ink">
            #{game.puzzle.number} ·{" "}
            {new Date(`${game.puzzle.date}T00:00:00`).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric", year: "numeric" },
            )}
          </div>
        )}
      </header>

      {/* Testing banners, floated so they never disturb the fixed layout. */}
      {(game.preview || game.dateOverride || game.previewMiss) && (
        <div className="absolute inset-x-4 top-16 z-30 flex flex-col items-center gap-1">
          {game.preview && (
            <div className="border-2 border-ink bg-gold px-3 py-1 text-center text-xs text-ink">
              Preview mode · testing <strong>{game.puzzle.answer}</strong> · not
              saved
            </div>
          )}
          {game.dateOverride && (
            <div className="border-2 border-ink bg-sky-300 px-3 py-1 text-center text-xs text-ink">
              Testing <strong>{game.dateOverride}</strong> · puzzle #
              {game.puzzle.number} · not saved
            </div>
          )}
          {game.previewMiss && (
            <div className="border-2 border-ink bg-paper px-3 py-1 text-center text-xs text-poke-red">
              No polygon found for “{game.previewMiss}” — showing today’s puzzle
              instead.
            </div>
          )}
        </div>
      )}

      <main className="min-h-0 flex-1 px-2">
        <PuzzleImage slug={game.puzzle.answer} clueStage={selectedClueStage} />
      </main>

      {/* The bottom stack never changes height: the clue toggle's slot is
          reserved while hidden (visibility, not display, so it still takes
          space but leaves the focus order), the guesses/solution views match
          at 8.5rem, and the input/share slot is fixed at h-16 — so the
          starburst above never resizes mid-game. */}
      {/* pb reserves the one-line footer strip. gap-3 leaves the swap button
          that pokes above the guesses/solution box clear of the toggle. */}
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3 px-4 pb-7">
        {/* Keyed by puzzle so it starts hidden again on every puzzle (or
            revealed, if it was opened earlier that day). */}
        <div className={gen ? "" : "invisible"}>
          <GenHint
            key={puzzleKey}
            gen={gen ?? 1}
            initiallyShown={game.hintUsed}
            onReveal={game.markHintUsed}
          />
        </div>

        <div className={showClueToggle ? "" : "invisible"}>
          <ClueProgression
            unlockedStage={game.clueStage}
            selectedStage={selectedClueStage}
            onSelect={(stage) => setStagePick({ key: stageKey, stage })}
          />
        </div>

        {ended && showSolution ? (
          <SolutionBox
            status={game.status}
            answer={game.puzzle.answer}
            guessCount={game.guesses.length}
            onSwap={() => setSolutionPick({ key: puzzleKey, show: false })}
          />
        ) : (
          <div className="relative">
            <GuessRow
              guesses={game.guesses}
              answer={game.puzzle.answer}
              onEmptySlotClick={
                ended ? undefined : () => searchInputRef.current?.focus()
              }
            />
            {ended && (
              <SwapButton
                onClick={() => setSolutionPick({ key: puzzleKey, show: true })}
                label="Show the solution"
                position="-top-2 -right-2"
              />
            )}
          </div>
        )}

        <div className="flex h-16 flex-col justify-center">
          {ended && !game.preview ? (
            <ShareBar
              status={game.status}
              guessCount={game.guesses.length}
              puzzleNumber={game.puzzle.number}
              hintUsed={game.hintUsed}
              onStats={() => setStatsFor(puzzleKey)}
            />
          ) : (
            <SearchBar
              disabled={ended}
              onSubmit={game.submitGuess}
              inputRef={searchInputRef}
              caught={caughtSlugs}
            />
          )}
        </div>
      </div>

      {/* Credits, tucked into the bottom stack's padding strip so they never
          collide with the answer bar above. (The legal line lives in the
          help drawer, off the game view.) */}
      <footer className="pointer-events-none absolute right-2 bottom-2 left-2 z-10 text-right text-[0.6rem] leading-none text-white/75">
        <p>
          website by{" "}
          <a
            href="https://funplings.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto text-gold underline hover:text-amber-200"
          >
            funplings
          </a>
          , puzzles by{" "}
          <a
            href="https://bsky.app/profile/cryptanark.bsky.social"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto text-gold underline hover:text-amber-200"
          >
            cryptanark
          </a>
        </p>
      </footer>

      {statsOpen && ended && (
        <StatsModal
          results={globalResults}
          mine={
            game.status === "won" ? (game.guesses.length as 1 | 2 | 3) : "X"
          }
          puzzleNumber={game.puzzle.number}
          onClose={() => setStatsFor(null)}
        />
      )}

      <SideTabs
        open={panel}
        onOpen={closePanel}
        puzzles={archivePuzzles}
        onSelectDate={setSelectedDate}
        notify={dexNotify}
      />

      {/* Vercel Web Analytics — got dropped in the big App rewrite once
          already; renders nothing. */}
      <Analytics />
    </div>
  );
}

export default App;
