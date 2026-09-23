// Camada de persistência — Fase 1: localStorage (por dispositivo).
// Para sincronizar entre dispositivos no futuro (Fase 2), troque as
// funções abaixo por chamadas a um backend (ex: Supabase) mantendo
// a mesma assinatura: getConfig/setConfig/getDay/setDay/listDayKeys.

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage indisponível (modo privado, quota etc.) — falha silenciosa
  }
}

export const DEFAULT_CONFIG = {
  baseStars: 5,
  goalStars: 8,
  rewardMinutes: 60,
  gain: [
    { id: 'g1', label: 'Ajudou nas tarefas', delta: 1 },
    { id: 'g2', label: 'Fez a lição de casa', delta: 1 },
    { id: 'g3', label: 'Foi gentil / dividiu', delta: 1 },
    { id: 'g4', label: 'Comeu bem / dormiu na hora', delta: 1 }
  ],
  loss: [
    { id: 'l1', label: 'Não obedeceu', delta: 1 },
    { id: 'l2', label: 'Respondeu com grosseria', delta: 1 },
    { id: 'l3', label: 'Brigou com irmão(ã)', delta: 2 },
    { id: 'l4', label: 'Mentiu', delta: 2 }
  ]
}

export function getConfig() {
  return safeGet('estrelas_config', DEFAULT_CONFIG)
}

export function setConfig(cfg) {
  safeSet('estrelas_config', cfg)
}

export function emptyDay(key, cfg) {
  return { date: key, stars: cfg.baseStars, events: [], goalReached: false, rewardUsed: false, rewardUsedAt: null }
}

export function getDay(key, cfg) {
  return safeGet('estrelas_day_' + key, null) || emptyDay(key, cfg)
}

export function setDay(day) {
  safeSet('estrelas_day_' + day.date, day)
  const idx = safeGet('estrelas_days_index', [])
  if (!idx.includes(day.date)) {
    idx.push(day.date)
    idx.sort()
    safeSet('estrelas_days_index', idx.slice(-90))
  }
}

export function listDayKeys(excludeKey) {
  const idx = safeGet('estrelas_days_index', [])
  return idx.filter((k) => k !== excludeKey).sort().reverse()
}
