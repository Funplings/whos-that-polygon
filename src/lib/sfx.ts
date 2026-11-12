/**
 * Chiptune result jingles, synthesised with the Web Audio API rather than
 * shipped as files — square-wave oscillators are literally the Game Boy sound
 * chip's voice, so a few scheduled notes get the authentic 8-bit timbre for
 * free and stay in the repo as readable note data.
 */

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    // Play is always triggered downstream of a guess (a user gesture), so a
    // suspended context is allowed to resume.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    // No Web Audio (ancient browser, some webviews): the game just stays mute.
    return null
  }
}

interface Note {
  /** Hz */
  freq: number
  /** Seconds after the jingle starts */
  at: number
  /** Seconds */
  dur: number
}

function play(
  notes: Note[],
  gain: number,
  type: OscillatorType = 'square',
): void {
  const audio = audioCtx()
  if (!audio) return
  const t0 = audio.currentTime
  for (const { freq, at, dur } of notes) {
    const osc = audio.createOscillator()
    const env = audio.createGain()
    osc.type = type
    osc.frequency.value = freq
    // Hard attack, exponential tail: the classic chip envelope. The ramp ends
    // above zero because exponentialRamp cannot reach it; the gain node is
    // short-lived so the residual is inaudible.
    env.gain.setValueAtTime(0, t0 + at)
    env.gain.linearRampToValueAtTime(gain, t0 + at + 0.005)
    env.gain.exponentialRampToValueAtTime(0.001, t0 + at + dur)
    osc.connect(env)
    env.connect(audio.destination)
    osc.start(t0 + at)
    osc.stop(t0 + at + dur + 0.02)
  }
}

/** Rising C-major arpeggio — the level-up fanfare. */
export function playWinJingle(): void {
  play(
    [
      { freq: 523.25, at: 0, dur: 0.09 }, // C5
      { freq: 659.25, at: 0.09, dur: 0.09 }, // E5
      { freq: 783.99, at: 0.18, dur: 0.09 }, // G5
      { freq: 1046.5, at: 0.27, dur: 0.3 }, // C6, held
    ],
    0.07,
  )
}

/** Two low descending tones — the wrong-answer buzzer. */
export function playLossBuzzer(): void {
  play(
    [
      { freq: 196, at: 0, dur: 0.16 }, // G3
      { freq: 130.81, at: 0.17, dur: 0.32 }, // C3
    ],
    0.09,
  )
}

// "Happy Birthday to You" (public domain), in C, 3/4. Each entry is
// [Hz, start, length], start and length in beats; the pickup starts at 0.
const G2 = 98, F2 = 87.31, C3 = 130.81
const G4 = 392, A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33
const E5 = 659.25, F5 = 698.46, G5 = 783.99
const MELODY: [number, number, number][] = [
  [G4, 0, 0.75], [G4, 0.75, 0.25], // Hap-py
  [A4, 1, 1], [G4, 2, 1], [C5, 3, 1], [B4, 4, 2], // birth-day to you
  [G4, 6, 0.75], [G4, 6.75, 0.25], // hap-py
  [A4, 7, 1], [G4, 8, 1], [D5, 9, 1], [C5, 10, 2], // birth-day to you
  [G4, 12, 0.75], [G4, 12.75, 0.25], // hap-py
  [G5, 13, 1], [E5, 14, 1], [C5, 15, 1], [B4, 16, 1], [A4, 17, 2], // birth-day dear A-lex
  [F5, 19, 0.75], [F5, 19.75, 0.25], // hap-py
  [E5, 20, 1], [C5, 21, 1], [D5, 22, 1], [C5, 23, 3], // birth-day to you
]
// One root per bar on the triangle channel, the NES/Game Boy bass voice.
const BASS: [number, number, number][] = [
  [C3, 1, 3], [G2, 4, 3], [G2, 7, 3], [C3, 10, 3],
  [C3, 13, 3], [F2, 16, 3], [C3, 20, 2], [G2, 22, 1], [C3, 23, 3],
]
const BEAT = 0.3 // seconds

/** Happy Birthday — the birthday level's win jingle (~8s). */
export function playBirthdayJingle(): void {
  const toNotes = (bars: [number, number, number][]) =>
    bars.map(([freq, at, len]) => ({
      freq,
      at: at * BEAT,
      // A touch short of the full length, so repeated notes re-articulate.
      dur: len * BEAT * 0.9,
    }))
  play(toNotes(MELODY), 0.06)
  play(toNotes(BASS), 0.12, 'triangle')
}
