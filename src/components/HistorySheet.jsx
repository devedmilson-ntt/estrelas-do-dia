import Sheet from './Sheet.jsx'

export default function HistorySheet({ open, history, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Histórico">
      <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
        {history.length === 0 && (
          <li className="text-ink-soft font-semibold text-[14px] px-1 py-2.5 list-none">
            Ainda não há dias anteriores.
          </li>
        )}
        {history.map((d) => {
          const dateLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
          })
          const badge = d.goalReached ? (d.rewardUsed ? 'Nintendo usado' : 'Meta batida') : 'Sem meta'
          return (
            <li
              key={d.date}
              className="flex items-center justify-between bg-bg border-2 rounded-[14px] py-2.5 px-3.5 text-[14px] font-semibold"
              style={{ borderColor: 'var(--line)' }}
            >
              <span className="text-ink-soft">{dateLabel}</span>
              <span className="font-bold text-ink">{d.stars}★</span>
              <span className="text-[12px] text-ink-soft">{badge}</span>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
