import * as React from "react"

/**
 * Platform team roles and permissions (ADR-041).
 * - Developer: everything, and the only role that can deploy, promote, roll back or change AI keys.
 * - Co-admin: runs clients, requests, finance and reports; no deploy controls; can add Co-admins and Admin support.
 * - Admin support: support reports and support access, read-only organisations and logs.
 * Nobody can give a role higher than their own. In the preview, "View as" switches the signed-in person;
 * in production the server checks every permission on every request.
 */
export type PlatformRole = "Developer" | "Co-admin" | "Admin support"

export type PlatformPermission =
  | "org.view"
  | "org.manage"
  | "requests.decide"
  | "deploy"
  | "finance.view"
  | "reports.gov"
  | "scans.view"
  | "scans.run"
  | "support.handle"
  | "support.access"
  | "logs.view"
  | "ai.manage"
  | "team.manage"

export const PERMISSIONS: { key: PlatformPermission; label: string; help: string }[] = [
  { key: "org.view", label: "See organisations", help: "Accounts, health, plan and seats; never client records" },
  { key: "org.manage", label: "Change plans and features", help: "Plan, seats, modules and feature switches" },
  { key: "requests.decide", label: "Decide requests", help: "New organisations, more seats, missing client admin" },
  { key: "deploy", label: "Deploy and roll back", help: "Sandboxes, promote, deploy, roll back, run or retry jobs, archive organisations" },
  { key: "finance.view", label: "See finance", help: "Revenue, costs, invoices, partner share" },
  { key: "reports.gov", label: "Government reports", help: "Generate drafts and record filings" },
  { key: "scans.view", label: "See security scans", help: "Bot scans, AI reviews, findings, audit report" },
  { key: "scans.run", label: "Start AI reviews", help: "Uses the AI vulnerability scanner budget" },
  { key: "support.handle", label: "Handle support reports", help: "Reply, check screenshots, use AI drafts" },
  { key: "support.access", label: "Ask for support access", help: "Time-limited access granted by the client" },
  { key: "logs.view", label: "See logs and jobs", help: "Read-only, ids only" },
  { key: "ai.manage", label: "Manage AI assistants", help: "API keys, models, prompts, budgets" },
  { key: "team.manage", label: "Add and change team members", help: "Never above their own role" },
]

export const ROLE_RANK: Record<PlatformRole, number> = { Developer: 3, "Co-admin": 2, "Admin support": 1 }

export const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  Developer: PERMISSIONS.map((p) => p.key),
  "Co-admin": ["org.view", "org.manage", "requests.decide", "finance.view", "reports.gov", "scans.view", "scans.run", "support.handle", "support.access", "logs.view", "team.manage"],
  "Admin support": ["org.view", "support.handle", "support.access", "logs.view"],
}

/** a partner works as a Co-admin limited to their own organisations: no deployments, team, reports, scans or logs */
export const PARTNER_PERMISSIONS: PlatformPermission[] = ["org.view", "org.manage", "finance.view", "support.handle", "support.access"]

export const ROLE_HELP: Record<PlatformRole, string> = {
  Developer: "Everything, including deployments, AI keys and the team. Only Danica holds this today.",
  "Co-admin": "Runs clients, requests, finance and reports. Sees deployments but can’t deploy or roll back.",
  "Admin support": "Answers support reports and asks clients for support access. Read-only organisations and logs.",
}

export interface PlatformMember {
  id: string
  name: string
  email: string
  role: PlatformRole
  last: string
  state: "Active" | "Invited"
  /** a business partner works in the console as a Co-admin limited to their own organisations (ADR-042) */
  partnerId?: "partner-a" | "partner-b"
}

