/**
 * Sample data for the platform console (ADR-038). Synthetic: no real clients, people or money.
 * In production these figures come from the platform database, billing records, provider usage APIs
 * and GitHub security alerts; the console never reads client QMS records.
 */
import { TENANTS, type Tenant } from "./admin"

export const PESO_PER_USD = 58.2
export const RATE_NOTE = "BSP reference rate, 27 Oct 2026 (sample)"

export interface Kpi {
  title: string
  sub: string
  value: string
  delta: string
  tone: "done" | "soon" | "overdue" | "draft"
  note: string
  trend: number[]
}



/** last 30 days: slowest 5% page time in ms, failed requests in % */
export const PERFORMANCE = Array.from({ length: 30 }, (_, i) => ({
  day: i,
  p95: Math.round(500 + Math.sin(i / 3) * 60 + Math.cos(i / 1.7) * 30),
  failed: Math.round((0.12 + Math.sin(i / 4) * 0.05 + (i === 17 ? 0.12 : 0)) * 100) / 100,
}))
export const PERFORMANCE_TARGET_MS = 1000

export interface RequiredReport {
  name: string
  due: string
  who: string
  progress: number
  tone: "progress" | "soon" | "done" | "draft"
}

/** obligations to keep on top of; dates are reminders, confirm them with your lawyer and accountant */
export const REQUIRED_REPORTS: RequiredReport[] = [
  { name: "NPC Annual Security Incident Report", due: "31 Mar 2027", who: "Data Privacy Act · DPO files with the NPC", progress: 10, tone: "progress" },
  { name: "Personal data breach notice", due: "None open", who: "Within 72 hours to the NPC and the people affected", progress: 0, tone: "done" },
  { name: "BIR VAT or percentage tax return", due: "25 Nov 2026", who: "Your accountant · from issued invoices", progress: 60, tone: "soon" },
  { name: "Monthly service report per client", due: "5 Nov 2026", who: "Uptime, incidents and SLA credits · 23 organisations", progress: 80, tone: "soon" },
  { name: "Subprocessor and DPA review", due: "14 Jan 2027", who: "Yearly · tell clients before adding one", progress: 25, tone: "progress" },
  { name: "SEC General Information Sheet and AFS", due: "Per SEC schedule", who: "Corporate secretary and auditor", progress: 0, tone: "draft" },
]

/** weekly database load per organisation, 0–100 */
export function loadFor(t: Tenant) {
  let h = 0
  for (const c of t.id) h = (h * 17 + c.charCodeAt(0)) % 97
  return Math.min(96, Math.round(25 + (t.used / t.seats) * 40 + (h % 25)))
}
export const OVERDUE_INVOICE = new Set(["coral", "cobalt"])

// ---------- AI assistants ----------

export type AiProvider = "Anthropic (Claude)" | "OpenAI"
export type Effort = "Low" | "Medium" | "High"

export interface ProviderKey {
  provider: AiProvider
  /** last four characters only; the key itself is never sent back to the browser */
  last4?: string
  tested?: string
}

export const PROVIDERS: ProviderKey[] = [
  { provider: "Anthropic (Claude)", last4: "3f9a", tested: "27 Oct 2026" },
  { provider: "OpenAI" },
]

/** offered models; in production the list comes from each provider's models API */
export const MODELS: Record<AiProvider, string[]> = {
  "Anthropic (Claude)": ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"],
  OpenAI: ["Connect OpenAI to see its models"],
}

export interface Assistant {
  id: "support" | "scanner"
  name: string
  runs: string
  trigger: "Automatic" | "Manual"
  provider: AiProvider
  model: string
  effort: Effort
  budget: number
  prompt: string
  knowledge: { name: string; meta: string }[]
  usage: { tokensIn: number; tokensOut: number; usd: number; units: number; unitLabel: string; daily: number[] }
}

