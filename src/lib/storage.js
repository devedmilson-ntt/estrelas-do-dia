// Camada de persistência — Fase 2: Supabase, compartilhado entre aparelhos.
//
// Como funciona:
//  - "server" é a última cópia conhecida dos dados do banco (últimos 30 dias
//    + regras). Fica em cache no localStorage para o app abrir na hora,
//    mesmo sem internet.
//  - Toda alteração vira uma operação numa fila ("outbox"), também salva no
//    localStorage, e é enviada ao banco em ordem. Sem internet, ela espera e
//    é reenviada quando a conexão voltar.
//  - O que aparece na tela é sempre: server + operações ainda na fila.
//  - O saldo de estrelas nunca é gravado: é recalculado a partir dos
//    registros (recompute), então nunca fica inconsistente.

import { supabase } from './supabase.js'
import { addDays, dateKey } from './dates.js'

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

const PAST_DAYS = 30

export function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage indisponível (modo privado, quota etc.) — falha silenciosa
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // idem
  }
}

export function recompute(events, baseStars, goalStars) {
  const stars = Math.max(0, events.reduce((sum, e) => sum + e.delta, baseStars))
  return { stars, goalReached: stars >= goalStars }
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback para navegadores antigos (UUID v4)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function cacheKey(familyId) {
  return 'estrelas_cache_' + familyId
}

export function outboxKey(familyId) {
  return 'estrelas_outbox_' + familyId
}

function eventFromRow(r) {
  return {
    id: r.id,
    date: r.date,
    delta: r.delta,
    reason: r.reason,
    time: Number(r.time),
    by: r.created_by_name || null
  }
}

export function eventToRow(familyId, e) {
  return {
    id: e.id,
    family_id: familyId,
    date: e.date,
    delta: e.delta,
    reason: e.reason,
    time: e.time,
    created_by_name: e.by
  }
}

// Aplica operações (ainda não confirmadas pelo banco) sobre uma cópia do server.
function applyOps(server, ops) {
  let events = server.events
  const days = { ...server.days }
  let config = server.config
  for (const op of ops) {
    if (op.kind === 'upsertEvent') {
      events = [...events.filter((e) => e.id !== op.row.id), eventFromRow(op.row)]
    } else if (op.kind === 'deleteEvent') {
      events = events.filter((e) => e.id !== op.id)
    } else if (op.kind === 'upsertDay') {
      const prev = days[op.row.date]
      if (!(op.ignoreDuplicates && prev)) days[op.row.date] = { ...prev, ...op.row }
    } else if (op.kind === 'setConfig') {
      config = op.config
    }
  }
  return { ...server, events, days, config }
}

// 0 = sem conexão; 401/408/429/5xx = temporário. O resto (ex.: 403 de
// segurança) não vai se resolver tentando de novo.
function isRetryable(status) {
  return status === 0 || status === 401 || status === 408 || status === 429 || status >= 500
}

export class FamilyStore {
  constructor(family, { onMembershipLost } = {}) {
    this.family = family // { id, code, name }
    this.onMembershipLost = onMembershipLost
    this.date = dateKey()
    const cached = safeGet(cacheKey(family.id), null)
    this.server = cached || { config: DEFAULT_CONFIG, events: [], days: {}, members: [] }
    this.loaded = !!cached
    this.outbox = safeGet(outboxKey(family.id), [])
    this.online = typeof navigator === 'undefined' ? true : navigator.onLine
    this.userId = null
    this.listeners = new Set()
    this.flushing = false
    this.flushVersion = 0
    this.retryDelay = 3000
    this.retryTimer = null
    this.refreshTimer = null
    this.refreshing = null
    this.refreshAgain = false
    this.realtimeOk = false
    this.snapshot = this.buildSnapshot()
  }

  // ---- ciclo de vida -------------------------------------------------------

  start() {
    this.stopped = false
    supabase.auth.getSession().then(({ data }) => {
      this.userId = data.session?.user?.id || null
      this.emit()
    })

    const fid = this.family.id
    this.channel = supabase
      // nome único: no modo de desenvolvimento o React monta tudo duas vezes
      .channel('familia-' + fid + '-' + newId().slice(0, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${fid}` }, () =>
        this.scheduleRefresh()
      )
      // Exclusões chegam só com o id (sem family_id), então não dá para filtrar
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, (payload) => {
        if (this.server.events.some((e) => e.id === payload.old?.id)) this.scheduleRefresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'days', filter: `family_id=eq.${fid}` }, () =>
        this.scheduleRefresh()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families', filter: `id=eq.${fid}` }, () =>
        this.scheduleRefresh()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `family_id=eq.${fid}` }, () =>
        this.scheduleRefresh()
      )
      .subscribe((status) => {
        this.realtimeOk = status === 'SUBSCRIBED'
        if (this.realtimeOk) this.scheduleRefresh()
      })

    this.onOnline = () => {
      this.online = true
      this.emit()
      this.flush()
      this.scheduleRefresh()
    }
    this.onOffline = () => {
      this.online = false
      this.emit()
    }
    this.onVisible = () => {
      if (document.visibilityState === 'visible') {
        this.checkDate()
        this.flush()
        this.scheduleRefresh()
      }
    }
    window.addEventListener('online', this.onOnline)
    window.addEventListener('offline', this.onOffline)
    document.addEventListener('visibilitychange', this.onVisible)

    // Virada do dia + plano B caso o tempo real caia (comum no celular)
    this.tick = setInterval(() => {
      this.checkDate()
      if (!this.realtimeOk && document.visibilityState === 'visible') this.scheduleRefresh()
    }, 60 * 1000)

    this.refresh()
    this.flush()
  }

  stop() {
    this.stopped = true
    if (this.channel) supabase.removeChannel(this.channel)
    window.removeEventListener('online', this.onOnline)
    window.removeEventListener('offline', this.onOffline)
    document.removeEventListener('visibilitychange', this.onVisible)
    clearInterval(this.tick)
    clearTimeout(this.retryTimer)
    clearTimeout(this.refreshTimer)
  }

  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snapshot

  emit() {
    this.snapshot = this.buildSnapshot()
    this.listeners.forEach((fn) => fn())
  }

  checkDate() {
    const key = dateKey()
    if (key !== this.date) {
      this.date = key
      this.emit()
      this.scheduleRefresh()
    }
  }

  // ---- leitura do banco ----------------------------------------------------

  scheduleRefresh() {
    clearTimeout(this.refreshTimer)
    this.refreshTimer = setTimeout(() => this.refresh(), 300)
  }

  async refresh() {
    if (this.refreshing) {
      this.refreshAgain = true
      return this.refreshing
    }
    this.refreshing = (async () => {
      // Se algo foi enviado enquanto buscávamos, a resposta pode estar
      // desatualizada — busca de novo (evita um registro "piscar").
      for (let attempt = 0; attempt < 3; attempt++) {
        this.refreshAgain = false
        const version = this.flushVersion
        const ok = await this.fetchAll()
        if (!ok || this.stopped) break
        if (version === this.flushVersion && !this.refreshAgain) break
      }
    })()
    try {
      await this.refreshing
    } finally {
      this.refreshing = null
    }
  }

  async fetchAll() {
    const fid = this.family.id
    const from = addDays(this.date, -PAST_DAYS)
    const [fam, evs, days, members] = await Promise.all([
      supabase.from('families').select('code, config').eq('id', fid).maybeSingle(),
      supabase.from('events').select('*').eq('family_id', fid).gte('date', from).order('time'),
      supabase.from('days').select('*').eq('family_id', fid).gte('date', from),
      supabase.from('members').select('user_id, display_name').eq('family_id', fid).order('joined_at')
    ])
    if (this.stopped) return false
    const failed = [fam, evs, days, members].find((r) => r.error)
    if (failed) {
      if (failed.status === 0) {
        this.online = false
        this.emit()
      }
      return false
    }
    // A consulta funcionou mas a família não veio: este aparelho não é mais membro
    if (!fam.data) {
      this.onMembershipLost?.()
      return false
    }

    this.online = true
    this.server = {
      config: fam.data.config,
      events: evs.data.map(eventFromRow),
      days: Object.fromEntries(days.data.map((d) => [d.date, d])),
      members: members.data
    }
    this.loaded = true
    safeSet(cacheKey(fid), this.server)
    this.emit()
    return true
  }

  // ---- escrita: fila de operações -----------------------------------------

  enqueue(...ops) {
    this.outbox = [...this.outbox, ...ops]
    safeSet(outboxKey(this.family.id), this.outbox)
    this.emit()
    this.flush()
  }

  async send(op) {
    const fid = this.family.id
    if (op.kind === 'upsertEvent') return supabase.from('events').upsert(op.row)
    if (op.kind === 'deleteEvent') return supabase.from('events').delete().eq('id', op.id).eq('family_id', fid)
    if (op.kind === 'upsertDay') {
      return supabase
        .from('days')
        .upsert({ ...op.row, family_id: fid }, { onConflict: 'family_id,date', ignoreDuplicates: !!op.ignoreDuplicates })
    }
    if (op.kind === 'setConfig') return supabase.from('families').update({ config: op.config }).eq('id', fid)
    return { error: null }
  }

  async flush() {
    if (this.flushing || this.stopped) return
    this.flushing = true
    clearTimeout(this.retryTimer)
    try {
      while (this.outbox.length && !this.stopped) {
        const op = this.outbox[0]
        const { error, status } = await this.send(op)
        if (error && isRetryable(status)) {
          if (status === 0) this.online = false
          this.retryTimer = setTimeout(() => this.flush(), this.retryDelay)
          this.retryDelay = Math.min(this.retryDelay * 2, 60000)
          break
        }
        if (error) console.warn('Operação recusada pelo servidor, descartada:', op, error)
        else this.server = applyOps(this.server, [op]) // o banco agora já tem esta operação

        this.retryDelay = 3000
        this.online = true
        this.flushVersion++
        this.outbox = this.outbox.slice(1)
        safeSet(outboxKey(this.family.id), this.outbox)
        safeSet(cacheKey(this.family.id), this.server)
      }
    } finally {
      this.flushing = false
      this.emit()
    }
  }

  // ---- visão para a tela ---------------------------------------------------

  buildSnapshot() {
    const view = applyOps(this.server, this.outbox)
    const { config } = view
    const today = this.date

    const todayEvents = view.events.filter((e) => e.date === today).sort((a, b) => a.time - b.time)
    const todayRow = view.days[today]
    const day = {
      date: today,
      events: todayEvents,
      // Hoje sempre segue as regras atuais (mudar a meta afeta o dia corrente)
      ...recompute(todayEvents, config.baseStars, config.goalStars),
      rewardUsed: !!todayRow?.reward_used_at,
      rewardUsedAt: todayRow?.reward_used_at ? Number(todayRow.reward_used_at) : null,
      rewardUsedBy: todayRow?.reward_used_by || null
    }

    // Dias anteriores usam as regras gravadas naquele dia
    const past = []
    for (let i = 1; i <= PAST_DAYS; i++) {
      const date = addDays(today, -i)
      const row = view.days[date]
      const evs = view.events.filter((e) => e.date === date)
      const { stars, goalReached } = recompute(
        evs,
        row?.base_stars ?? config.baseStars,
        row?.goal_stars ?? config.goalStars
      )
      past.push({
        date,
        stars,
        goalReached,
        rewardUsed: !!row?.reward_used_at,
        hasData: !!row || evs.length > 0
      })
    }

    return {
      loaded: this.loaded,
      online: this.online,
      pending: this.outbox.length,
      family: this.family,
      userId: this.userId,
      members: view.members || [],
      config,
      day,
      past
    }
  }

  // ---- ações -------------------------------------------------------------

  // Garante a linha do dia com as regras vigentes (para o histórico)
  dayRowOp(extra = {}, ignoreDuplicates = false) {
    const { config } = this.snapshot
    return {
      kind: 'upsertDay',
      ignoreDuplicates,
      row: { date: this.date, base_stars: config.baseStars, goal_stars: config.goalStars, ...extra }
    }
  }

  addEvent(type, label, delta) {
    this.checkDate()
    const signed = type === 'gain' ? Math.abs(delta) : -Math.abs(delta)
    const event = {
      id: newId(),
      date: this.date,
      delta: signed,
      reason: label,
      time: Date.now(),
      by: this.family.name
    }
    this.enqueue(this.dayRowOp({}, true), { kind: 'upsertEvent', row: eventToRow(this.family.id, event) })
    return event
  }

  removeEvent(id) {
    this.enqueue({ kind: 'deleteEvent', id })
  }

  // Desfaz uma remoção — só vale para registros de hoje
  restoreEvent(event) {
    this.checkDate()
    if (event.date !== this.date) return
    this.enqueue({ kind: 'upsertEvent', row: eventToRow(this.family.id, event) })
  }

  markRewardUsed() {
    this.enqueue(this.dayRowOp({ reward_used_at: Date.now(), reward_used_by: this.family.name }))
  }

  setConfig(config) {
    this.enqueue({ kind: 'setConfig', config })
  }

  updateRules(patch) {
    const config = { ...this.snapshot.config, ...patch }
    this.enqueue(
      { kind: 'setConfig', config },
      {
        kind: 'upsertDay',
        row: { date: this.date, base_stars: config.baseStars, goal_stars: config.goalStars }
      }
    )
  }

  addCategory(kind, label, delta) {
    const config = this.snapshot.config
    this.setConfig({ ...config, [kind]: [...config[kind], { id: kind[0] + Date.now(), label, delta }] })
  }

  removeCategory(kind, id) {
    const config = this.snapshot.config
    this.setConfig({ ...config, [kind]: config[kind].filter((c) => c.id !== id) })
  }
}
