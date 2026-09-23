import { useEffect, useState } from 'react'
import Sheet from './Sheet.jsx'
import { formatCode, friendlyError, leaveFamily } from '../lib/family.js'
import InviteButton from './InviteButton.jsx'
import { isSoundOn, playCelebration, setSoundOn } from '../lib/sound.js'
import { AVATARS } from './ChildMode.jsx'

function FamilySection({ family, members, userId, pending, onLeft }) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function leave() {
    setBusy(true)
    setError('')
    try {
      await leaveFamily(family)
      onLeft()
    } catch (e) {
      setError(friendlyError(e))
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 pb-5 border-b-2" style={{ borderColor: 'var(--line)' }}>
      <h4 className="font-display text-[14px] mt-0 mb-2.5 text-ink font-semibold">Família</h4>
      <div className="flex flex-wrap items-center gap-x-2.5 mb-1">
        <span className="flex-1 font-display font-bold text-[22px] tracking-[0.1em] text-ink">{formatCode(family.code)}</span>
        <InviteButton
          code={family.code}
          className="border-2 border-ink bg-teal text-teal-text rounded-xl py-2 px-3.5 text-[13px] font-bold whitespace-nowrap"
        />
      </div>
      <p className="text-[12px] font-semibold text-ink-soft mt-0 mb-3 min-h-[16px]">
        Quem tiver este código pode ver e registrar estrelas.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {members.map((m) => (
          <span
            key={m.user_id}
            className="border-2 rounded-full py-1 px-3 text-[13px] font-semibold text-ink"
            style={{ borderColor: 'var(--line)' }}
          >
            {m.display_name}
            {m.user_id === userId ? ' (você)' : ''}
          </span>
        ))}
      </div>

      {!confirmLeave ? (
        <button
          type="button"
          className="bg-transparent border-none p-0 text-[13px] font-bold"
          style={{ color: 'var(--coral)' }}
          onClick={() => setConfirmLeave(true)}
        >
          Sair desta família neste aparelho
        </button>
      ) : (
        <div className="bg-bg border-2 rounded-[14px] p-3" style={{ borderColor: 'var(--line)' }}>
          <p className="text-[13px] font-semibold text-ink mt-0 mb-2.5">
            Este aparelho vai parar de ver as estrelas da família (os dados continuam salvos para os outros).
            {pending > 0 && ` Atenção: ${pending} alteração(ões) ainda não foram enviadas e serão perdidas.`}
          </p>
          {error && <p className="text-[12px] font-semibold mt-0 mb-2" style={{ color: 'var(--coral)' }}>{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="flex-1 border-2 border-ink rounded-xl py-2 text-[13px] font-bold bg-coral-soft text-coral"
              onClick={leave}
            >
              {busy ? 'Saindo…' : 'Sair'}
            </button>
            <button
              type="button"
              className="flex-1 border-2 border-ink rounded-xl py-2 text-[13px] font-bold bg-card text-ink"
              onClick={() => setConfirmLeave(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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

export default function SettingsSheet({
  open,
  config,
  onClose,
  onSaveRules,
  onAddCategory,
  onRemoveCategory,
  family,
  members,
  userId,
  pending,
  onLeft
}) {
  const [baseStars, setBaseStars] = useState(config.baseStars)
  const [goalStars, setGoalStars] = useState(config.goalStars)
  const [rewardMinutes, setRewardMinutes] = useState(config.rewardMinutes)
  const [childName, setChildName] = useState(config.childName || '')
  const [childAvatar, setChildAvatar] = useState(config.childAvatar || '')
  const [sound, setSound] = useState(() => isSoundOn())

  useEffect(() => {
    if (open) {
      setBaseStars(config.baseStars)
      setGoalStars(config.goalStars)
      setRewardMinutes(config.rewardMinutes)
      setChildName(config.childName || '')
      setChildAvatar(config.childAvatar || '')
    }
  }, [open, config])

  function save() {
    onSaveRules({
      baseStars: Math.max(0, baseStars || 0),
      goalStars: Math.max(1, goalStars || 8),
      rewardMinutes: Math.max(5, rewardMinutes || 60),
      childName: childName.trim().slice(0, 30),
      childAvatar
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Configurações">
      <FamilySection family={family} members={members} userId={userId} pending={pending} onLeft={onLeft} />

      <div className="mb-5 pb-5 border-b-2" style={{ borderColor: 'var(--line)' }}>
        <h4 className="font-display text-[14px] mt-0 mb-2.5 text-ink font-semibold">Criança</h4>
        <label className="flex items-center justify-between text-[14px] font-semibold text-ink mb-3 gap-2.5">
          Nome
          <input
            type="text"
            maxLength={30}
            placeholder="Ex.: Gabriel"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            className="w-[160px] border-2 rounded-xl py-1.5 px-2.5 font-semibold bg-bg text-ink"
            style={{ borderColor: 'var(--line)' }}
          />
        </label>
        <p className="text-[14px] font-semibold text-ink mt-0 mb-2">Avatar</p>
        <div className="grid grid-cols-8 gap-1 mb-3">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              aria-label={'Avatar ' + a}
              aria-pressed={a === childAvatar}
              className="text-[24px] leading-none py-1.5 rounded-lg border-2"
              style={{
                borderColor: a === childAvatar ? 'var(--ink)' : 'transparent',
                background: a === childAvatar ? 'var(--violet-soft)' : 'transparent'
              }}
              onClick={() => setChildAvatar(a)}
            >
              {a}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between text-[14px] font-semibold text-ink gap-2.5">
          <span>
            Som ao bater a meta
            <span className="block text-[12px] text-ink-soft">Só neste aparelho</span>
          </span>
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => {
              setSound(e.target.checked)
              setSoundOn(e.target.checked)
              if (e.target.checked) playCelebration({ force: true })
            }}
            className="w-6 h-6 accent-[var(--violet)]"
          />
        </label>
        <button
          type="button"
          className="mt-2.5 border-2 border-ink bg-violet-soft text-violet rounded-xl py-2 px-3.5 text-[13px] font-bold"
          onClick={() => playCelebration({ force: true })}
        >
          🔊 Testar som
        </button>
      </div>


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
