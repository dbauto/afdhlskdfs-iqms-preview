import { DEFAULT_CERTIFICATION, type CertificationSettings } from "@/lib/certification"
import type { ApprovalMode, NotificationKind } from "@/data/types"

/**
 * Workspace settings that pages save and the rest of the app reads. In the preview they are kept in
 * this browser (with the sample data); the backend keeps them per organization (plan v3 §20).
 */
/** Processes page layouts: cards with an action menu (the default), cards with covers, or a list grouped by band. */
export type ProcessLayout = "actions" | "covers" | "list"
export const PROCESS_LAYOUTS: { value: ProcessLayout; label: string; hint: string }[] = [
  { value: "actions", label: "Cards with actions", hint: "Purpose, figures and quick links on each card" },
  { value: "covers", label: "Cards with covers", hint: "A picture or emoji and 12 weeks of status" },
  { value: "list", label: "Grouped list", hint: "Compact rows under Management, Core and Support" },
]

/** Organization & Scope › Sites: where the company works and how many people are there (audit time depends on it). */
export interface Site { id: string; name: string; kind: "Central office" | "Site" | "Branch" | "Office"; address: string; people: number; processes: string[]; inScope: boolean }
/** Organization & Scope › Org chart: a box can be a role, department, site or team; a person's name is optional. */
export type OrgNodeType = "Company" | "Position" | "Department" | "Site" | "Team"
export interface OrgNode { id: string; parent?: string; type: OrgNodeType; title: string; person?: string; people?: number }
/** Organization & Scope › Legal & permits. `link` points to where the file is kept; nothing is uploaded. */
export interface LegalItem { id: string; kind: "Permit" | "Legal requirement"; name: string; issuedBy: string; number?: string; site: string; owner: string; expires?: string; reviewed?: string; link?: string }
export interface ProfileSettings { about: string; customers: string; founded: string; certificateNo: string; accreditation: string; custom: { label: string; value: string }[] }

/** The text of a brief for one kind of item in Management review › Needs you, and the good-practice checks switched off. */
export interface BriefText { why: string; good: string; questions: string[]; off: string[] }

export interface WorkspaceSettings {
  /** the external certification cycle and its audit dates (Settings › Certification) */
  certification: CertificationSettings
  org: { name: string; legal: string; tin: string; address: string; industry: string; tz: string; cert: string; body: string; next: string }
  numbering: { sep: string; digits: string; codes: Record<string, string> }
  retention: Record<string, string>
  security: { ms: boolean; email: boolean; twoStep: string; domains: string[]; timeout: string; minLen: string; human: boolean; approval: boolean; lockout: string }
  integrations: { m365: string; mail: string; teams: string; sites: string[]; checkLinks: boolean }
  exports: { id: string; what: string; by: string; when: string; format: string; state: string; parts?: string[] }[]
  reviewApproval: { mode: ApprovalMode; remind: boolean; keep: boolean; reviewEvery: number }
  /** per person id: one entry per notification event, in ThryveMS and by email */
  notifications: Record<string, { app: boolean; email: boolean }[]>
  /** per person id: how often the summary email goes */
  digests: Record<string, string>
  /** invitations waiting to be accepted; process-scoped roles name the processes the person will work in */
  /** per person id: how the Processes page lays out processes */
  processLayout: Record<string, ProcessLayout>
  invites: { id: string; email: string; roleId: string; by: string; sent: string; status: "Pending" | "Expired"; note: string; processes?: string[] }[]
  profile: ProfileSettings
  sites: Site[]
  orgChart: OrgNode[]
  legal: LegalItem[]
  /** per kind of item: the brief's wording, edited by the consultant or quality manager */
  briefs: Record<string, BriefText>
}

export const DOC_TYPE_CODES: [string, string][] = [
  ["Manual", "MAN"],
  ["Policy", "POL"],
  ["Procedure", "PRO"],
  ["Work instruction", "WI"],
  ["Form", "FRM"],
  ["Register", "REG"],
  ["Record", "REC"],
]

