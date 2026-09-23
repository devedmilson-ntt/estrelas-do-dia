import { useEffect, useMemo, useRef } from 'react'

const COLORS = ['var(--gold)', 'var(--teal)', 'var(--pink)', 'var(--violet)', 'var(--gold-glow)']

export default function Celebration({ minutes, name, onDone }) {
  // Some sozinha depois de alguns segundos (ou com um toque)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const id = setTimeout(() => doneRef.current(), 5000)
    return () => clearTimeout(id)
  }, [])

  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.2 + Math.random() * 1.6,
        size: 7 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
        drift: (Math.random() - 0.5) * 120
      })),
    []
  )

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden px-[18px]"
      style={{ background: 'rgba(59,42,85,0.35)' }}
      onClick={onDone}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          aria-hidden="true"
          style={{
            left: p.left + '%',
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
            animationDelay: p.delay + 's',
            animationDuration: p.duration + 's',
            '--drift': p.drift + 'px'
          }}
        />
      ))}
      <div className="celebrate-card sticker-card shadow-sticker text-center px-7 py-6 max-w-[340px]">
        <div className="text-[56px] leading-none mb-2" aria-hidden="true">
          🎉
        </div>
        <h2 className="font-display font-bold text-[26px] text-ink m-0 mb-1.5">
          {name ? `Parabéns, ${name}!` : 'Meta batida!'}
        </h2>
        <p className="text-[16px] font-semibold text-ink-soft m-0 leading-relaxed">
          {minutes} minutos de Nintendo liberados para hoje à noite!
        </p>
      </div>
    </div>
  )
}
