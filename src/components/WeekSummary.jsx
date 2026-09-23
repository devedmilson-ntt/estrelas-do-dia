import { WEEKDAY_ABBR } from '../lib/dates.js'

export default function WeekSummary({ week, visible, onToggle, isWeekendToday }) {
  const count = week.filter((w) => w.goalReached).length

  return (
    <div>
      {visible && (
        <div className="sticker-card shadow-sticker px-[18px] py-4 mb-[22px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-[16px] text-ink m-0">Resumo da semana</h2>
            <span className="font-bold text-[14px] text-violet">{count} de 7</span>
          </div>
          <div className="flex justify-between gap-1">
            {week.map((w) => {
              const dt = new Date(w.date + 'T00:00:00')
              return (
                <div key={w.date} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] text-ink"
                    style={{
                      background: w.goalReached ? 'var(--gold)' : 'var(--card)',
                      border: `2px solid ${w.goalReached ? 'var(--ink)' : 'var(--star-empty)'}`,
                      opacity: w.hasData ? 1 : 0.4,
                      boxShadow: w.isToday ? '0 0 0 2px var(--violet)' : 'none'
                    }}
                  >
                    {w.goalReached ? '★' : ''}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-soft">{WEEKDAY_ABBR[dt.getDay()]}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {!isWeekendToday && (
        <button
          type="button"
          className="block w-full text-center bg-transparent border-none text-violet font-bold text-[13px] pt-0.5 pb-[18px] cursor-pointer"
          aria-expanded={visible}
          onClick={onToggle}
        >
          {visible ? 'Ocultar resumo da semana' : 'Ver resumo da semana'}
        </button>
      )}
    </div>
  )
}