export const ASSISTANTS: Assistant[] = [
  {
    id: "support",
    name: "AI support",
    runs: "Drafts replies to support reports. A person on your team sends them.",
    trigger: "Automatic",
    provider: "Anthropic (Claude)",
    model: "claude-sonnet-5-5",
    effort: "Medium",
    budget: 15000,
    prompt:
      "You help ThryveMS support staff answer reports from client users. Use the knowledge below, the description, the technical details and the screenshots a person has cleared. Reply in plain English a quality manager understands. Never ask for passwords. Say whether it is a mistake in use (and how to do it), a known problem (and the workaround), or a fault for a developer.",
    knowledge: [
      { name: "ThryveMS user guide", meta: "v3 · 42 pages" },
      { name: "Known errors and fixes", meta: "118 entries · updated 25 Oct" },
      { name: "UI wording rules", meta: "UI-GUIDELINES §6" },
    ],
    usage: { tokensIn: 26_100_000, tokensOut: 3_500_000, usd: 193.1, units: 268, unitLabel: "report", daily: [6, 9, 8, 12, 10, 7, 5, 11, 14, 13, 9, 8, 12, 15, 10, 9, 13, 16, 12, 10, 8, 14, 17, 13, 11, 9, 12] },
  },
  {
    id: "scanner",
    name: "AI vulnerability scanner",
    runs: "Reviews code for security problems. Starts only when you run it from Security scans.",
    trigger: "Manual",
    provider: "Anthropic (Claude)",
    model: "claude-opus-5-5",
    effort: "High",
    budget: 10000,
    prompt:
      "You review ThryveMS source code for security problems. Focus on client isolation (organization_id checks), permission and classification checks, sign-in and sessions, uploads and links. Report each finding with file, line, severity on the POL-07 scale, why it matters and a suggested fix. Say when you are unsure. Don’t report style issues.",
    knowledge: [
      { name: "Backend plan v3 §8–9, §25–26", meta: "security rules" },
      { name: "POL-07 Vulnerability management", meta: "severity scale" },
      { name: "OWASP ASVS Level 2 checklist", meta: "security/asvs-l2.csv" },
    ],
    usage: { tokensIn: 10_900_000, tokensOut: 700_000, usd: 123.37, units: 5, unitLabel: "review", daily: [0, 0, 0, 22, 0, 0, 0, 0, 0, 18, 0, 0, 0, 0, 25, 0, 0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 0] },
  },
]

// ---------- security scans ----------

export interface Scan {
  name: string
  checks: string
  runs: string
  kind: "Bot" | "External"
  last: string
  result: string
  tone: "done" | "soon" | "overdue" | "draft"
}

export const BOT_SCANS: Scan[] = [
  { name: "Library check (Dependabot)", checks: "Known problems in npm packages", runs: "Daily and on every pull request", kind: "Bot", last: "27 Oct 2026, 06:00", result: "1 high", tone: "overdue" },
  { name: "Code scan (CodeQL)", checks: "Unsafe patterns in our own code", runs: "Weekly and on every pull request", kind: "Bot", last: "26 Oct 2026, 22:10", result: "1 medium", tone: "soon" },
  { name: "Secret scan", checks: "Keys or passwords in the code", runs: "On every push", kind: "Bot", last: "27 Oct 2026, 09:42", result: "Clear", tone: "done" },
  { name: "Live site check", checks: "Headers, TLS and exposed pages on staging", runs: "Weekly", kind: "Bot", last: "No data", result: "Not set up", tone: "draft" },
  { name: "Penetration test", checks: "External tester, before the first paying client", runs: "Yearly and after major changes", kind: "External", last: "No data", result: "Not booked", tone: "draft" },
]

export interface AiReview {
  id: string
  reviewer: AiProvider
  scope: string
  reason: string
  by: string
  at: string
  result: string
  tone: "done" | "soon" | "overdue"
  tokens: number
  usd: number
}

export const AI_REVIEWS: AiReview[] = [
  { id: "AIR-005", reviewer: "Anthropic (Claude)", scope: "Sign-in and session code, release 2026.10.3", reason: "Before Google sign-in work", by: "Leo Navarro", at: "24 Oct 2026, 14:05", result: "1 medium", tone: "soon", tokens: 2_310_000, usd: 24.6 },
  { id: "AIR-004", reviewer: "Anthropic (Claude)", scope: "Uploads and storage routes", reason: "ADR-037 uploads", by: "Leo Navarro", at: "20 Oct 2026, 10:12", result: "Clear", tone: "done", tokens: 2_050_000, usd: 21.9 },
]

export type FindingState = "Open" | "Fix in review" | "Fixed, retest passed" | "Accepted until"
export interface Finding {
  id: string
  severity: "Critical" | "High" | "Medium" | "Low"
  title: string
  foundBy: string
  found: string
  fixBy: string
  overdue?: boolean
  owner: string
  state: FindingState
  /** AI findings count only after a person confirms them */
  confirmed: boolean
}

