import { useEffect, useState } from 'react'
import { useEstrelas } from './hooks/useEstrelas.js'
import { isWeekend } from './lib/dates.js'
import StarRing from './components/StarRing.jsx'
import WeekSummary from './components/WeekSummary.jsx'
import PickerSheet from './components/PickerSheet.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import HistorySheet from './components/HistorySheet.jsx'

const STAR_PATH =
  'M0,-10 L2.9,-3.1 L9.5,-3.1 L4.1,1.2 L5.9,8.1 L0,3.8 L-5.9,8.1 L-4.1,1.2 L-9.5,-3.1 L-2.9,-3.1 Z'

function pluralize(n, singular, plural) {
  return n === 1 ? singular : plural
}

export default function App({ family, onLeft, onMembershipLost }) {
  const {
    loaded,
    online,
    pending,
    members,
    userId,
    config,
    day,
    week,
    history,
    addEvent,
    removeEvent,
    restoreEvent,
    markRewardUsed,
    updateRules,
    addCategory,
    removeCategory
  } = useEstrelas(family, { onMembershipLost })

  const [pickerType, setPickerType] = useState(null) // 'gain' | 'loss' | null
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [weekVisible, setWeekVisible] = useState(() => isWeekend())
  const [pulseKey, setPulseKey] = useState(0)
  // Último registro adicionado/removido, para o botão "Desfazer"
  const [undo, setUndo] = useState(null) // { kind: 'added' | 'removed', event } | null

  // O aviso de desfazer some sozinho após alguns segundos
  useEffect(() => {
    if (!undo) return
    const id = setTimeout(() => setUndo(null), 6000)
    return () => clearTimeout(id)
  }, [undo])

  // Na virada do dia o aviso não faz mais sentido
  useEffect(() => {
    setUndo(null)
  }, [day.date])

  const weekendToday = isWeekend()

  function handleConfirmEvent(type, label, delta) {
    const event = addEvent(type, label, delta)
    if (type === 'gain') setPulseKey((k) => k + 1)
    setPickerType(null)
    setUndo({ kind: 'added', event })
  }

  function handleRemoveEvent(ev) {
    removeEvent(ev.id)
    setUndo({ kind: 'removed', event: ev })
  }

  function handleUndo() {
    if (!undo) return
    if (undo.kind === 'added') removeEvent(undo.event.id)
    else restoreEvent(undo.event)
    setUndo(null)
  }

  let statusText
  if (day.rewardUsed) {
    const t = new Date(day.rewardUsedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const by = day.rewardUsedBy ? `, marcado por ${day.rewardUsedBy}` : ''
    statusText = `Nintendo já foi usado hoje (às ${t}${by}). Até amanhã!`
  } else if (day.goalReached) {
    statusText = `Meta atingida! ${config.rewardMinutes} minutos de Nintendo liberados para hoje à noite.`
  } else {
    const falta = config.goalStars - day.stars
    statusText = `Faltam ${falta} ${pluralize(falta, 'estrela', 'estrelas')} para o Nintendo hoje.`
  }

  const sortedEvents = [...day.events].reverse()

  if (!loaded) {
    return (
      <div className="max-w-[460px] mx-auto px-[18px] pt-[80px] text-center text-ink-soft font-semibold text-[15px]">
        {online ? 'Carregando as estrelas da família…' : 'Sem internet. Conecte-se para carregar os dados da família pela primeira vez.'}
      </div>
    )
  }

  return (
    <div className="max-w-[460px] mx-auto px-[18px] pt-[22px] pb-[50px]">
      {/* símbolo SVG compartilhado pelo anel de estrelas */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="starShapeSymbol" viewBox="-10 -10 20 20">
            <path d={STAR_PATH} />
          </symbol>
        </defs>
      </svg>

      <header className="flex items-center justify-between mb-1.5">
        <button className="icon-btn" aria-label="Configurações" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <h1 className="font-display font-bold text-[21px] text-ink m-0">Estrelas do dia</h1>
        <button className="icon-btn" aria-label="Histórico" onClick={() => setHistoryOpen(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        </button>
      </header>

      {(!online || pending > 0) && (
        <p role="status" className="text-center text-[12px] font-semibold text-ink-soft mt-2 mb-0">
          {!online
            ? pending > 0
              ? `Sem internet — ${pending} ${pluralize(pending, 'alteração será enviada', 'alterações serão enviadas')} quando a conexão voltar.`
              : 'Sem internet — mostrando os últimos dados salvos.'
            : 'Sincronizando…'}
        </p>
      )}

      <section className="text-center my-[22px]">
        <StarRing stars={day.stars} goal={config.goalStars} pulseKey={pulseKey} />
        <p className="text-[15px] font-semibold text-ink-soft max-w-[300px] mx-auto mt-4 leading-relaxed">
          {statusText}
        </p>
        {day.goalReached && !day.rewardUsed && (
          <button
            type="button"
            className="mt-3.5 border-[2.5px] border-ink shadow-sticker-sm bg-violet-soft text-violet font-bold text-[14px] py-2.5 px-[18px] rounded-full"
            onClick={markRewardUsed}
          >
            Marcar Nintendo como usado
          </button>
        )}
      </section>

      <WeekSummary
        week={week}
        visible={weekVisible}
        onToggle={() => setWeekVisible((v) => !v)}
        isWeekendToday={weekendToday}
      />

      <section className="flex gap-3.5 mb-7">
        <button type="button" className="action-btn bg-teal text-teal-text" onClick={() => setPickerType('gain')}>
          + Ganhou uma estrela
        </button>
        <button type="button" className="action-btn bg-pink text-pink-text" onClick={() => setPickerType('loss')}>
          − Perdeu uma estrela
        </button>
      </section>

      <section>
        <h2 className="font-display font-bold text-[17px] text-ink mb-2.5">Hoje</h2>
        <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
          {sortedEvents.length === 0 && (
            <li className="text-ink-soft font-semibold text-[14px] px-1 py-2.5 list-none">
              Nenhum registro ainda hoje.
            </li>
          )}
          {sortedEvents.map((ev) => {
            const time = new Date(ev.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            const positive = ev.delta > 0
            return (
              <li
                key={ev.id}
                className="flex items-center gap-2.5 bg-card border-2 border-ink shadow-sticker-sm rounded-2xl py-2.5 px-3.5 text-[14px]"
              >
                <span className="text-ink-soft font-semibold text-[12px] min-w-[40px]">{time}</span>
                <span
                  className="font-bold min-w-[28px] text-center rounded-lg py-0.5 px-1.5 text-[13px]"
                  style={{
                    color: positive ? 'var(--green)' : 'var(--coral)',
                    background: positive ? 'var(--green-soft)' : 'var(--coral-soft)'
                  }}
                >
                  {positive ? '+' : ''}
                  {ev.delta}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-ink font-semibold">{ev.reason}</span>
                  {ev.by && <span className="block text-ink-soft font-semibold text-[11px]">por {ev.by}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Remover registro: ${ev.reason}`}
                  className="flex items-center justify-center w-8 h-8 -mr-1.5 rounded-full text-ink-soft cursor-pointer bg-transparent border-none active:scale-90 transition-transform"
                  onClick={() => handleRemoveEvent(ev)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <PickerSheet
        open={pickerType !== null}
        type={pickerType}
        categories={pickerType === 'gain' ? config.gain : pickerType === 'loss' ? config.loss : []}
        onClose={() => setPickerType(null)}
        onConfirm={handleConfirmEvent}
      />

      <SettingsSheet
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onSaveRules={updateRules}
        onAddCategory={addCategory}
        onRemoveCategory={removeCategory}
        family={family}
        members={members}
        userId={userId}
        pending={pending}
        onLeft={onLeft}
      />

      {undo && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-36px)] max-w-[424px] flex items-center gap-3 bg-ink text-bg rounded-2xl py-3 px-4 shadow-sticker-sm"
          style={{ bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))' }}
        >
          <span className="flex-1 text-[14px] font-semibold truncate">
            {undo.kind === 'added' ? 'Registrado' : 'Removido'}: {undo.event.delta > 0 ? '+' : ''}
            {undo.event.delta} {undo.event.reason}
          </span>
          <button
            type="button"
            className="font-bold text-[14px] text-gold bg-transparent border-none cursor-pointer py-1 px-1"
            onClick={handleUndo}
          >
            Desfazer
          </button>
        </div>
      )}

      <HistorySheet open={historyOpen} history={history} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}
