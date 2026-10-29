import { ACCESS_LEVELS, type AccessLevel, type Area, type Role } from "@/data/types"

/**
 * Action-level permissions (ADR-045). Each part of ThryveMS keeps its access level; each level ticks a
 * set of actions, and a role can switch single actions on or off. Rules that used to be tied to role
 * names (top management, quality manager, consultant, guest auditor) are actions here, with defaults
 * that keep today's behaviour for the built-in roles.
 */
export interface ActionDef {
  key: string
  area: Area | "Remarks"
  label: string
  help?: string
  /** on when the part's level is at least this, unless the role says otherwise */
  min: AccessLevel
  /** today's behaviour for built-in roles, when it differs from the level */
  legacy?: (role: Role) => boolean | undefined
}

const at = (role: Role, area: Area, min: AccessLevel) => ACCESS_LEVELS.indexOf(role.access[area] ?? "None") >= ACCESS_LEVELS.indexOf(min)
const id = (...ids: string[]) => (role: Role) => ids.includes(role.id)
const outsider = (role: Role) => role.id === "consultant" || role.id === "guest-auditor"

export const ACTIONS: ActionDef[] = [
  { key: "readiness.see", area: "Overview", label: "Sees certification readiness", min: "Manage", legacy: (r) => !!r.seesReadiness },
  { key: "readiness.list", area: "Overview", label: "Add and change readiness requirements", min: "Manage", legacy: id("consultant", "quality", "admin") },
  { key: "readiness.confirm", area: "Overview", label: "Confirm readiness items", help: "Moves Ready to confirm requirements to Done", min: "Manage", legacy: id("quality", "admin") },

  { key: "docs.create", area: "Documents", label: "Create and edit drafts", min: "Add and edit" },
  { key: "docs.review", area: "Documents", label: "Do technical reviews", min: "Add and edit", legacy: (r) => (r.id === "consultant" ? false : undefined) },
  { key: "docs.approve", area: "Documents", label: "Approve revisions", min: "Approve", legacy: (r) => (r.id === "consultant" ? false : undefined) },
  { key: "docs.publish", area: "Documents", label: "Publish approved revisions", min: "Approve", legacy: (r) => (r.id === "consultant" ? false : undefined) },
  { key: "docs.archive", area: "Documents", label: "Archive", min: "Manage" },
  { key: "docs.return", area: "Documents", label: "Return archived records to use", help: "With a reason, kept in the history", min: "Manage" },
  { key: "docs.classify", area: "Documents", label: "Change classification", min: "Manage" },
  { key: "docs.share", area: "Documents", label: "Share with people outside the record", min: "Add and edit", legacy: (r) => (r.id === "viewer" ? false : undefined) },
  { key: "docs.upload", area: "Documents", label: "Upload instead of linking", help: "Public and Internal only", min: "Add and edit" },
  { key: "docs.delete", area: "Documents", label: "Delete drafts and files", help: "They go to Deleted for 30 days", min: "Add and edit" },
  { key: "docs.restore", area: "Documents", label: "Restore deleted items", min: "Add and edit" },
  { key: "docs.purge", area: "Documents", label: "Delete for good", help: "Skips the 30 days in Deleted", min: "Manage" },
  { key: "docs.routeOverride", area: "Documents", label: "Change a revision’s review route", min: "Manage", legacy: id("quality", "admin") },
  { key: "docs.qmRule", area: "Documents", label: "Be picked by the “Quality manager” approval rule", help: "Also the default verifier and review preparer", min: "Manage", legacy: id("quality") },
  { key: "docs.decideAccess", area: "Documents", label: "Decide access requests sent to them", min: "View", legacy: (r) => (outsider(r) ? false : undefined) },
  { key: "docs.confidential", area: "Documents", label: "Open Confidential records without being named", min: "Manage", legacy: (r) => !!r.confidentialRead },
  { key: "docs.highly", area: "Documents", label: "Open Highly confidential records without being named", min: "Manage", legacy: () => false },
  { key: "docs.export", area: "Documents", label: "Export and download registers", help: "Excel, CSV and PDF", min: "View" },

  { key: "evidence.add", area: "Evidence", label: "Add, link or upload evidence", min: "Add and edit" },
  { key: "evidence.delete", area: "Evidence", label: "Delete evidence and files", min: "Add and edit" },

  { key: "risks.add", area: "Risks & Opportunities", label: "Add and score risks", min: "Add and edit" },
  { key: "risks.accept", area: "Risks & Opportunities", label: "Accept a risk", min: "Approve" },

  { key: "objectives.targets", area: "Objectives & KPIs", label: "Set objectives and targets", min: "Add and edit" },
  { key: "objectives.results", area: "Objectives & KPIs", label: "Enter results", min: "Add and edit" },

  { key: "ca.raise", area: "Corrective Action", label: "Raise nonconformities", min: "Add and edit" },
  { key: "work.assignable", area: "Corrective Action", label: "Own and be assigned items", help: "Owner, assignee or verifier of actions and reassigned work", min: "View", legacy: (r) => (outsider(r) ? false : undefined) },
  { key: "ca.verify", area: "Corrective Action", label: "Verify effectiveness and close", min: "Approve" },

  { key: "audits.seeAll", area: "Audits", label: "See all audits", help: "Off: only the audits they’re assigned to", min: "View", legacy: (r) => (r.id === "guest-auditor" || r.id === "auditor" ? false : undefined) },
  { key: "audits.plan", area: "Audits", label: "Plan and take part in audits", min: "Add and edit", legacy: (r) => (outsider(r) ? false : undefined) },
  { key: "audits.release", area: "Audits", label: "Manage every audit and release reports", min: "Manage", legacy: (r) => (r.id === "auditor" || r.id === "guest-auditor" ? false : undefined) },
  { key: "audits.templates", area: "Audits", label: "Edit checklist templates", min: "Manage", legacy: (r) => (r.id === "guest-auditor" ? false : undefined) },

  { key: "review.see", area: "Management Review", label: "See management reviews and their minutes", min: "View" },
  { key: "review.start", area: "Management Review", label: "Start a review", help: "Plan a review, set the period and who takes part", min: "Add and edit", legacy: (r) => (r.id === "top" ? true : r.id === "consultant" ? false : undefined) },
  { key: "review.prepare", area: "Management Review", label: "Prepare inputs", help: "Gather the figures and analysis for each input", min: "Add and edit", legacy: (r) => (r.id === "top" ? true : r.id === "consultant" ? false : undefined) },
  { key: "review.reviewer", area: "Management Review", label: "Take part as a reviewer", help: "Read, comment and decide in reviews they’re invited to", min: "Manage", legacy: (r) => r.id === "top" },
  { key: "review.signoff", area: "Management Review", label: "Sign off the review", help: "Records the decisions as top management (clause 9.3.3)", min: "Manage", legacy: (r) => r.id === "top" },
  { key: "review.amend", area: "Management Review", label: "Amend signed minutes", help: "With a reason; the earlier version is kept", min: "Manage" },
  { key: "review.actions", area: "Management Review", label: "Close review actions", help: "Their own actions are always closable", min: "Add and edit", legacy: (r) => (r.id === "consultant" ? false : undefined) },
  { key: "review.delete", area: "Management Review", label: "Delete a review that hasn’t started", min: "Add and edit", legacy: (r) => (r.id === "consultant" ? false : undefined) },

  { key: "policies.publish", area: "Policies", label: "Publish and require acknowledgement", min: "Manage" },

  { key: "remarks.consultant", area: "Remarks", label: "Leave remarks as the consultant", help: "Their remarks and records are marked as the consultant’s", min: "Manage", legacy: (r) => r.id === "consultant" },
  { key: "remarks.write", area: "Remarks", label: "Write and resolve remarks", min: "Manage", legacy: id("consultant", "quality", "admin") },
  { key: "remarks.alerts", area: "Remarks", label: "Get consultant remark alerts", min: "Manage", legacy: id("quality", "admin") },
]

