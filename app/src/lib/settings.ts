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

export interface WorkspaceSettings {
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
