import { useEffect, useRef, useState } from 'react'
import StarRing from './StarRing.jsx'

export const AVATARS = ['🦖', '🚀', '⚽', '🐱', '🦄', '🐶', '🦊', '🐼', '🤖', '🦸', '🐙', '🐯', '🦁', '🐸', '🌈', '🏎️']

function pluralize(n, singular, plural) {
  return n === 1 ? singular : plural
}

// Mantém a tela acesa enquanto o modo criança estiver aberto (onde houver suporte)
function useWakeLock() {
  useEffect(() => {
    let lock = null
    let cancelled = false
    async function request() {
      try {
        if (document.visibilityState === 'visible' && navigator.wakeLock) {
          lock = await navigator.wakeLock.request('screen')
          if (cancelled) lock.release()
        }
      } catch {
        // sem suporte ou bateria fraca — tudo bem
      }
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      lock?.release().catch(() => {})
    }
  }, [])
}

// Sair exige segurar o botão por 2 segundos, para a criança não sair sem querer
function HoldToExit({ onExit }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(null)

  function start(e) {
    e.preventDefault()
    setHolding(true)
    timer.current = setTimeout(onExit, 2000)
  }
  function cancel() {
    setHolding(false)
    clearTimeout(timer.current)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <button
      type="button"
      className="relative overflow-hidden select-none border-2 rounded-full py-2.5 px-5 text-[13px] font-bold text-ink-soft bg-card"
      style={{ borderColor: 'var(--line)', touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Segure por 2 segundos para sair do modo criança"
    >
      <span
        className={`hold-fill absolute inset-0 ${holding ? 'holding' : ''}`}
        style={{ background: 'var(--violet-soft)' }}
        aria-hidden="true"
      />
      <span className="relative">{holding ? 'Continue segurando…' : 'Segure para sair'}</span>
    </button>
  )
}

export default function ChildMode({ config, day, streak, pulseKey, onExit, onPickAvatar }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [size] = useState(() => Math.min(300, (typeof window !== 'undefined' ? window.innerWidth : 360) - 60))
  useWakeLock()

  const name = config.childName?.trim()
  const avatar = config.childAvatar || '⭐'
  const falta = config.goalStars - day.stars
  const last = day.events[day.events.length - 1]
  const tip = config.gain.length ? config.gain[(day.stars + day.events.length) % config.gain.length] : null
  const streakLabel = (n) => (n >= 30 ? '30+' : n)

  let title
  let subtitle
  if (day.rewardUsed) {
    title = 'Nintendo de hoje já foi!'
    subtitle = 'Amanhã tem mais estrelas. 🌙'
  } else if (day.goalReached) {
    title = 'Você conseguiu! 🎉'
    subtitle = `${config.rewardMinutes} minutos de Nintendo hoje à noite!`
  } else {
    title = `${pluralize(falta, 'Falta', 'Faltam')} ${falta} ${pluralize(falta, 'estrela', 'estrelas')}!`
    subtitle = 'Você consegue! 💪'
  }

  let streakText = null
  if (day.goalReached && streak.total >= 2) {
    streakText = `🔥 ${streakLabel(streak.total)} dias seguidos batendo a meta!`
  } else if (!day.goalReached && streak.before >= 2) {
    streakText = `🔥 ${streakLabel(streak.before)} dias seguidos! Bata a meta hoje para chegar a ${streak.before + 1}.`
  } else if (!day.goalReached && streak.before === 1) {
    streakText = '🔥 Ontem você bateu a meta! Bora repetir?'
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-bg"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="max-w-[460px] min-h-full mx-auto px-[18px] pt-6 pb-8 flex flex-col items-center text-center">
        <button
          type="button"
          className="w-[72px] h-[72px] rounded-full bg-card border-[2.5px] border-ink shadow-sticker-sm text-[40px] leading-none flex items-center justify-center"
          aria-label="Trocar avatar"
          onClick={() => setPickerOpen((v) => !v)}
        >
          {avatar}
        </button>
        <h1 className="font-display font-bold text-[26px] text-ink mt-3 mb-0">{name ? `Oi, ${name}!` : 'Oi!'}</h1>

        {pickerOpen && (
          <div className="sticker-card shadow-sticker-sm p-3 mt-3 grid grid-cols-4 gap-2 w-full max-w-[300px]">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className="text-[32px] leading-none py-2 rounded-xl"
                style={{ background: a === avatar ? 'var(--violet-soft)' : 'transparent' }}
                onClick={() => {
                  onPickAvatar(a)
                  setPickerOpen(false)
                }}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        <div className="my-6">
          <StarRing stars={day.stars} goal={config.goalStars} pulseKey={pulseKey} size={size} />
        </div>

        <h2 className="font-display font-bold text-[28px] text-ink m-0 leading-tight">{title}</h2>
        <p className="text-[17px] font-semibold text-ink-soft mt-1.5 mb-0">{subtitle}</p>

        {!day.goalReached && !day.rewardUsed && tip && (
          <div className="mt-5">
            <p className="text-[13px] font-semibold text-ink-soft m-0 mb-2">💡 Ideia para ganhar estrela:</p>
            <span className="chip-btn bg-green-soft text-green cursor-default">
              +{tip.delta}&nbsp;&nbsp;{tip.label}
            </span>
          </div>
        )}

        {streakText && (
          <p className="mt-5 mb-0 py-2 px-4 rounded-full bg-card border-2 border-ink text-[14px] font-bold text-ink">
            {streakText}
          </p>
        )}

        {last && (
          <p className="mt-5 mb-0 text-[13px] font-semibold text-ink-soft">
            Último registro:{' '}
            <span style={{ color: last.delta > 0 ? 'var(--green)' : 'var(--coral)' }} className="font-bold">
              {last.delta > 0 ? '+' : ''}
              {last.delta}
            </span>{' '}
            {last.reason}
            {last.by ? ` · ${last.by}` : ''}
          </p>
        )}

        <div className="mt-auto pt-8">
          <HoldToExit onExit={onExit} />
        </div>
      </div>
    </div>
  )
}
