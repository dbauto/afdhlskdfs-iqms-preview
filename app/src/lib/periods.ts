/**
 * Dates and reporting periods. Records keep ISO dates (YYYY-MM-DD) beside the short display
 * strings in the sample data, so figures can be worked out for a period (plan v3 §17 and §22).
 */

/** A reporting period, first and last day included. */
export interface Period {
  start: string
  end: string
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const pad = (n: number) => String(n).padStart(2, "0")

export function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today as an ISO date, in the person's time zone. */
export function todayIso() {
  return toIso(new Date())
}

export function isIsoDate(s?: string): boolean {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** A local date at noon, so time zones never move it to another day. */
export function fromIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(iso: string, days: number) {
  const d = fromIso(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}

export function addMonths(iso: string, months: number) {
  const d = fromIso(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toIso(d)
}

export function daysBetween(a: string, b: string) {
  return Math.round((fromIso(b).getTime() - fromIso(a).getTime()) / 86400000)
}

/**
 * Reads the short dates used in the sample data: "4 Oct", "Closed 18 Sep", "14 Sep 2025",
 * "Dec 2025", "Today". Without a year, the date is taken as the latest one on or before
 * `notAfter` (or the earliest on or after `notBefore`). Returns undefined when it isn't a date.
 */
export function parseDisplayDate(s: string | undefined, o: { year?: number; notAfter?: string; notBefore?: string } = {}): string | undefined {
  if (!s) return undefined
  const t = s.replace(/^(Closed|Done|Due|By)\s+/i, "").trim()
  if (/^today$/i.test(t) || /^just now$/i.test(t)) return todayIso()
  if (isIsoDate(t)) return t
  let m = t.match(/^(\d{1,2}) ([A-Z][a-z]{2})[a-z]*(?: (\d{4}))?$/)
  if (m) {
    const mi = MONTHS.indexOf(m[2])
    if (mi < 0) return undefined
    const day = Number(m[1])
    if (m[3]) return `${m[3]}-${pad(mi + 1)}-${pad(day)}`
    if (o.year) return `${o.year}-${pad(mi + 1)}-${pad(day)}`
    const ref = fromIso(o.notAfter ?? o.notBefore ?? todayIso()).getFullYear()
    for (const y of o.notBefore && !o.notAfter ? [ref, ref + 1] : [ref, ref - 1]) {
      const iso = `${y}-${pad(mi + 1)}-${pad(day)}`
      if (o.notBefore && !o.notAfter ? iso >= o.notBefore : iso <= (o.notAfter ?? todayIso())) return iso
    }
    return `${ref}-${pad(mi + 1)}-${pad(day)}`
  }
  m = t.match(/^([A-Z][a-z]{2})[a-z]* (\d{4})$/)
  if (m) {
    const mi = MONTHS.indexOf(m[1])
    if (mi < 0) return undefined
    return toIso(new Date(Number(m[2]), mi + 1, 0, 12))
  }
  return undefined
}

/** "4 Nov 2026" */
export function formatDate(iso?: string, o: { year?: boolean } = {}) {
  if (!isIsoDate(iso)) return iso ?? ""
  const d = fromIso(iso as string)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${o.year === false ? "" : ` ${d.getFullYear()}`}`
}

/** "4 November 2026" */
export function formatLongDate(iso: string) {
  const d = fromIso(iso)
  return `${d.getDate()} ${LONG[d.getMonth()]} ${d.getFullYear()}`
}

/** "1 July 2026 – 30 September 2026" */
export function formatPeriod(p: Period) {
  return `${formatLongDate(p.start)} – ${formatLongDate(p.end)}`
}

/** Is this date inside the period? Days at either end count. */
export function inPeriod(date: string | undefined, p: Period) {
  return !!date && date >= p.start && date <= p.end
}

/** The period of the same length just before this one. */
export function previousPeriod(p: Period): Period {
  const len = daysBetween(p.start, p.end)
  const end = addDays(p.start, -1)
  return { start: addDays(end, -len), end }
}

/* ---------------- Result periods for objectives: "2026-07" (month) or "2026-Q3" (quarter) ---------------- */

export function resultPeriodRange(key: string): Period {
  const q = key.match(/^(\d{4})-Q([1-4])$/)
  if (q) {
    const y = Number(q[1])
    const first = (Number(q[2]) - 1) * 3
    return { start: `${y}-${pad(first + 1)}-01`, end: toIso(new Date(y, first + 3, 0, 12)) }
  }
  const [y, m] = key.split("-").map(Number)
  return { start: `${y}-${pad(m)}-01`, end: toIso(new Date(y, m, 0, 12)) }
}

/** A result belongs to a reporting period when its own month or quarter ends inside it. */
export function resultInPeriod(key: string, p: Period) {
  return inPeriod(resultPeriodRange(key).end, p)
}

/** "July 2026" or "Q3 2026" */
export function resultPeriodLabel(key: string) {
  const q = key.match(/^(\d{4})-Q([1-4])$/)
  if (q) return `Q${q[2]} ${q[1]}`
  const [y, m] = key.split("-").map(Number)
  return `${LONG[m - 1]} ${y}`
}

/** The month or quarter a date falls in. */
export function resultPeriodOf(iso: string, frequency: "monthly" | "quarterly") {
  const d = fromIso(iso)
  return frequency === "quarterly" ? `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}` : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** The month or quarter after this one. */
export function nextResultPeriod(key: string) {
  const q = key.match(/^(\d{4})-Q([1-4])$/)
  if (q) return Number(q[2]) === 4 ? `${Number(q[1]) + 1}-Q1` : `${q[1]}-Q${Number(q[2]) + 1}`
  const [y, m] = key.split("-").map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`
}

export function previousResultPeriod(key: string) {
  const q = key.match(/^(\d{4})-Q([1-4])$/)
  if (q) return Number(q[2]) === 1 ? `${Number(q[1]) - 1}-Q4` : `${q[1]}-Q${Number(q[2]) - 1}`
  const [y, m] = key.split("-").map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
}

/** The last few months or quarters up to today, newest first, for a result picker. */
export function recentResultPeriods(frequency: "monthly" | "quarterly", count = 6) {
  let k = resultPeriodOf(todayIso(), frequency)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    out.push(k)
    k = previousResultPeriod(k)
  }
  return out
}
