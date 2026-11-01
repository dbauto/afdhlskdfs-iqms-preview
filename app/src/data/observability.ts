/**
 * Sample observability figures for the platform console (Operations › Usage and capacity, Errors and alerts, Health).
 * Synthetic. In production these come from the platform metrics tables (Pending, ADR-046): counts only, no record contents.
 */
export type Tone = "done" | "soon" | "overdue" | "draft" | "progress"
export type Status = "Healthy" | "Watch" | "Bottleneck"
export const STATUS_TONE: Record<Status, Tone> = { Healthy: "done", Watch: "soon", Bottleneck: "overdue" }

export const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`)
export const CURRENT_HOUR = 20
export const TESTED_AT_ONCE = 450
export const TESTED_PER_ORG = 50

export const USAGE_KPIS = [
  { label: "Active now", value: "186", note: "Sessions used in the last 5 minutes" },
  { label: "Peak today", value: "241", note: "At 10:00 – 11:00" },
  { label: "Daily active users", value: "612", note: "+4% on last Thursday" },
  { label: "Weekly active users", value: "1,340", note: "+2% on last week" },
  { label: "Monthly active users", value: "1,905", note: "Of 2,410 registered" },
]

/** active users per hour today (up to the current hour) and the 4-week average for each hour */
export const ACTIVE_TODAY = [22, 14, 9, 6, 5, 8, 31, 88, 176, 224, 241, 236, 168, 205, 229, 218, 190, 132, 74, 51, 186]
export const ACTIVE_AVERAGE = [25, 15, 10, 7, 6, 9, 35, 92, 170, 215, 232, 228, 160, 198, 220, 212, 184, 128, 80, 55, 40, 33, 29, 26]

export const ACTIVE_DAILY = { labels: ["23 Oct", "24 Oct", "25 Oct", "26 Oct", "27 Oct", "28 Oct", "29 Oct", "30 Oct", "31 Oct", "1 Nov"], values: [540, 575, 590, 601, 120, 98, 560, 588, 604, 612], note: "Weekends drop to about 110" }
export const ACTIVE_WEEKLY = { labels: ["W38", "W39", "W40", "W41", "W42", "W43", "W44"], values: [1180, 1210, 1250, 1290, 1300, 1320, 1340], note: "+14% since September" }
export const ACTIVE_MONTHLY = { labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"], values: [1210, 1390, 1520, 1640, 1780, 1905], note: "Two new organisations in October" }

export interface CapacityRow { id: string; name: string; detail: string; now: string; used: number; status: Status }
export const CAPACITY: CapacityRow[] = [
  { id: "c-orgload", name: "People at once, per organisation", detail: "Tested for 50; run a load test at 100", now: "Meridian peak 88", used: 88, status: "Watch" },
  { id: "c-list", name: "Response time (lists and pages)", detail: "Target under 1 s", now: "p95 0.42 s", used: 44, status: "Healthy" },
  { id: "c-cmd", name: "Response time (saving and approving)", detail: "Target under 2 s", now: "p95 0.91 s", used: 46, status: "Healthy" },
  { id: "c-5xx", name: "Server errors", detail: "Alert above 1% for 5 minutes", now: "0.12%", used: 12, status: "Healthy" },
  { id: "c-db", name: "Database response", detail: "Northwind slow 09:00 – 11:00, three days running", now: "p95 180 ms · Northwind 640 ms", used: 72, status: "Watch" },
  { id: "c-conn", name: "Database connections", detail: "Busiest: Meridian", now: "38 of 100 at peak", used: 38, status: "Healthy" },
  { id: "c-queue", name: "Background queue delay", detail: "Alert above 60 s", now: "Oldest job 4 s", used: 7, status: "Healthy" },
  { id: "c-export", name: "Exports", detail: "Hit the export limit 3 times today", now: "Northwind · 5 of 5 an hour", used: 100, status: "Bottleneck" },
  { id: "c-dlq", name: "Failed jobs", detail: "After the last retry", now: "0 waiting for replay", used: 0, status: "Healthy" },
  { id: "c-rate", name: "Request limit hits", detail: "600 a minute per session; 11 from one integration", now: "14 today", used: 23, status: "Watch" },
  { id: "c-cf", name: "Cloudflare account", detail: "Plan Workers for Platforms at 300 organisations", now: "7 of 500 Workers · 1 of 25 Hyperdrive", used: 2, status: "Healthy" },
  { id: "c-r2", name: "File storage", detail: "Uploads, exports and branding", now: "38 GB of 250 GB", used: 15, status: "Healthy" },
]

export interface ServiceRow { id: string; name: string; kind: "API" | "Background" | "Platform"; calls: number; share: number; p95: string; errors: string }
export const SERVICES: ServiceRow[] = [
  { id: "s-docs", name: "Documents and revisions", kind: "API", calls: 48210, share: 31, p95: "0.38 s", errors: "0.05%" },
  { id: "s-auth", name: "Sign-in and session", kind: "API", calls: 22940, share: 15, p95: "0.29 s", errors: "0.4%" },
  { id: "s-tasks", name: "Tasks, inbox and notifications", kind: "API", calls: 19800, share: 13, p95: "0.21 s", errors: "0.02%" },
  { id: "s-audits", name: "Audits and audit results", kind: "API", calls: 14370, share: 9, p95: "0.55 s", errors: "0.08%" },
  { id: "s-ca", name: "Corrective action and nonconformities", kind: "API", calls: 10120, share: 7, p95: "0.47 s", errors: "0.03%" },
  { id: "s-outbox", name: "Outbox dispatch", kind: "Background", calls: 9460, share: 6, p95: "0.9 s", errors: "0%" },
  { id: "s-proc", name: "Processes and objectives", kind: "API", calls: 8650, share: 6, p95: "0.33 s", errors: "0.01%" },
  { id: "s-mail", name: "Notifications and email", kind: "Background", calls: 6980, share: 4, p95: "1.4 s", errors: "0.1%" },
  { id: "s-remind", name: "Reminders and overdue checks", kind: "Background", calls: 4320, share: 3, p95: "0.6 s", errors: "0%" },
  { id: "s-export", name: "Exports", kind: "Background", calls: 1190, share: 1, p95: "14 s", errors: "0.8%" },
  { id: "s-scan", name: "File upload and malware scan", kind: "Background", calls: 860, share: 1, p95: "3.2 s", errors: "0.2%" },
  { id: "s-inbound", name: "Support email intake", kind: "Platform", calls: 74, share: 0, p95: "0.7 s", errors: "0%" },
]

export const BUSIEST = [
  { id: "meridian", name: "Meridian Clinics", now: 64, peak: 88 },
  { id: "arden", name: "Arden & Co.", now: 41, peak: 57 },
  { id: "northwind", name: "Northwind Foods", now: 33, peak: 46 },
  { id: "kalayaan", name: "Kalayaan Builders", now: 22, peak: 29 },
  { id: "pacific", name: "Pacific Freight", now: 18, peak: 24 },
  { id: "harbor", name: "Harbor Labs (trial)", now: 8, peak: 11 },
]

export const ERROR_KPIS = [
  { label: "Open alerts", value: "3", note: "1 critical, 2 warning", tone: "overdue" as Tone },
  { label: "Server errors", value: "0.12%", note: "Target under 1%" },
  { label: "Error groups", value: "14", note: "2 new since release 2026.10.4", tone: "soon" as Tone },
  { label: "Jobs failed after last retry", value: "1", note: "report-export · Northwind", tone: "overdue" as Tone },
  { label: "Sign-in failures", value: "38", note: "Normal for a weekday" },
]

export interface AlertRow { id: string; severity: "Critical" | "Warning"; rule: string; detail: string; started: string; told: string; logs: string }
export const ALERTS: AlertRow[] = [
  { id: "al-1", severity: "Critical", rule: "Job failed after its last retry", detail: "report-export · Northwind Foods · 3 attempts, timed out at 30 s", started: "12 min ago", told: "Paged the developer on call", logs: "/platform/logs?org=Northwind%20Foods" },
  { id: "al-2", severity: "Warning", rule: "Same error 3 times in an hour", detail: "TypeError in audit-results › saveAnswer · Meridian Clinics · 5 times", started: "34 min ago", told: "Messenger", logs: "/platform/logs?org=Meridian%20Clinics" },
  { id: "al-3", severity: "Warning", rule: "Database slower than usual", detail: "Northwind Foods · p95 640 ms for 25 minutes", started: "1 h ago", told: "Messenger", logs: "/platform/logs?org=Northwind%20Foods" },
]

export const ALERT_RULES = [
  { id: "r-job", rule: "Background job fails after its last retry", when: "Any", who: "Critical · page on call" },
  { id: "r-5xx", rule: "Server errors", when: "Above 1% for 5 minutes", who: "Critical · page on call" },
  { id: "r-same", rule: "Same error", when: "3 times in an hour", who: "Warning · Messenger" },
  { id: "r-signin", rule: "Sign-in failures", when: "3× usual for 15 minutes", who: "Warning · Messenger" },
  { id: "r-audit", rule: "Audit log integrity break", when: "Any", who: "Critical · page on call" },
  { id: "r-queue", rule: "Queue delay", when: "Oldest job above 60 s", who: "Warning · Messenger" },
  { id: "r-backup", rule: "Backup", when: "Older than 26 hours", who: "Warning · Messenger" },
]

export const ERRORS_PER_HOUR = [2, 1, 1, 0, 0, 1, 3, 6, 9, 8, 11, 7, 22, 19, 14, 9, 8, 6, 4, 3, 2, 2, 1, 1]
export const ERRORS_ALERT_LINE = 15
export const RELEASE_MARK = { hour: 12, label: "2026.10.4 at 12:00 · 30%" }

export interface ErrorGroup { id: string; state: "New" | "Recurring" | "Resolved"; message: string; where: string; orgs: string; count: number; since: string; trend: number[] }
export const ERROR_GROUPS: ErrorGroup[] = [
  { id: "e-1", state: "New", message: "TypeError: answer.evidence is undefined", where: "audit-results › saveAnswer", orgs: "Meridian, Arden", count: 41, since: "2026.10.4", trend: [0, 0, 0, 0, 0, 0, 3, 9, 12, 8, 5, 4] },
  { id: "e-2", state: "New", message: "Timeout after 30 s building export", where: "report-export", orgs: "Northwind", count: 3, since: "2026.10.4", trend: [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1] },
  { id: "e-3", state: "Recurring", message: "SharePoint link returned 403", where: "link-check", orgs: "4 organisations", count: 27, since: "2026.09.6", trend: [2, 3, 2, 2, 3, 2, 2, 3, 2, 3, 2, 1] },
  { id: "e-4", state: "Recurring", message: "Email provider 429, retried", where: "notifications", orgs: "All", count: 19, since: "2026.10.1", trend: [1, 2, 1, 3, 2, 1, 2, 1, 2, 2, 1, 1] },
  { id: "e-5", state: "Recurring", message: "Session expired during save", where: "documents › saveRevision", orgs: "6 organisations", count: 11, since: "2026.08.2", trend: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1] },
  { id: "e-6", state: "Resolved", message: "Unique constraint on revision number", where: "documents › publish", orgs: "Arden", count: 0, since: "2026.10.2", trend: [3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
]

export interface TraceStep { id: string; step: string; what: string; at: number | null; duration: number; tone: "primary" | "done" | "overdue" | "faint" }
export const TRACE = {
  requestId: "req_9a41c07e55",
  meta: "Meridian Clinics · release 2026.10.4 · 12:14:07",
  windowMs: 300,
  steps: [
    { id: "t1", step: "Browser", what: "Save answer clicked", at: 0, duration: 4, tone: "primary" },
    { id: "t2", step: "Client API", what: "POST /api/v1/audit-results/ar_7d21", at: 4, duration: 180, tone: "primary" },
    { id: "t3", step: "Permission check", what: "audit.respond · allowed", at: 12, duration: 8, tone: "done" },
    { id: "t4", step: "Database", what: "UPDATE audit_results · 1 row", at: 24, duration: 96, tone: "primary" },
    { id: "t5", step: "Error", what: "TypeError at saveAnswer.ts:88", at: 122, duration: 2, tone: "overdue" },
    { id: "t6", step: "Outbox", what: "Not written: the save rolled back", at: null, duration: 0, tone: "faint" },
  ] as TraceStep[],
}

export const HEALTH_KPIS = [
  { label: "Organisations healthy", value: "7 of 9", note: "2 need attention", tone: "soon" as Tone },
  { label: "Integrations", value: "6 of 7 working", note: "SharePoint slow", tone: "soon" as Tone },
  { label: "Oldest backup", value: "19 h", note: "Target under 26 h" },
  { label: "Last restore test", value: "12 Oct", note: "Passed · next 9 Nov" },
  { label: "Migrations", value: "All current", note: "Schema 2026.10.4" },
]

export type Dot = "OK" | "Watch" | "Problem"
export const DOT_TONE: Record<Dot, string> = { OK: "bg-done", Watch: "bg-soon-bar", Problem: "bg-overdue" }
export const HEALTH_PARTS = ["Website and API", "Database", "Background queue", "Backups", "Integrations"] as const
export const ORG_HEALTH: { id: string; name: string; parts: Dot[]; release: string }[] = [
  { id: "meridian", name: "Meridian Clinics", parts: ["Problem", "OK", "OK", "OK", "OK"], release: "2026.10.4 · 30%" },
  { id: "northwind", name: "Northwind Foods", parts: ["OK", "Watch", "Problem", "OK", "OK"], release: "2026.10.3" },
  { id: "arden", name: "Arden & Co.", parts: ["OK", "OK", "OK", "OK", "Watch"], release: "2026.10.4 · 100%" },
  { id: "kalayaan", name: "Kalayaan Builders", parts: ["OK", "OK", "OK", "OK", "OK"], release: "2026.10.3" },
  { id: "pacific", name: "Pacific Freight", parts: ["OK", "OK", "OK", "OK", "OK"], release: "2026.10.3" },
  { id: "harbor", name: "Harbor Labs (trial)", parts: ["OK", "OK", "OK", "OK", "OK"], release: "2026.10.4" },
]

export const INTEGRATIONS: { id: string; name: string; detail: string; status: "Working" | "Slow" | "Down"; response: string; last: string }[] = [
  { id: "i-entra", name: "Microsoft sign-in (Entra ID)", detail: "7 organisations", status: "Working", response: "210 ms", last: "None" },
  { id: "i-google", name: "Google sign-in", detail: "openid, email and profile only", status: "Working", response: "180 ms", last: "None" },
  { id: "i-sp", name: "SharePoint links", detail: "Checked every hour", status: "Slow", response: "2.4 s", last: "403 on 27 links · 4 organisations" },
  { id: "i-mail", name: "Email provider", detail: "Notifications and digests", status: "Working", response: "0.9 s", last: "429 at 07:00, retried" },
  { id: "i-scan", name: "Malware scanner", detail: "Uploads before opening", status: "Working", response: "3.1 s", last: "None" },
  { id: "i-img", name: "Cloudflare Images", detail: "Logos and profile photos", status: "Working", response: "140 ms", last: "None" },
  { id: "i-neon", name: "Neon databases", detail: "9 client projects and the platform", status: "Working", response: "38 ms", last: "None" },
]

export const BACKUPS = [
  { id: "arden", name: "Arden & Co.", backup: "6 h", restore: "12 Oct · passed", due: false, schema: "2026.10.4" },
  { id: "meridian", name: "Meridian Clinics", backup: "7 h", restore: "12 Oct · passed", due: false, schema: "2026.10.4" },
  { id: "northwind", name: "Northwind Foods", backup: "19 h", restore: "5 Oct · passed", due: false, schema: "2026.10.3" },
  { id: "kalayaan", name: "Kalayaan Builders", backup: "6 h", restore: "28 Sep · due", due: true, schema: "2026.10.3" },
  { id: "pacific", name: "Pacific Freight", backup: "6 h", restore: "12 Oct · passed", due: false, schema: "2026.10.3" },
  { id: "harbor", name: "Harbor Labs (trial)", backup: "5 h", restore: "12 Oct · passed", due: false, schema: "2026.10.4" },
]

export const SIGNIN_FAILURES = [3, 2, 1, 1, 0, 1, 2, 5, 9, 6, 4, 3, 4, 5, 3, 2, 2, 1, 1, 2, 1, 1, 0, 1]
export const PERMISSION_DENIALS = [1, 0, 0, 0, 0, 0, 1, 3, 4, 6, 5, 4, 3, 4, 6, 5, 3, 2, 1, 1, 0, 0, 0, 0]

export const RELEASE_HEALTH: { id: string; version: string; state: string; tone: Tone; errors: string; speed: string; note: string }[] = [
  { id: "v4", version: "2026.10.4", state: "Rolling out · 30%", tone: "soon", errors: "0.08% → 0.31%", speed: "0.41 s → 0.44 s", note: "Halted: error rate rose at Meridian" },
  { id: "v3", version: "2026.10.3", state: "Live · 100%", tone: "done", errors: "0.10% → 0.09%", speed: "0.45 s → 0.41 s", note: "Faster saving on documents" },
  { id: "v2", version: "2026.10.2", state: "Replaced", tone: "draft", errors: "0.11% → 0.10%", speed: "0.47 s → 0.45 s", note: "None" },
]
