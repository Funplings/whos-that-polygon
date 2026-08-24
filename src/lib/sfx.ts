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

function play(notes: Note[], gain: number): void {
  const audio = audioCtx()
  if (!audio) return
  const t0 = audio.currentTime
  for (const { freq, at, dur } of notes) {
    const osc = audio.createOscillator()
    const env = audio.createGain()
    osc.type = 'square'
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
