/**
 * 정답/오답 피드백: 소리(WebAudio 합성음, 파일 불필요) + 진동(안드로이드 크롬).
 * 소리는 사용자 터치 이후에만 재생 가능하므로, 시작 버튼에서 unlockAudio()를 한 번 호출합니다.
 */
let ctx: AudioContext | null = null

export function unlockAudio() {
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', gain = 0.25) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = ctx.currentTime + startOffset
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

/** 게임 안에서 쓰는 단일 음 (사이먼의 버튼별 음 등). 정답/오답 피드백은 playFeedback을 쓰세요. */
export function playNote(freq: number, settings: { sound: boolean }, duration = 0.28) {
  if (settings.sound) tone(freq, 0, duration)
}

export type FeedbackKind = 'correct' | 'wrong' | 'tap' | 'levelUp' | 'finish'

export function playFeedback(kind: FeedbackKind, settings: { sound: boolean; vibration: boolean }) {
  if (settings.sound) {
    switch (kind) {
      case 'correct':
        tone(660, 0, 0.12)
        tone(880, 0.12, 0.18)
        break
      case 'wrong':
        tone(220, 0, 0.3, 'square', 0.12)
        break
      case 'tap':
        tone(500, 0, 0.05, 'sine', 0.1)
        break
      case 'levelUp':
        tone(523, 0, 0.1)
        tone(659, 0.1, 0.1)
        tone(784, 0.2, 0.1)
        tone(1046, 0.3, 0.25)
        break
      case 'finish':
        tone(523, 0, 0.15)
        tone(784, 0.15, 0.3)
        break
    }
  }
  if (settings.vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (kind) {
        case 'correct':
          navigator.vibrate(40)
          break
        case 'wrong':
          navigator.vibrate([90, 60, 90])
          break
        case 'levelUp':
          navigator.vibrate([40, 40, 40, 40, 120])
          break
        case 'finish':
          navigator.vibrate([60, 60, 160])
          break
        default:
          break
      }
    } catch {
      /* ignore */
    }
  }
}
