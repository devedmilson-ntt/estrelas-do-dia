// Som de comemoração gerado na hora (sem arquivo de áudio).
// Navegadores só liberam som depois de um toque na tela, então o app chama
// unlockAudio() no primeiro toque; depois disso a comemoração pode tocar
// mesmo quando é disparada por um registro vindo de outro aparelho.
import { safeGet, safeSet } from './storage.js'

const SOUND_KEY = 'estrelas_som'
let ctx = null

export function isSoundOn() {
  return safeGet(SOUND_KEY, true)
}

export function setSoundOn(on) {
  safeSet(SOUND_KEY, on)
}

// Chamado em todo toque/clique. No iPhone o áudio só é liberado no fim do
// toque (touchend/click) e é preciso tocar algo — um som mudo — nesse momento.
export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    if (!ctx) ctx = new AC()
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {})
      const buffer = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(ctx.destination)
      src.start(0)
    }
  } catch {
    // sem áudio — tudo bem
  }
}

const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown']

export function listenForAudioUnlock() {
  UNLOCK_EVENTS.forEach((ev) => document.addEventListener(ev, unlockAudio, { passive: true }))
  return () => UNLOCK_EVENTS.forEach((ev) => document.removeEventListener(ev, unlockAudio))
}

function playNotes() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5] // dó-mi-sol-dó
  const start = ctx.currentTime + 0.05
  notes.forEach((freq, i) => {
    const t = start + i * 0.13
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === notes.length - 1 ? 0.6 : 0.2))
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.65)
  })
}

export function playCelebration({ force = false } = {}) {
  if (!force && !isSoundOn()) return
  unlockAudio()
  if (!ctx) return
  try {
    if (ctx.state === 'running') playNotes()
    // Ainda "acordando": espera em vez de descartar o som
    else ctx.resume().then(playNotes).catch(() => {})
  } catch {
    // sem áudio — tudo bem
  }
}
