/**
 * Audit plans with a timetable: mock audits by the consultant, certification audits (Stage 1, Stage 2,
 * surveillance, recertification) and whole-system internal audits. The same workflow for all of them;
 * only the auditors differ. Each plan has a checklist, an evidence pack worked out from the records,
 * findings and a report. Per-process internal audits keep their own pages.
 */

export const PLAN_KINDS = ["Mock audit", "Stage 1", "Stage 2", "Surveillance", "Recertification", "Internal audit"] as const
export type PlanKind = (typeof PLAN_KINDS)[number]
export const PLAN_KIND_HINT: Record<PlanKind, string> = {
  "Mock audit": "Practice run by your consultant",
  "Stage 1": "Documents and readiness",
  "Stage 2": "Full certification audit",
  Surveillance: "Years 1 and 2",
  Recertification: "Before the certificate expires",
  "Internal audit": "Your own auditors, the whole QMS",
}
/** Certification body audits use their own checklist; their findings are recorded as received. */
export const isExternal = (k: PlanKind): boolean => ["Stage 1", "Stage 2", "Surveillance", "Recertification"].includes(k)

/** Done by someone outside the company: the consultant's mock audit or the certification body. */
export const byOutsider = (k: PlanKind) => k !== "Internal audit"
export const EXTERNAL_KINDS = ["Mock audit", "Stage 1", "Stage 2", "Surveillance", "Recertification"] as const satisfies readonly PlanKind[]

/** How often an internal audit repeats, and the months between audits. */
export const FREQUENCIES = [
  { value: "Quarterly", hint: "4 a year", months: 3 },
  { value: "Bi-annual", hint: "2 a year, 6 months apart", months: 6 },
  { value: "Annual", hint: "Once a year", months: 12 },
] as const
export type Frequency = (typeof FREQUENCIES)[number]["value"]

/** A plan saved as a template: the timetable, areas, auditor roles and checklist, without dates, names or results. */
export interface SavedPlanTemplate { id: string; name: string; internal: boolean; hours: string; objectives: string[]; criteria: string[]; roles: string[]; slots: PlanSlot[]; questions: { slotId: string; text: string; clause: string }[] }

