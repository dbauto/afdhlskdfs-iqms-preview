import { addDays, daysBetween, formatDate, todayIso } from "@/lib/periods"

/**
 * The external certification cycle (ISO/IEC 17021-1): an initial certification in two stages,
 * surveillance audits in years 1 and 2, then recertification before the certificate expires.
 * Recertification is normally one audit; a Stage 1 is added only after significant changes.
 */
export type CertificationKind = "initial" | "surveillance1" | "surveillance2" | "recertification"

export interface CertificationSettings {
  body: string
  kind: CertificationKind
  /** recertification only: significant changes (new site, scope, processes) need a Stage 1 again */
  stage1Needed: boolean
  /** ISO dates; empty when not booked */
  mock: string
  stage1: string
  /** Stage 2, the surveillance audit or the recertification audit */
  main: string
  expiry: string
}

export const CERTIFICATION_KINDS: { value: CertificationKind; label: string; hint: string }[] = [
  { value: "initial", label: "Initial certification", hint: "Stage 1 (documents and readiness), then Stage 2 on site" },
  { value: "surveillance1", label: "Surveillance, year 1", hint: "One audit of part of the QMS, a year after certification" },
  { value: "surveillance2", label: "Surveillance, year 2", hint: "One audit of part of the QMS, two years after certification" },
  { value: "recertification", label: "Recertification", hint: "One audit of the whole QMS before the certificate expires" },
]

export const DEFAULT_CERTIFICATION: CertificationSettings = {
  body: "Example Certification Body Inc.",
  kind: "initial",
  stage1Needed: false,
  mock: "2026-11-06",
  stage1: "2026-11-20",
  main: "2027-01-15",
  expiry: "",
}

export interface Milestone {
  key: string
  label: string
  /** short name for badges: "Stage 1", "Mock audit" */
  short: string
  date: string
  audit: boolean
}

/** The dates on the certification timeline, in order, for the current kind of cycle. */
export function milestones(c: CertificationSettings): Milestone[] {
  const out: Milestone[] = []
  const add = (key: string, label: string, short: string, date: string, audit = true) => date && out.push({ key, label, short, date, audit })
  add("mock", "Mock audit", "Mock audit", c.mock)
  if (c.kind === "initial") {
    add("stage1", "Stage 1 audit", "Stage 1", c.stage1)
    add("main", "Stage 2 audit", "Stage 2", c.main)
  } else if (c.kind === "recertification") {
    if (c.stage1Needed) add("stage1", "Stage 1 audit (significant changes)", "Stage 1", c.stage1)
    add("main", "Recertification audit", "Recertification", c.main)
  } else {
    const year = c.kind === "surveillance1" ? 1 : 2
    add("main", `Surveillance audit, year ${year}`, "Surveillance", c.main)
  }
  if (c.kind !== "initial") add("expiry", "Certificate expires", "Expiry", c.expiry, false)
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** The next audit still to come (the mock audit counts), for headline badges. */
export function nextAudit(c: CertificationSettings, today = todayIso()) {
  const m = milestones(c).find((x) => x.audit && x.date >= today)
  return m ? { ...m, days: daysBetween(today, m.date) } : undefined
}

export function whenText(date: string, today = todayIso()) {
  const d = daysBetween(today, date)
  return d === 0 ? "Today" : d > 0 ? `In ${d} day${d === 1 ? "" : "s"}` : `${-d} day${d === -1 ? "" : "s"} ago`
}

export const dateText = (iso: string) => formatDate(iso)
export const plusDays = addDays