export const FINDINGS: Finding[] = [
  { id: "SEC-2026-014", severity: "High", title: "Outdated date library in the app build", foundBy: "Bot", found: "18 Oct 2026", fixBy: "25 Oct 2026", overdue: true, owner: "Leo Navarro", state: "Fix in review", confirmed: true },
  { id: "SEC-2026-015", severity: "Medium", title: "Link check allows a redirect it should block", foundBy: "Claude", found: "24 Oct 2026", fixBy: "23 Nov 2026", owner: "Ana Reyes", state: "Open", confirmed: true },
  { id: "SEC-2026-016", severity: "Medium", title: "Error message shows a file path", foundBy: "Bot", found: "26 Oct 2026", fixBy: "25 Nov 2026", owner: "Ana Reyes", state: "Open", confirmed: true },
  { id: "SEC-2026-009", severity: "Low", title: "Verbose server header on staging only", foundBy: "Bot", found: "2 Oct 2026", fixBy: "30 Jan 2027", owner: "Ana Reyes", state: "Accepted until", confirmed: true },
]

/** POL-07 fix targets in days */
export const FIX_DAYS: Record<Finding["severity"], number> = { Critical: 3, High: 7, Medium: 30, Low: 90 }

// ---------- one organisation ----------

export interface OrgFeature {
  key: string
  name: string
  note: string
  kind: "In plan" | "Add-on" | "Needs client OK"
  on: boolean
}

export const FEATURES: OrgFeature[] = [
  { key: "google", name: "Sign in with Google", note: "Gmail and Google Workspace accounts", kind: "Needs client OK", on: false },
  { key: "gmail", name: "Personal Gmail accounts", note: "Off means Google Workspace accounts only", kind: "Needs client OK", on: false },
  { key: "uploads", name: "File uploads", note: "Public and Internal records, 25 MB a file", kind: "In plan", on: true },
  { key: "ai-support", name: "AI support for their users", note: "Their reports get an AI-drafted reply", kind: "Needs client OK", on: false },
  { key: "consultant", name: "Consultant access", note: "A consultant can be assigned", kind: "In plan", on: true },
  { key: "support-access", name: "Support access by your team", note: "Client grants 1–4 hours each time", kind: "In plan", on: true },
  { key: "storage", name: "Extra storage", note: "+50 GB for evidence files", kind: "Add-on", on: false },
  { key: "domain", name: "Custom domain", note: "Their own address instead of iqms.ph", kind: "Add-on", on: false },
]

/** organisations whose Owner turned on AI support for their people (AI Features Addendum) */
export const AI_SUPPORT_ORGS = new Set(["Arden & Co."])

export const PRICE_PER_USER: Record<Tenant["plan"], number> = { Business: 1150, Team: 950, Trial: 0 }

export function orgDetail(t: Tenant) {
  const host = `${t.id}.iqms.ph`
  const monthly = PRICE_PER_USER[t.plan] * t.used
  const vat = Math.round(monthly * 0.12)
  return {
    host,
    release: "2026.10.3 · 21 Oct 2026",
    next: "2026.10.4 · security fixes",
    channel: t.plan === "Trial" ? "Early (trial)" : "Standard, after canary clients",
    database: "Neon · Singapore · restore up to 30 days",
    backup: "26 Oct 2026 · restore test passed",
    monthly,
    vat,
    overdue: OVERDUE_INVOICE.has(t.id),
  }
}

export const tenantById = (id?: string) => TENANTS.find((t) => t.id === id)