const START: PlatformMember[] = [
  { id: "danica", name: "Danica", email: "danica@iqms.example", role: "Developer", last: "Now", state: "Active" },
  { id: "leo", name: "Leo Navarro", email: "leo.navarro@iqms.example", role: "Co-admin", last: "Today", state: "Active" },
  { id: "ria", name: "Ria Gomez", email: "ria.gomez@iqms.example", role: "Admin support", last: "Today", state: "Active" },
  { id: "paolo", name: "Paolo Reyes", email: "paolo@partner-a.example", role: "Co-admin", last: "Yesterday", state: "Active", partnerId: "partner-a" },
  { id: "mara", name: "Mara Lim", email: "mara@partner-b.example", role: "Co-admin", last: "20 Oct 2026", state: "Active", partnerId: "partner-b" },
]

const KEY = "iqms.platformAccess.v2"
type Saved = { members: PlatformMember[]; me: string }
let current: Saved = load()
const listeners = new Set<() => void>()

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null
    if (s && Array.isArray(s.members) && s.members.some((m) => m.id === s.me)) return s
  } catch {
    /* preview only */
  }
  return { members: START, me: "danica" }
}

function save(next: Saved) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* preview only */
  }
  listeners.forEach((l) => l())
}

/** roles this person may give: never above their own */
export const assignableRoles = (role: PlatformRole) => (Object.keys(ROLE_RANK) as PlatformRole[]).filter((r) => ROLE_RANK[r] <= ROLE_RANK[role])

export function usePlatformAccess() {
  const [, force] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    listeners.add(force)
    return () => {
      listeners.delete(force)
    }
  }, [])
  const me = current.members.find((m) => m.id === current.me) ?? current.members[0]
  const can = (p: PlatformPermission) => (me.partnerId ? PARTNER_PERMISSIONS : ROLE_PERMISSIONS[me.role]).includes(p)
  /** may this person change or remove that member? Only members at or below their own role, never themselves */
  const canManage = (m: PlatformMember) => can("team.manage") && m.id !== me.id && ROLE_RANK[m.role] <= ROLE_RANK[me.role]
  return {
    me,
    members: current.members,
    can,
    canManage,
    viewAs: (id: string) => save({ ...current, me: id }),
    setPartner: (id: string, partnerId?: PlatformMember["partnerId"]) => {
      if (!can("team.manage") || me.role !== "Developer") return false
      save({ ...current, members: current.members.map((x) => (x.id === id ? { ...x, partnerId, role: partnerId ? "Co-admin" : x.role } : x)) })
      return true
    },
    invite: (m: Omit<PlatformMember, "id" | "last" | "state">) => {
      if (!can("team.manage") || ROLE_RANK[m.role] > ROLE_RANK[me.role]) return false
      save({ ...current, members: [...current.members, { ...m, id: `m-${Date.now()}`, last: "Not yet", state: "Invited" }] })
      return true
    },
    changeRole: (id: string, role: PlatformRole) => {
      const m = current.members.find((x) => x.id === id)
      if (!m || !canManage(m) || ROLE_RANK[role] > ROLE_RANK[me.role]) return false
      save({ ...current, members: current.members.map((x) => (x.id === id ? { ...x, role } : x)) })
      return true
    },
    remove: (id: string) => {
      const m = current.members.find((x) => x.id === id)
      if (!m || !canManage(m)) return false
      save({ ...current, members: current.members.filter((x) => x.id !== id) })
      return true
    },
  }
}

/** which permission each console page needs; pages not listed are open to every team member */
export const PAGE_PERMISSION: [string, PlatformPermission][] = [
  ["/platform/approvals", "logs.view"],
  ["/platform/activity", "team.manage"],
  ["/platform/team", "team.manage"],
  ["/platform/finance", "finance.view"],
  ["/platform/government-reports", "reports.gov"],
  ["/platform/scans", "scans.view"],
  ["/platform/ai", "ai.manage"],
  ["/platform/deployments", "logs.view"],
  ["/platform/requests", "requests.decide"],
  ["/platform/organisations", "org.view"],
  ["/platform/reports", "support.handle"],
  ["/platform/support", "support.access"],
  ["/platform/logs", "logs.view"],
  ["/platform/jobs", "logs.view"],
]
export const permissionFor = (path: string) => PAGE_PERMISSION.find(([p]) => path === p || path.startsWith(p + "/"))?.[1]