/** The dates of an internal audit series: the first date, then every `months` until `until`. ISO dates. */
export function seriesDates(first: string, months: number, until: string, max = 12) {
  const out: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) return out
  const [y, m, d] = first.split("-").map(Number)
  for (let k = 0; k < max; k++) {
    const dt = new Date(Date.UTC(y, m - 1 + k * months, 1))
    const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate()
    const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`
    if (until && iso > until) break
    out.push(iso)
  }
  return out
}

/** "Internal audit, Q1 2027", "Internal audit, H2 2027" or "Internal audit, 2027". */
export function seriesTitle(date: string, frequency: Frequency) {
  const y = date.slice(0, 4)
  const month = Number(date.slice(5, 7))
  if (frequency === "Quarterly") return `Internal audit, Q${Math.ceil(month / 3)} ${y}`
  if (frequency === "Bi-annual") return `Internal audit, H${month <= 6 ? 1 : 2} ${y}`
  return `Internal audit, ${y}`
}

export interface PlanAuditor { name: string; role: string }
export interface PlanSlot {
  id: string
  time: string
  /** opening, lunch, report writing and closing span every auditor */
  shared?: boolean
  area: string
  topics: string
  auditor?: number
  processes: string[]
  clauses: string[]
}
export const RESULTS = ["Conforms", "Opportunity", "Minor", "Major", "Not checked"] as const
export type QResult = (typeof RESULTS)[number]
export interface PlanQuestion { id: string; slotId: string; text: string; clause: string; result: QResult; note?: string }
export type FindingGrade = "Major" | "Minor" | "Opportunity"
export interface PlanFinding { id: string; title: string; detail: string; grade: FindingGrade; clause: string; slotId?: string; fromQuestion?: string; ncId?: string; improvementId?: string }
export type PlanStatus = "Draft" | "Planned" | "In progress" | "Report released"
export const PRINT_PARTS = ["Logo and company name", "Plan details", "Objectives and criteria", "Scope", "Timetable", "Clause numbers in each slot", "Signature lines"] as const

export interface AuditPlan {
  id: string
  kind: PlanKind
  title: string
  auditedBy: string
  date: string
  hours: string
  standard: string
  sites: string
  scope: string
  objectives: string[]
  criteria: string[]
  auditors: PlanAuditor[]
  slots: PlanSlot[]
  questions: PlanQuestion[]
  findings: PlanFinding[]
  /** evidence added to, or taken out of, a slot's pack by hand */
  packAdded?: { slotId: string; evidenceId: string }[]
  packRemoved?: { slotId: string; evidenceId: string }[]
  print: { show: string[]; paper: "A4 portrait" | "A4 landscape" }
  status: PlanStatus
  summary?: string
  verdict?: string
  releasedOn?: string
  releasedBy?: string
  /** top management accepted the report and the fix plan (Management review › Needs you) */
  acceptedOn?: string
  acceptedBy?: string
  decision?: { choice: string; words: string; by: string; on: string }
  /** an internal audit created as one of a repeating series */
  series?: { id: string; frequency: Frequency; n: number; of: number }
}

const OBJECTIVES = ["Conformity of the QMS with the requirements", "Effectiveness of the QMS", "Areas for improvement", "Applicability of the scope"]
const CRITERIA = ["ISO 9001", "Customer and contractual requirements", "Policy, objectives, manual and procedures", "Statutory and regulatory requirements"]

let n = 0
const sid = () => `sl-${++n}`
const shared = (time: string, area: string): PlanSlot => ({ id: sid(), time, shared: true, area, topics: "", processes: [], clauses: [] })
const slot = (time: string, auditor: number, area: string, topics: string, processes: string[], clauses: string[]): PlanSlot => ({ id: sid(), time, auditor, area, topics, processes, clauses })

/** Questions for a slot, from the clauses it covers. Edit them per audit; save your own in the question bank. */
export const QUESTION_BANK: Record<string, string[]> = {
  "4": ["Are the scope, sites and exclusions documented and current?", "Are internal and external issues and interested parties reviewed?"],
  "5": ["Is the quality policy current, communicated and understood?", "Are roles, responsibilities and authorities assigned?"],
  "6": ["Are risks and opportunities identified with actions?", "Do quality objectives have targets, owners and results?"],
  "7": ["Are competence needs defined for roles that affect quality?", "Is measuring equipment calibrated and traceable?", "Are documents controlled: approved, current and available where used?", "Do people know the quality policy and how they contribute?"],
  "8": ["Are customer requirements reviewed before accepting orders?", "Are external providers evaluated and re-evaluated?", "Is production planned and controlled, with traceability?", "Is nonconforming output identified and controlled?"],
  "9": ["Are KPIs monitored and analysed?", "Is the internal audit programme carried out?", "Was management review held with every required input?"],
  "10": ["Do nonconformities have a cause, an action and a check that it worked?", "Are improvements identified and followed up?"],
}

export function questionsFor(slots: PlanSlot[]): PlanQuestion[] {
  let q = 0
  return slots
    .filter((s) => !s.shared)
    .flatMap((s) => [...new Set(s.clauses.map((c) => c.split(".")[0]))].flatMap((ch) => (QUESTION_BANK[ch] ?? []).map((text) => ({ id: `${s.id}-q${++q}`, slotId: s.id, text, clause: s.clauses.find((c) => c.split(".")[0] === ch) ?? ch, result: "Not checked" as QResult }))))
}

/** A new plan, filled from the template for its kind. */
export function planFromTemplate(kind: PlanKind, id: string, o: { body: string; date: string; scope: string; sites: string; standard: string }): AuditPlan {
  const external = isExternal(kind)
  let auditors: PlanAuditor[]
  let slots: PlanSlot[]
  if (kind === "Mock audit") {
    auditors = [{ name: "Consultant", role: "Lead" }, { name: "Maria Santos", role: "Internal auditor" }]
    slots = [
      shared("09:00", "Opening meeting"),
      slot("09:30", 0, "Leadership and planning", "Policy, objectives, risks, context", ["Leadership & planning"], ["4", "5", "6"]),
      slot("09:30", 1, "Support", "Competence, documents, calibration", ["People & competence", "Infrastructure & equipment"], ["7"]),
      slot("11:00", 0, "Operations", "Sales, design, purchasing, production", ["Operations", "Purchasing & suppliers"], ["8"]),
      slot("11:00", 1, "Performance", "KPIs, internal audit, management review", ["Monitoring & improvement"], ["9"]),
      shared("12:00", "Lunch"),
      slot("13:00", 0, "Improvement", "Nonconformities and corrective action", ["Monitoring & improvement"], ["10"]),
      shared("15:00", "Findings and readiness verdict"),
    ]
  } else if (kind === "Stage 1") {
    auditors = [{ name: "Auditor 1", role: "Lead auditor" }]
    slots = [
      shared("09:00", "Opening meeting"),
      slot("09:30", 0, "Scope and context", "Scope, sites, exclusions, interested parties", ["Leadership & planning"], ["4.2", "4.3"]),
      slot("10:30", 0, "Documented information", "Policy, objectives, manual, procedures", ["Leadership & planning"], ["5.2", "6.2", "7.5"]),
      shared("12:00", "Lunch"),
      slot("13:00", 0, "Readiness evidence", "Internal audit and management review done", ["Monitoring & improvement"], ["9.2", "9.3"]),
      slot("14:00", 0, "Site tour", "Head office and plant", ["Operations"], ["8.1"]),
      slot("15:00", 0, "Stage 2 planning", "Dates, auditors and sampling", [], []),
      shared("16:00", "Closing meeting"),
    ]
  } else {
    auditors = kind === "Internal audit" ? [{ name: "Maria Santos", role: "Lead auditor" }, { name: "Daniel Reyes", role: "Auditor" }] : [{ name: "Auditor 1", role: "Lead auditor" }, { name: "Auditor 2", role: "Auditor" }, { name: "Auditor 3", role: "Auditor" }]
    const three = auditors.length === 3
    slots = [
      shared("09:00", "Opening meeting"),
      slot("09:30", 0, "Top management", "Leadership, policy, objectives, context, risks", ["Leadership & planning"], ["4", "5", "6"]),
      slot("09:30", 1, "Nonconforming product", "Incoming, in-process, outgoing; calibration", ["Inspection & release", "Infrastructure & equipment"], ["8.7", "7.1.5"]),
      ...(three ? [slot("09:30", 2, "Production", "Planning, control, traceability, release", ["Operations"], ["8.5", "8.6"])] : []),
      slot("11:00", 0, "Monitoring and measurement", "Customer satisfaction, internal audit, corrective action", ["Monitoring & improvement"], ["9.1", "9.2", "10.2"]),
      slot("11:00", 1, "Documented information", "Creating, updating and controlling documents", ["Leadership & planning"], ["7.5"]),
      ...(three ? [slot("11:00", 2, "Maintenance", "Equipment, IT, environment, calibration", ["Infrastructure & equipment"], ["7.1.3", "7.1.4"])] : []),
      shared("12:00", "Lunch"),
      slot("13:00", 0, "Engineering", "Design and development of jigs, dies and parts", ["Design & development"], ["8.3"]),
      slot("13:00", 1, "Human resources and training", "Roles, competence, awareness, knowledge", ["People & competence"], ["7.2", "7.3"]),
      ...(three ? [slot("14:00", 2, "Purchasing", "External providers, verification, supplier evaluation", ["Purchasing & suppliers"], ["8.4"])] : []),
      slot("14:00", 1, "Sales and planning", "Contract review, customer requirements", ["Sales & customer"], ["8.2"]),
      shared("15:00", "Report writing"),
      shared("16:00", "Closing meeting"),
    ]
  }
  return {
    id,
    kind,
    title: kind === "Internal audit" ? "Internal audit, whole QMS" : kind === "Mock audit" ? "Mock audit" : `${kind} audit`,
    auditedBy: external ? o.body || "Certification body" : kind === "Mock audit" ? "Consultant" : "Internal audit team",
    date: o.date,
    hours: kind === "Stage 1" ? "9:00 to 17:00" : "9:00 to 17:00",
    standard: o.standard,
    sites: o.sites,
    scope: o.scope,
    objectives: OBJECTIVES,
    criteria: CRITERIA,
    auditors,
    slots,
    questions: external ? [] : questionsFor(slots),
    findings: [],
    print: { show: PRINT_PARTS.filter((p) => p !== "Clause numbers in each slot"), paper: "A4 portrait" },
    status: "Planned",
  }
}

/** Sample plans: the consultant's mock audit (done, report drafted) and the Stage 1 audit. */
export function samplePlans(o: { body: string; scope: string; sites: string; standard: string }): AuditPlan[] {
  const mock = planFromTemplate("Mock audit", "AP-2026-01", { ...o, date: "2026-11-06" })
  const answer = (i: number, result: QResult, note?: string) => (mock.questions[i] = { ...mock.questions[i], result, note })
  mock.questions.forEach((_, i) => answer(i, i % 3 === 2 ? "Not checked" : "Conforms"))
  const calib = mock.questions.findIndex((q) => q.text.startsWith("Is measuring equipment"))
  const docs = mock.questions.findIndex((q) => q.text.startsWith("Are documents controlled"))
  const supp = mock.questions.findIndex((q) => q.text.startsWith("Are external providers"))
  if (calib >= 0) answer(calib, "Minor", "Two calipers at the plant past their calibration date.")
  if (docs >= 0) answer(docs, "Opportunity", "Paper copies at line 2 aren’t stamped. A QR link to the current version would help.")
  if (supp >= 0) answer(supp, "Minor", "3 of 12 approved suppliers not re-evaluated for 2026.")
  mock.status = "In progress"
  const stage1 = planFromTemplate("Stage 1", "AP-2026-02", { ...o, date: "2026-11-20" })
  // an earlier whole-QMS internal audit, released and waiting for top management to accept
  const internal = planFromTemplate("Internal audit", "AP-2026-00", { ...o, date: "2026-09-15" })
  internal.questions = internal.questions.map((q) => ({ ...q, result: "Conforms" }))
  internal.findings = [
    { id: "f-int-1", title: "Goods-in check skipped for two deliveries", detail: "Two deliveries in August were put away without the incoming check.", grade: "Minor", clause: "8.4.2", ncId: "NC-2026-009" },
    { id: "f-int-2", title: "Torque wrenches used past their calibration date", detail: "Three wrenches on line 1 were overdue.", grade: "Minor", clause: "7.1.5", ncId: "NC-2026-005" },
  ]
  internal.status = "Report released"
  internal.releasedOn = "2026-09-20"
  internal.releasedBy = "Maria Santos"
  internal.verdict = "The QMS is effective, with 2 minor findings to close"
  return [internal, mock, stage1]
}
