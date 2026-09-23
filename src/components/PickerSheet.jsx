import { useEffect, useState } from 'react'
import Sheet from './Sheet.jsx'

export default function PickerSheet({ open, type, categories, onClose, onConfirm }) {
  const [showCustom, setShowCustom] = useState(false)
  const [reason, setReason] = useState('')
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setShowCustom(false)
      setReason('')
      setStep(1)
      setError('')
    }
  }, [open, type])

  if (!open) return null

  const title = type === 'gain' ? 'Por que ganhou uma estrela?' : 'Por que perdeu uma estrela?'
  const chipClass = type === 'gain' ? 'chip-btn bg-green-soft text-green' : 'chip-btn bg-coral-soft text-coral'

  function confirmCustom() {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('Digite um motivo antes de registrar.')
      return
    }
    onConfirm(type, trimmed, step)
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-wrap gap-2.5 mb-1.5">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={chipClass}
            onClick={() => onConfirm(type, c.label, c.delta)}
          >
            {type === 'gain' ? '+' : '−'}
            {c.delta}&nbsp;&nbsp;{c.label}
          </button>
        ))}
        <button type="button" className="chip-btn bg-violet-soft text-violet" onClick={() => setShowCustom(true)}>
          Outro motivo…
        </button>
      </div>

      {showCustom && (
        <div className="flex flex-col gap-3 mt-4">
          <input
            type="text"
            maxLength={60}
            placeholder="Descreva o motivo"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError('')
            }}
            className="border-2 rounded-[14px] py-3 px-3.5 font-semibold bg-bg text-ink"
            style={{ borderColor: error ? 'var(--pink)' : 'var(--line)' }}
            autoFocus
          />
          {error && <div className="text-[12px] font-semibold" style={{ color: 'var(--pink)' }}>{error}</div>}
          <div className="flex items-center gap-4 justify-center">
            <button
              type="button"
              aria-label="Diminuir"
              className="w-[38px] h-[38px] rounded-full border-2 border-ink bg-violet-soft text-violet font-bold text-[18px]"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              −
            </button>
            <span className="font-bold text-[17px] text-ink min-w-[20px] text-center">{step}</span>
            <button
              type="button"
              aria-label="Aumentar"
              className="w-[38px] h-[38px] rounded-full border-2 border-ink bg-violet-soft text-violet font-bold text-[18px]"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
            >
              +
            </button>
          </div>
          <button type="button" className="confirm-btn" onClick={confirmCustom}>
            Registrar
          </button>
        </div>
      )}
    </Sheet>
  )
}
