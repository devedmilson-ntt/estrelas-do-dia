import { useEffect, useRef } from 'react'

const STAR_PATH =
  'M0,-10 L2.9,-3.1 L9.5,-3.1 L4.1,1.2 L5.9,8.1 L0,3.8 L-5.9,8.1 L-4.1,1.2 L-9.5,-3.1 L-2.9,-3.1 Z'

export default function StarRing({ stars, goal, pulseKey, size = 220 }) {
  const scale = size / 220
  const cx = 110
  const cy = 110
  const r = 88
  const filledCount = Math.min(stars, goal)
  const slots = Array.from({ length: goal }, (_, i) => {
    const angle = -Math.PI / 2 + i * ((2 * Math.PI) / goal)
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      filled: i < filledCount
    }
  })

  const prevPulseKey = useRef(pulseKey)
  const shouldPulse = pulseKey !== prevPulseKey.current
  useEffect(() => {
    prevPulseKey.current = pulseKey
  }, [pulseKey])

  return (
    <div className="relative">
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: '-14px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 260 * scale,
          height: 260 * scale,
          background: 'radial-gradient(circle, var(--gold) 0%, transparent 70%)',
          opacity: 0.22
        }}
      />
      <div className="relative z-10 mx-auto" style={{ width: size, height: size }}>
        <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-label="Progresso de estrelas do dia">
          {slots.map((s, i) => {
            const isLast = s.filled && i === filledCount - 1
            return (
              <use
                key={i}
                href="#starShapeSymbol"
                width="22"
                height="22"
                x={s.x - 11}
                y={s.y - 11}
                className={isLast && shouldPulse ? 'star-slot filled pulse' : `star-slot${s.filled ? ' filled' : ''}`}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold leading-none text-ink" style={{ fontSize: 54 * scale }}>
            {stars}
          </span>
          <span className="font-semibold text-ink-soft mt-0.5" style={{ fontSize: 14 * scale }}>
            de {goal}
          </span>
        </div>
      </div>
    </div>
  )
}
