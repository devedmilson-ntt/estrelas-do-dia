import { useState } from 'react'
import { createFamily, formatCode, friendlyError, joinFamily } from '../lib/family.js'
import InviteButton from './InviteButton.jsx'

const NAME_SUGGESTIONS = ['Pai', 'Mãe', 'Vovô', 'Vovó', 'Tio', 'Tia']

function codeFromUrl() {
  try {
    return formatCode(new URLSearchParams(location.search).get('codigo') || '')
  } catch {
    return ''
  }
}

function clearCodeFromUrl() {
  try {
    history.replaceState(null, '', location.pathname)
  } catch {
    // sem problema
  }
}

function NameField({ name, setName }) {
  return (
    <>
      <label className="block text-[14px] font-semibold text-ink mb-2" htmlFor="nome">
        Quem é você?
      </label>
      <div className="flex flex-wrap gap-2 mb-2.5">
        {NAME_SUGGESTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={`chip-btn ${name === n ? 'bg-violet text-white' : 'bg-violet-soft text-violet'}`}
            onClick={() => setName(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <input
        id="nome"
        type="text"
        maxLength={30}
        placeholder="Ou digite seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border-2 rounded-[14px] py-3 px-3.5 font-semibold bg-bg text-ink mb-4"
        style={{ borderColor: 'var(--line)' }}
      />
    </>
  )
}

export default function FamilySetup({ notice, onReady }) {
  const initialCode = codeFromUrl()
  const [step, setStep] = useState(initialCode ? 'join' : 'welcome') // welcome | create | join | created
  const [name, setName] = useState('')
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [family, setFamily] = useState(null)

  async function run(fn) {
    setError('')
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  function submitCreate() {
    if (!name.trim()) return setError('Escolha ou digite seu nome.')
    run(async () => {
      const f = await createFamily(name.trim())
      setFamily(f)
      setStep('created')
    })
  }

  function submitJoin() {
    if (code.replace(/-/g, '').length !== 8) return setError('O código tem 8 letras/números, ex.: K7Q4-XM9P.')
    if (!name.trim()) return setError('Escolha ou digite seu nome.')
    run(async () => {
      const f = await joinFamily(code, name.trim())
      if (!f) return setError('Código não encontrado. Confira as letras e tente de novo.')
      clearCodeFromUrl()
      onReady(f)
    })
  }

  return (
    <div className="max-w-[460px] mx-auto px-[18px] pt-[40px] pb-[50px]">
      <div className="text-center mb-6">
        <div className="text-[48px] leading-none mb-2" aria-hidden="true">
          ⭐
        </div>
        <h1 className="font-display font-bold text-[26px] text-ink m-0">Estrelas do dia</h1>
      </div>

      {notice && (
        <p className="sticker-card px-4 py-3 mb-4 text-[14px] font-semibold text-ink-soft">{notice}</p>
      )}

      <div className="sticker-card shadow-sticker p-[22px]">
        {step === 'welcome' && (
          <>
            <p className="text-[15px] font-semibold text-ink-soft mt-0 mb-5 leading-relaxed">
              Agora o pai, a mãe, os avós e quem mais cuidar podem registrar as estrelas, cada um no seu celular.
            </p>
            <button type="button" className="confirm-btn mb-3" onClick={() => setStep('create')}>
              Criar a família
            </button>
            <p className="text-[12px] font-semibold text-ink-soft text-center mt-0 mb-5">
              Faça isso uma vez só, no aparelho que já tem os registros — eles vão junto.
            </p>
            <button
              type="button"
              className="w-full border-[2.5px] border-ink shadow-sticker-sm bg-violet-soft text-violet font-display font-bold text-[15px] py-3 rounded-2xl"
              onClick={() => setStep('join')}
            >
              Já tenho um código
            </button>
          </>
        )}

        {step === 'create' && (
          <>
            <h2 className="font-display font-bold text-[19px] text-ink mt-0 mb-4">Criar a família</h2>
            <NameField name={name} setName={setName} />
            {error && <p className="text-[13px] font-semibold mt-0 mb-3" style={{ color: 'var(--coral)' }}>{error}</p>}
            <button type="button" className="confirm-btn" disabled={busy} onClick={submitCreate}>
              {busy ? 'Criando…' : 'Criar'}
            </button>
            <button type="button" className="w-full mt-3 text-violet font-bold text-[14px] bg-transparent border-none" onClick={() => { setError(''); setStep('welcome') }}>
              Voltar
            </button>
          </>
        )}

        {step === 'join' && (
          <>
            <h2 className="font-display font-bold text-[19px] text-ink mt-0 mb-4">Entrar na família</h2>
            <label className="block text-[14px] font-semibold text-ink mb-2" htmlFor="codigo">
              Código da família
            </label>
            <input
              id="codigo"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(formatCode(e.target.value))}
              className="w-full border-2 rounded-[14px] py-3 px-3.5 font-display font-bold text-[20px] tracking-[0.15em] text-center bg-bg text-ink mb-4"
              style={{ borderColor: 'var(--line)' }}
            />
            <NameField name={name} setName={setName} />
            {error && <p className="text-[13px] font-semibold mt-0 mb-3" style={{ color: 'var(--coral)' }}>{error}</p>}
            <button type="button" className="confirm-btn" disabled={busy} onClick={submitJoin}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            <button type="button" className="w-full mt-3 text-violet font-bold text-[14px] bg-transparent border-none" onClick={() => { setError(''); setStep('welcome') }}>
              Voltar
            </button>
          </>
        )}

        {step === 'created' && family && (
          <>
            <h2 className="font-display font-bold text-[19px] text-ink mt-0 mb-2">Família criada!</h2>
            <p className="text-[14px] font-semibold text-ink-soft mt-0 mb-4 leading-relaxed">
              Mande este código para quem também vai usar o app. Ele também fica em Configurações.
            </p>
            <div className="text-center font-display font-bold text-[32px] tracking-[0.12em] text-ink bg-bg border-2 rounded-2xl py-3 mb-4" style={{ borderColor: 'var(--line)' }}>
              {formatCode(family.code)}
            </div>
            <div className="mb-4">
              <InviteButton
                code={family.code}
                className="w-full border-[2.5px] border-ink shadow-sticker-sm bg-teal text-teal-text font-display font-bold text-[15px] py-3 rounded-2xl"
              />
            </div>
            <button type="button" className="confirm-btn" onClick={() => onReady(family)}>
              Começar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
