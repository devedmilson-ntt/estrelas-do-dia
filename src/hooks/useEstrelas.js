import { useCallback, useEffect, useState } from 'react'
import { dateKey, lastSevenDayKeys } from '../lib/dates.js'
import * as store from '../lib/storage.js'

function recompute(day, cfg) {
  const total = day.events.reduce((sum, e) => sum + e.delta, cfg.baseStars)
  const stars = Math.max(0, total)
  return { ...day, stars, goalReached: stars >= cfg.goalStars }
}

export function useEstrelas() {
  const [config, setConfigState] = useState(() => store.getConfig())
  const [day, setDayState] = useState(() => {
    const cfg = store.getConfig()
    return recompute(store.getDay(dateKey(), cfg), cfg)
  })

  // Persiste config sempre que muda
  useEffect(() => {
    store.setConfig(config)
  }, [config])

  // Persiste o dia sempre que muda
  useEffect(() => {
    store.setDay(day)
  }, [day])

  // Verifica virada de dia a cada minuto (o app fica aberto no fim do dia,
  // então isso garante o reset automático sem precisar recarregar a página)
  useEffect(() => {
    const id = setInterval(() => {
      const key = dateKey()
      if (key !== day.date) {
        setDayState(recompute(store.getDay(key, config), config))
      }
    }, 60 * 1000)
    return () => clearInterval(id)
  }, [day.date, config])

  const addEvent = useCallback(
    (type, label, delta) => {
      const signed = type === 'gain' ? Math.abs(delta) : -Math.abs(delta)
      setDayState((prev) => {
        const withEvent = {
          ...prev,
          events: [
            ...prev.events,
            {
              id: 'e' + Date.now() + Math.random().toString(16).slice(2, 6),
              delta: signed,
              reason: label,
              time: Date.now()
            }
          ]
        }
        return recompute(withEvent, config)
      })
    },
    [config]
  )

  const markRewardUsed = useCallback(() => {
    setDayState((prev) => ({ ...prev, rewardUsed: true, rewardUsedAt: Date.now() }))
  }, [])

  const updateRules = useCallback((patch) => {
    setConfigState((prev) => {
      const next = { ...prev, ...patch }
      setDayState((d) => recompute(d, next))
      return next
    })
  }, [])

  const addCategory = useCallback((kind, label, delta) => {
    setConfigState((prev) => ({
      ...prev,
      [kind]: [...prev[kind], { id: kind[0] + Date.now(), label, delta }]
    }))
  }, [])

  const removeCategory = useCallback((kind, id) => {
    setConfigState((prev) => ({
      ...prev,
      [kind]: prev[kind].filter((c) => c.id !== id)
    }))
  }, [])

  const getWeekSummary = useCallback(() => {
    const keys = lastSevenDayKeys()
    return keys.map((k) => {
      const d = k === day.date ? day : store.getDay(k, config)
      let hasData = k === day.date
      if (!hasData) {
        try {
          hasData = localStorage.getItem('estrelas_day_' + k) !== null
        } catch {
          hasData = false
        }
      }
      return { date: k, goalReached: !!d.goalReached, hasData, isToday: k === day.date }
    })
  }, [day, config])

  const getHistory = useCallback(
    (limit = 30) => {
      return store
        .listDayKeys(day.date)
        .slice(0, limit)
        .map((k) => store.getDay(k, config))
    },
    [day.date, config]
  )

  return {
    config,
    day,
    addEvent,
    markRewardUsed,
    updateRules,
    addCategory,
    removeCategory,
    getWeekSummary,
    getHistory
  }
}