export const RETENTION_ROWS: [string, string, string][] = [
  ["Superseded and archived documents", "10 years", "After they stop being in force"],
  ["Audit reports and checklists", "6 years", "Two certification cycles"],
  ["Nonconformities and corrective actions", "6 years", "After closing"],
  ["Management review records", "10 years", ""],
  ["Training and competence records", "5 years", "After the person leaves"],
  ["Activity log", "3 years", "Who viewed, changed, approved or shared"],
  ["Sign-in history", "90 days", "Security only"],
]

/** The notification events people can turn on or off, and the notification kinds each covers. */
export const NOTIFICATION_EVENTS: { label: string; help: string; kinds: NotificationKind[] }[] = [
  { label: "Something is waiting on you", help: "Approvals, reviews, verifications, tasks", kinds: ["Waiting on you", "Assigned"] },
  { label: "Something you own is overdue", help: "Documents, actions, risk reviews", kinds: ["Overdue"] },
  { label: "A record you follow changes", help: "Comments, remarks, stage changes", kinds: ["Comment", "Remark"] },
  { label: "Someone shares a record with you", help: "", kinds: ["Shared"] },
  { label: "An audit you’re in is planned or changed", help: "", kinds: ["Audit"] },
  { label: "A policy needs your acknowledgement", help: "", kinds: ["Policy"] },
]
export const DEFAULT_NOTIFICATION_PREFS = NOTIFICATION_EVENTS.map((_, i) => ({ app: true, email: i < 3 || i === 5 }))

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  certification: DEFAULT_CERTIFICATION,
  org: {
    name: "Arden & Co.",
    legal: "Arden and Company Manufacturing Inc.",
    tin: "123-456-789-000",
    address: "Lot 4, Light Industry and Science Park, Cabuyao, Laguna",
    industry: "Precision machining and assembly",
    tz: "Asia/Manila",
    cert: "Certified since 2019",
    body: "Example Certification Body Inc.",
    next: "2027-02-15",
  },
  numbering: { sep: "-", digits: "3", codes: Object.fromEntries(DOC_TYPE_CODES) },
  retention: Object.fromEntries(RETENTION_ROWS.map(([what, keep]) => [what, keep])),
  security: { ms: true, email: true, twoStep: "Everyone", domains: ["arden.example"], timeout: "30 minutes", minLen: "12", human: true, approval: true, lockout: "5" },
  integrations: { m365: "Connected", mail: "Connected", teams: "Not connected", sites: ["Quality", "Engineering drawings"], checkLinks: true },
  exports: [
    { id: "ex-3", what: "Audit pack for the surveillance audit", by: "Maria Santos", when: "2 Oct 2026", format: "PDF and Excel", state: "Ready" },
    { id: "ex-2", what: "Whole workspace", by: "Aaron Lim", when: "1 Jul 2026", format: "JSON", state: "Expired" },
  ],
  reviewApproval: { mode: "Everyone must approve", remind: true, keep: true, reviewEvery: 12 },
  notifications: {},
  digests: {},
  processLayout: {},
  briefs: {
    "audit-report": {
      why: "The certificate is only granted once the certification body accepts your fixes. Problems left open can become major at the next audit.",
      good: "Each finding has a real cause, a fix that stops it coming back, a person responsible and a due date before the deadline.",
      questions: ["Do the fixes stop the problem coming back, or only clean up this time?", "Do the people named have the time and budget to do it by the date?", "Is any fix something you need to pay for or decide on?"],
      off: [],
    },
  },
  profile: {
    about: "Jigs, dies, moulds and machined parts for electronics, semiconductor and food manufacturing.",
    customers: "Electronics and semiconductor manufacturers",
    founded: "2004",
    certificateNo: "",
    accreditation: "",
    custom: [{ label: "PEZA registration", value: "" }],
  },
  sites: [
    { id: "site-1", name: "Head office", kind: "Central office", address: "Lot 4, Light Industry and Science Park, Cabuyao, Laguna", people: 84, processes: ["Leadership & planning", "Monitoring & improvement", "Sales & customer", "Design & development", "Operations"], inScope: true },
    { id: "site-2", name: "Calamba Plant", kind: "Site", address: "Calamba, Laguna", people: 48, processes: ["Operations", "Inspection & release"], inScope: true },
    { id: "site-3", name: "Makati sales office", kind: "Office", address: "Makati City", people: 14, processes: ["Sales & customer"], inScope: true },
  ],
  orgChart: [
    { id: "oc-1", type: "Position", title: "General Manager" },
    { id: "oc-2", parent: "oc-1", type: "Department", title: "Quality" },
    { id: "oc-3", parent: "oc-2", type: "Position", title: "QA Supervisor", people: 3 },
    { id: "oc-4", parent: "oc-1", type: "Department", title: "Operations" },
    { id: "oc-5", parent: "oc-4", type: "Team", title: "Production", people: 68 },
    { id: "oc-6", parent: "oc-4", type: "Team", title: "Maintenance", people: 9 },
    { id: "oc-7", parent: "oc-1", type: "Department", title: "Sales & Planning" },
    { id: "oc-8", parent: "oc-7", type: "Team", title: "Purchasing", people: 5 },
    { id: "oc-9", parent: "oc-1", type: "Site", title: "Calamba Plant" },
    { id: "oc-10", parent: "oc-9", type: "Team", title: "Warehouse", people: 12 },
  ],
  legal: [
    { id: "lg-1", kind: "Permit", name: "Business permit", issuedBy: "City government", number: "", site: "Head office", owner: "Joy Aquino", expires: "2027-01-20", link: "" },
    { id: "lg-2", kind: "Permit", name: "Fire safety inspection certificate", issuedBy: "Bureau of Fire Protection", number: "", site: "Calamba Plant", owner: "Carlos Mendoza", expires: "2026-11-15", link: "" },
    { id: "lg-3", kind: "Permit", name: "Environmental compliance certificate", issuedBy: "DENR", number: "", site: "Calamba Plant", owner: "Carlos Mendoza", expires: "2026-10-01", link: "" },
    { id: "lg-4", kind: "Legal requirement", name: "Occupational safety and health standards", issuedBy: "DOLE", site: "All sites", owner: "Rosa Tan", reviewed: "2026-08-15", link: "" },
  ],
  invites: [
    { id: "inv-1", email: "ramon.cruz@arden.example", roleId: "contributor", by: "Aaron Lim", sent: "9 Oct", status: "Pending", note: "Expires 16 Oct", processes: ["Operations"] },
    { id: "inv-2", email: "bea.lim@arden.example", roleId: "viewer", by: "Maria Santos", sent: "28 Sep", status: "Expired", note: "Expired 5 Oct" },
  ],
}

/** Saved settings merged over the defaults, so a section added later still has its values. */
export function mergeSettings(saved: Partial<WorkspaceSettings> | null | undefined): WorkspaceSettings {
  const out = { ...DEFAULT_SETTINGS } as WorkspaceSettings
  if (!saved || typeof saved !== "object") return out
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof WorkspaceSettings)[]) {
    const v = saved[k]
    if (v === undefined) continue
    const d = DEFAULT_SETTINGS[k]
    ;(out as unknown as Record<string, unknown>)[k] = Array.isArray(d) ? v : { ...(d as object), ...(v as object) }
  }
  return out
}

/** Is this notification kind turned on in ThryveMS for this person? */
export function wantsNotification(settings: WorkspaceSettings, personId: string, kind: NotificationKind) {
  const prefs = settings.notifications[personId] ?? DEFAULT_NOTIFICATION_PREFS
  const i = NOTIFICATION_EVENTS.findIndex((e) => e.kinds.includes(kind))
  return i < 0 || prefs[i]?.app !== false
}
