// Entrada na família: login anônimo (invisível) + código da família.
import { supabase } from './supabase.js'
import {
  DEFAULT_CONFIG,
  cacheKey,
  eventToRow,
  newId,
  outboxKey,
  safeGet,
  safeRemove,
  safeSet
} from './storage.js'

const FAMILY_KEY = 'estrelas_family'
const MIGRATED_KEY = 'estrelas_migrated_to'

export function getSavedFamily() {
  return safeGet(FAMILY_KEY, null)
}

function saveFamily(family) {
  safeSet(FAMILY_KEY, family)
}

export function clearSavedFamily() {
  safeRemove(FAMILY_KEY)
}

// "K7Q4XM9P" → "K7Q4-XM9P"
export function formatCode(code) {
  const c = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return c.length > 4 ? c.slice(0, 4) + '-' + c.slice(4, 8) : c
}

export function friendlyError(err) {
  const msg = String(err?.message || err || '')
  if (/fetch|network|Failed|Load failed/i.test(msg)) return 'Sem conexão. Verifique a internet e tente de novo.'
  if (/anonymous/i.test(msg)) return 'O login anônimo está desativado no Supabase (veja o guia de configuração).'
  return 'Algo deu errado. Tente de novo em instantes.'
}

async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function createFamily(name) {
  await ensureSession()
  const legacyConfig = safeGet('estrelas_config', null)
  const { data, error } = await supabase.rpc('create_family', {
    p_display_name: name,
    p_config: legacyConfig || DEFAULT_CONFIG
  })
  if (error) throw error
  const family = { id: data.id, code: data.code, name }
  queueLegacyMigration(family)
  saveFamily(family)
  return family
}

// Devolve null se o código não existir
export async function joinFamily(code, name) {
  await ensureSession()
  const { data, error } = await supabase.rpc('join_family', { p_code: code, p_display_name: name })
  if (error) throw error
  if (!data) return null
  const family = { id: data.id, code: data.code, name }
  saveFamily(family)
  return family
}

export async function leaveFamily(family) {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user?.id
  if (uid) {
    const { error } = await supabase.from('members').delete().eq('family_id', family.id).eq('user_id', uid)
    if (error) throw error
  }
  forgetFamily(family)
}

// Apaga os dados locais desta família neste aparelho
function forgetFamily(family) {
  clearSavedFamily()
  safeRemove(cacheKey(family.id))
  safeRemove(outboxKey(family.id))
}

// Leva os dados da Fase 1 (localStorage deste aparelho) para a família nova.
// As operações entram na mesma fila offline, então são reenviadas até dar certo.
function queueLegacyMigration(family) {
  if (safeGet(MIGRATED_KEY, null)) return
  const cfg = safeGet('estrelas_config', DEFAULT_CONFIG)
  const keys = safeGet('estrelas_days_index', [])
  const ops = []

  for (const key of keys) {
    const day = safeGet('estrelas_day_' + key, null)
    if (!day) continue
    const events = day.events || []
    const sum = events.reduce((s, e) => s + e.delta, 0)
    const stars = typeof day.stars === 'number' ? day.stars : Math.max(0, cfg.baseStars + sum)

    // As regras daquele dia não eram guardadas; reconstrói valores que
    // reproduzem exatamente o saldo e o "meta batida" registrados na época.
    const base = stars > 0 ? stars - sum : cfg.baseStars
    let goal = cfg.goalStars
    if (day.goalReached && goal > stars) goal = Math.max(1, stars)
    if (!day.goalReached && goal <= stars) goal = stars + 1

    ops.push({
      kind: 'upsertDay',
      row: {
        date: key,
        base_stars: base,
        goal_stars: goal,
        reward_used_at: day.rewardUsed ? day.rewardUsedAt || Date.now() : null,
        reward_used_by: null
      }
    })
    for (const e of events) {
      ops.push({
        kind: 'upsertEvent',
        row: eventToRow(family.id, {
          id: newId(),
          date: key,
          delta: e.delta,
          reason: String(e.reason || 'Registro').slice(0, 80),
          time: e.time,
          by: null
        })
      })
    }
  }

  if (ops.length) safeSet(outboxKey(family.id), [...safeGet(outboxKey(family.id), []), ...ops])
  safeSet(MIGRATED_KEY, family.id)
}

// ---- Convite -------------------------------------------------------------

export function inviteText(code) {
  const url = `${location.origin}/?codigo=${formatCode(code)}`
  return `Entre na nossa família no app Estrelas do dia!\nCódigo: ${formatCode(code)}\n${url}`
}

export function whatsappLink(text) {
  return 'https://wa.me/?text=' + encodeURIComponent(text)
}

// Janela de compartilhar do sistema. Só existe em https e em parte dos
// navegadores — por isso quem chama sempre tem um plano B.
export async function nativeShare(text) {
  if (!navigator.share || !window.isSecureContext) return 'unsupported'
  try {
    await navigator.share({ title: 'Estrelas do dia', text })
    return 'shared'
  } catch (e) {
    return e?.name === 'AbortError' ? 'cancelled' : 'unsupported'
  }
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // cai no método antigo abaixo
  }
  // Método antigo: funciona também em http e navegadores mais velhos
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