export const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`
export const tokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n))

// ---------- finance (ADR-039) ----------

export interface Invoice {
  id: string
  org: string
  issued: string
  due: string
  /** ₱ before VAT */
  amount: number
  state: "Paid" | "Unpaid" | "Overdue"
  daysLate?: number
}

const VAT = 0.12
export const withVat = (n: number) => Math.round(n * (1 + VAT))
export const vatOf = (n: number) => Math.round(n * VAT)

/** October 2026 invoices, one per paying organisation (trial accounts aren't invoiced) */
export const INVOICES: Invoice[] = TENANTS.filter((t) => t.plan !== "Trial").map((t, i) => {
  const amount = PRICE_PER_USER[t.plan] * t.used
  const overdue = OVERDUE_INVOICE.has(t.id)
  const unpaid = !overdue && i % 5 === 3
  return {
    id: `INV-2026-${String(171 + i).padStart(4, "0")}`,
    org: t.name,
    issued: "1 Oct 2026",
    due: "15 Oct 2026",
    amount,
    state: overdue ? "Overdue" : unpaid ? "Unpaid" : "Paid",
    daysLate: overdue ? 12 + (i % 26) : undefined,
  }
})

/** costs this month, ₱ */
export const COSTS: { item: string; who: string; amount: number; note: string }[] = [
  { item: "Hosting and databases", who: "Cloudflare, Neon", amount: 86_400, note: "23 client databases, Workers, storage" },
  { item: "AI assistants", who: "Anthropic, OpenAI", amount: 18_420, note: "AI support and vulnerability scanner" },
  { item: "Email and backups", who: "Amazon SES, S3", amount: 9_150, note: "notifications, encrypted backups" },
  { item: "Sign-in", who: "WorkOS", amount: 0, note: "free tier" },
  { item: "Tools and monitoring", who: "GitHub, Cloudflare Zero Trust", amount: 33_030, note: "repositories, CI minutes, console access" },
]

/** this month's totals, before VAT; the Overview and Finance both read these */
export const INVOICED = INVOICES.reduce((s, i) => s + i.amount, 0)
export const COST_TOTAL = COSTS.reduce((s, c) => s + c.amount, 0)
export const UNPAID = INVOICES.filter((i) => i.state !== "Paid")

/** ₱ thousands, before VAT; October is this month's invoices and costs */
export const MONTHS: { label: string; revenue: number; costs: number }[] = [
  ["May", 0.74, 0.8],
  ["Jun", 0.79, 0.82],
  ["Jul", 0.83, 0.86],
  ["Aug", 0.86, 0.89],
  ["Sep", 0.92, 0.95],
  ["Oct", 1, 1],
].map(([label, r, c]) => ({ label: label as string, revenue: Math.round((INVOICED / 1000) * (r as number)), costs: Math.round((COST_TOTAL / 1000) * (c as number)) }))

export const MONTHLY_PROFIT = MONTHS.map((m) => ({ label: m.label, profit: m.revenue - m.costs }))

const unpaidTotal = UNPAID.reduce((s, i) => s + withVat(i.amount), 0)
export const KPIS: Kpi[] = [
  { title: "Revenue", sub: "Invoiced this month, before VAT", value: peso(INVOICED), delta: "+8.7%", tone: "done", note: `${INVOICES.length} paying organisations`, trend: MONTHS.map((m) => m.revenue) },
  { title: "Uptime", sub: "Contract target 99.5%", value: "99.97%", delta: "On target", tone: "done", note: "SLA credits ₱0", trend: [99.95, 99.98, 99.96, 99.97, 99.99, 99.96, 99.97] },
  { title: "AI spend", sub: "Support and scanner", value: "₱18,420", delta: "74% of budget", tone: "soon", note: "41.2M tokens", trend: [4, 7, 9, 11, 13, 16, 18.4] },
  { title: "Unpaid invoices", sub: "Including VAT", value: peso(unpaidTotal), delta: `${UNPAID.length} invoices`, tone: UNPAID.some((i) => i.state === "Overdue") ? "overdue" : "soon", note: `${UNPAID.filter((i) => i.state === "Overdue").length} overdue`, trend: [20, 28, 18, 40, 36, 55, 64.5] },
]

// ---------- alerts to Facebook Messenger (ADR-039) ----------

export interface AlertEvent {
  key: string
  label: string
  help: string
  on: boolean
  critical?: boolean
}

export const ALERT_EVENTS: AlertEvent[] = [
  { key: "critical", label: "Critical errors", help: "Site down, failed backups, audit-log integrity break", on: true, critical: true },
  { key: "monitor", label: "Error monitor reports", help: "The same error 3 times in an hour, or failed requests above 1%", on: true },
  { key: "blocked", label: "Support reports marked “I can’t work”", help: "Report number and organisation only", on: true },
  { key: "finding", label: "Security finding overdue", help: "Finding number and severity", on: false },
  { key: "invoice", label: "Invoice overdue", help: "Invoice number and days late", on: false },
]