/** may this role do this action? An explicit switch wins; then today's behaviour for built-in roles; then the level. */
export function allows(role: Role, key: string) {
  const def = ACTIONS.find((a) => a.key === key)
  if (!def) return false
  const set = role.actions?.[key]
  if (set !== undefined) return set
  const legacy = def.legacy?.(role)
  if (legacy !== undefined) return legacy
  if (def.area === "Remarks") return false
  return at(role, def.area, def.min)
}

/** the default for an action at a given level, ignoring switches; used to show Custom */
export function levelDefault(role: Role, key: string) {
  return allows({ ...role, actions: {} }, key)
}

/** the parts an action list is grouped into, in menu order */
export const ACTION_AREAS = [...new Set(ACTIONS.map((a) => a.area))]

/** Settings pages each role may open by default, as before (ADR-045 makes them per role). */
export function defaultSettingsAccess(role: Role, need: "admin" | "quality" | "all") {
  if (need === "all") return true
  if (need === "admin") return at(role, "Settings", "Manage")
  return at(role, "QMS", "Manage") || at(role, "Settings", "Manage")
}

/**
 * Can someone with role `me` give role `target`? Never more access than their own in any part, and
 * only someone with Manage on Settings and every part (an Administrator) can make another one.
 * `role.assignUpTo` narrows it further: "none" means they can't give roles at all.
 */
export function canAssign(me: Role, target: Role) {
  if (me.assignUpTo === "none") return false
  if (!at(me, "Settings", "Manage") && !me.settingsPages?.includes("/settings/users")) return false
  const areas = Object.keys(target.access) as Area[]
  return areas.every((a) => ACCESS_LEVELS.indexOf(target.access[a]) <= ACCESS_LEVELS.indexOf(me.access[a] ?? "None"))
}

type P = { name: string; roleId: string; status: string }
/** active people whose role allows the action, by name */
export function peopleAllowed(people: P[], roles: Role[], key: string, includeGuests = true) {
  return people.filter((p) => p.status !== "Deactivated" && (includeGuests || p.status === "Active")).filter((p) => {
    const r = roles.find((x) => x.id === p.roleId)
    return !!r && allows(r, key)
  }).map((p) => p.name)
}
/** does this person's role allow the action? */
export function personAllowed(people: P[], roles: Role[], name: string, key: string) {
  const p = people.find((x) => x.name === name)
  const r = p && roles.find((x) => x.id === p.roleId)
  return !!r && allows(r, key)
}
