import { useEffect, useState } from 'react'
import Sheet from './Sheet.jsx'

function CategoryList({ items, kind, onRemove }) {
  return (
    <ul className="list-none m-0 mb-2 p-0 flex flex-col gap-2">
      {items.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between bg-bg border-2 rounded-[14px] py-2 px-2.5 text-[13px] font-semibold"
          style={{ borderColor: 'var(--line)' }}
        >
          <span>
            {kind === 'gain' ? '+' : '−'}
            {c.delta} {c.label}
          </span>
          <button
            type="button"
            aria-label={'Remover motivo: ' + c.label}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-ink-soft"
            onClick={() => onRemove(kind, c.id)}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}

function AddCategoryForm({ kind, onAdd }) {
  const [label, setLabel] = useState('')
  const [delta, setDelta] = useState(1)
  const [error, setError] = useState('')

  function submit() {
    const trimmed = label.trim()
    if (!trimmed) {
      setError('Digite um motivo antes de adicionar.')
      return
    }
    onAdd(kind, trimmed, delta)
    setLabel('')
    setDelta(1)
    setError('')
  }

  return (
    <>
      <div className="flex gap-2 mb-1 flex-wrap">
        <input
          type="text"
          placeholder="Novo motivo"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          className="flex-1 min-w-[120px] border-2 rounded-xl py-2 px-2.5 font-semibold bg-bg text-ink"
          style={{ borderColor: error ? 'var(--pink)' : 'var(--line)' }}
        />
        <input
          type="number"
          min={1}
          max={5}
          value={delta}
          onChange={(e) => setDelta(parseInt(e.target.value, 10) || 1)}
          className="w-16 border-2 rounded-xl py-2 px-2 font-semibold bg-bg text-ink"
          style={{ borderColor: 'var(--line)' }}
        />
        <button
          type="button"
          className="border-2 border-ink bg-violet-soft text-violet rounded-xl py-2 px-3.5 text-[13px] font-bold whitespace-nowrap"
          onClick={submit}
        >
          Adicionar
        </button>
      </div>
      <div className="font-semibold text-[12px] min-h-[14px] mb-3" style={{ color: 'var(--pink)' }}>
        {error}
      </div>
    </>
  )
}

export default function SettingsSheet({ open, config, onClose, onSaveRules, onAddCategory, onRemoveCategory }) {
  const [baseStars, setBaseStars] = useState(config.baseStars)
  const [goalStars, setGoalStars] = useState(config.goalStars)
  const [rewardMinutes, setRewardMinutes] = useState(config.rewardMinutes)

  useEffect(() => {
    if (open) {
      setBaseStars(config.baseStars)
      setGoalStars(config.goalStars)
      setRewardMinutes(config.rewardMinutes)
    }
  }, [open, config])

  function save() {
    onSaveRules({
      baseStars: Math.max(0, baseStars || 0),
      goalStars: Math.max(1, goalStars || 8),
      rewardMinutes: Math.max(5, rewardMinutes || 60)
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Configurações">
      <label className="flex items-center justify-between text-[14px] font-semibold text-ink mb-3.5 gap-2.5">
        Estrelas no início do dia
        <input
          type="number"
          min={0}
          max={20}
          value={baseStars}
          onChange={(e) => setBaseStars(parseInt(e.target.value, 10))}
          className="w-[70px] text-right border-2 rounded-xl py-1.5 px-2 font-bold bg-bg text-ink"
          style={{ borderColor: 'var(--line)' }}
        />
      </label>
      <label className="flex items-center justify-between text-[14px] font-semibold text-ink mb-3.5 gap-2.5">
        Meta para liberar o Nintendo
        <input
          type="number"
          min={1}
          max={30}
          value={goalStars}
          onChange={(e) => setGoalStars(parseInt(e.target.value, 10))}
          className="w-[70px] text-right border-2 rounded-xl py-1.5 px-2 font-bold bg-bg text-ink"
          style={{ borderColor: 'var(--line)' }}
        />
      </label>
      <label className="flex items-center justify-between text-[14px] font-semibold text-ink mb-3.5 gap-2.5">
        Minutos de recompensa
        <input
          type="number"
          min={10}
          max={240}
          step={10}
          value={rewardMinutes}
          onChange={(e) => setRewardMinutes(parseInt(e.target.value, 10))}
          className="w-[70px] text-right border-2 rounded-xl py-1.5 px-2 font-bold bg-bg text-ink"
          style={{ borderColor: 'var(--line)' }}
        />
      </label>

      <div>
        <h4 className="font-display text-[14px] mt-4 mb-2.5 text-ink font-semibold">Motivos de ganho</h4>
        <CategoryList items={config.gain} kind="gain" onRemove={onRemoveCategory} />
        <AddCategoryForm kind="gain" onAdd={onAddCategory} />

        <h4 className="font-display text-[14px] mt-4 mb-2.5 text-ink font-semibold">Motivos de perda</h4>
        <CategoryList items={config.loss} kind="loss" onRemove={onRemoveCategory} />
        <AddCategoryForm kind="loss" onAdd={onAddCategory} />
      </div>

      <button type="button" className="confirm-btn" onClick={save}>
        Salvar
      </button>
    </Sheet>
  )
}
