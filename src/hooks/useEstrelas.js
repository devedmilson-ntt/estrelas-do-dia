import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { FamilyStore } from '../lib/storage.js'

export function useEstrelas(family, { onMembershipLost } = {}) {
  const store = useMemo(() => new FamilyStore(family, { onMembershipLost }), [family.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    store.start()
    return () => store.stop()
  }, [store])

  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot)

  // Últimos 7 dias (6 anteriores + hoje), do mais antigo para o mais novo
  const week = useMemo(
    () => [
      ...snap.past
        .slice(0, 6)
        .reverse()
        .map((d) => ({ date: d.date, goalReached: d.goalReached, hasData: d.hasData, isToday: false })),
      { date: snap.day.date, goalReached: snap.day.goalReached, hasData: true, isToday: true }
    ],
    [snap.past, snap.day]
  )

  const history = useMemo(() => snap.past.filter((d) => d.hasData), [snap.past])

  const actions = useMemo(
    () => ({
      addEvent: (type, label, delta) => store.addEvent(type, label, delta),
      removeEvent: (id) => store.removeEvent(id),
      restoreEvent: (event) => store.restoreEvent(event),
      markRewardUsed: () => store.markRewardUsed(),
      updateRules: (patch) => store.updateRules(patch),
      addCategory: (kind, label, delta) => store.addCategory(kind, label, delta),
      removeCategory: (kind, id) => store.removeCategory(kind, id)
    }),
    [store]
  )

  return { ...snap, week, history, ...actions }
}
