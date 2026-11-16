export const BRAZIL_TIME_ZONE = 'America/Sao_Paulo'

function pad(value) {
  return String(value).padStart(2, '0')
}

export function todayIsoBrazil() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

export function isoToBr(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return ''
  const [year, month, day] = String(iso).split('-')
  return `${day}/${month}/${year}`
}

export function brToIso(value) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) return null
  return `${year}-${month}-${day}`
}

export function formatDateBR(value) {
  if (!value) return '—'
  const iso = String(value).slice(0, 10)
  return isoToBr(iso) || String(value)
}

export function formatDateTimeBR(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function maskBrDate(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function isValidIsoDate(value) {
  return Boolean(brToIso(isoToBr(value)))
}
