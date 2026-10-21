import * as React from "react"

import { PLATFORM_REQUESTS, PLATFORM_TEAM, TENANTS, type Health, type Tenant } from "@/data/admin"

/**
 * Preview store for the platform console (/platform) and the business space (/business).
 * It is kept apart from the client workspace store on purpose: platform accounts, partners and
 * their history belong to the platform database, never to a client database.
 * Everything here is a preview simulation in this browser. Nothing is deployed or sent.
 */

export type ConsoleRole = "developer" | "partner" | "none"
export interface ConsoleUser {
  id: string
  name: string
  role: ConsoleRole
  label: string
  partnerId?: string
}

/** Who the preview console is being viewed as. Real access is checked by the server (Cloudflare Access and sign-in). */
export const CONSOLE_USERS: ConsoleUser[] = [
  { id: "dev", name: "Leo Navarro", role: "developer", label: "Platform owner" },
  { id: "partner-a", name: "Mara Villanueva", role: "partner", label: "Business partner", partnerId: "partner-a" },
  { id: "partner-b", name: "Tomas Aguilar", role: "partner", label: "Business partner", partnerId: "partner-b" },
  { id: "client", name: "A client user", role: "none", label: "No console access" },
]

export const PARTNERS = CONSOLE_USERS.filter((u) => u.role === "partner")

export type DeploymentStatus = "Not provisioned" | "Live"
export type AccountHealth = Health | "Not checked"
export type TeamRole = "Platform admin" | "Support engineer" | "Developer, read-only logs" | "Business partner"
export const TEAM_ROLES: TeamRole[] = ["Platform admin", "Support engineer", "Developer, read-only logs", "Business partner"]

export interface ClientAccount extends Omit<Tenant, "health"> {
  health: AccountHealth
  deployment: DeploymentStatus
  partnerId?: string
  /** Email of the client admin to invite once the workspace is live */
  adminInvite?: string
  archived?: boolean
}

export interface TeamMember {
  name: string
  email: string
  role: TeamRole
  last: string
  partnerId?: string
}

export interface SupportRequest {
  id: string
  orgId: string
  org: string
  admin: string
  by: string
  at: string
}

/** One change to platform data: who, when, why, and the values before and after. */
export interface PlatformEvent {
  id: string
  at: string
  actor: string
  action: string
  target: string
  reason?: string
  before?: string
  after?: string
}

export interface PlatformState {
  accounts: ClientAccount[]
  team: TeamMember[]
  supportRequests: SupportRequest[]
  requestDecisions: Record<string, "yes" | "no">
  events: PlatformEvent[]
}

const ASSIGNED: Record<string, string> = { arden: "partner-a", harborlabs: "partner-a", pacfreight: "partner-b" }

export const initialPlatform: PlatformState = {
  accounts: TENANTS.map((t) => ({ ...t, deployment: "Live", partnerId: ASSIGNED[t.id] })),
  team: [
    ...PLATFORM_TEAM.map((p) => ({ ...p, role: p.role as TeamRole })),
    { name: "Mara Villanueva", email: "mara.villanueva@partner-a.example", role: "Business partner", last: "Today", partnerId: "partner-a" },
    { name: "Tomas Aguilar", email: "tomas.aguilar@partner-b.example", role: "Business partner", last: "Yesterday", partnerId: "partner-b" },
  ],
  supportRequests: [],
  requestDecisions: {},
  events: [],
}

export const PLATFORM_STORE_KEY = "thryvems.platform.v1"
const VIEW_AS_KEY = "thryvems.platform.viewAs"
const VERSION = 1

function read(): PlatformState {
  try {
    const raw = localStorage.getItem(PLATFORM_STORE_KEY)
    if (!raw) return initialPlatform
    const parsed = JSON.parse(raw) as { version?: number; state?: Partial<PlatformState> }
    if (parsed.version !== VERSION || !parsed.state) return initialPlatform
    return { ...initialPlatform, ...parsed.state }
  } catch {
    return initialPlatform
  }
}

function readViewAs() {
  try {
    const id = localStorage.getItem(VIEW_AS_KEY)
    return CONSOLE_USERS.find((u) => u.id === id) ?? CONSOLE_USERS[0]
  } catch {
    return CONSOLE_USERS[0]
  }
}

export type PlanChange = { plan: Tenant["plan"]; seats: number; effective: string; reason: string }

interface PlatformApi {
  state: PlatformState
  user: ConsoleUser
  setUser: (id: string) => void
  /** Accounts this console user may see: all for the platform owner, assigned ones for a partner, none otherwise. */
  visibleAccounts: (asPartner?: string) => ClientAccount[]
  createAccount: (a: { name: string; domain: string; adminInvite: string; plan: Tenant["plan"]; seats: number; partnerId?: string }) => string | null
  archiveAccount: (id: string) => void
  changePlan: (id: string, change: PlanChange) => void
  requestSupport: (id: string) => void
  decideRequest: (id: string, yes: boolean) => void
  undoDecline: (id: string) => void
  addMember: (m: { name: string; email: string; role: TeamRole }) => string | null
  changeRole: (email: string, role: TeamRole, reason: string) => string | null
  removeMember: (email: string, reason: string) => string | null
}

const PlatformContext = React.createContext<PlatformApi | null>(null)

const now = () => new Date().toISOString()
const uid = () => Math.random().toString(36).slice(2, 10)

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PlatformState>(read)
  const [user, setUserRaw] = React.useState<ConsoleUser>(readViewAs)

  React.useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_STORE_KEY, JSON.stringify({ version: VERSION, state }))
    } catch {
      /* the preview still works without storage */
    }
  }, [state])

  const api = React.useMemo<PlatformApi>(() => {
    const log = (s: PlatformState, e: Omit<PlatformEvent, "id" | "at" | "actor">): PlatformState => ({ ...s, events: [{ id: uid(), at: now(), actor: user.name, ...e }, ...s.events] })
    const isOwner = user.role === "developer"
    return {
      state,
      user,
      setUser: (id) => {
        const next = CONSOLE_USERS.find((u) => u.id === id) ?? CONSOLE_USERS[0]
        try {
          localStorage.setItem(VIEW_AS_KEY, next.id)
        } catch {
          /* ignore */
        }
        setUserRaw(next)
      },
      visibleAccounts: (asPartner) => {
        const live = state.accounts.filter((a) => !a.archived)
        if (user.role === "developer") return asPartner ? live.filter((a) => a.partnerId === asPartner) : live
        if (user.role === "partner") return live.filter((a) => a.partnerId === user.partnerId)
        return []
      },
      createAccount: (a) => {
        if (!isOwner) return "Only the platform owner can create client accounts."
        const domain = a.domain.trim().toLowerCase()
        const id = domain.split(".")[0]
        if (state.accounts.some((x) => x.id === id || x.domain === domain)) return "An organisation with this email domain already exists. Use a different domain."
        const account: ClientAccount = {
          id,
          name: a.name.trim(),
          domain,
          plan: a.plan,
          used: 0,
          seats: a.seats,
          admin: "",
          adminInvite: a.adminInvite.trim() || undefined,
          health: "Not checked",
          region: "Singapore",
          created: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          deployment: "Not provisioned",
          partnerId: a.partnerId || undefined,
        }
        setState((s) => log({ ...s, accounts: [account, ...s.accounts] }, { action: "Created client account", target: account.name, after: `${account.plan}, ${account.seats} seats, not provisioned` }))
        return null
      },
      archiveAccount: (id) => {
        const acc = state.accounts.find((a) => a.id === id)
        if (!isOwner || !acc || acc.deployment === "Live") return
        setState((s) => log({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, archived: true } : a)) }, { action: "Archived client account", target: acc.name }))
      },
      changePlan: (id, c) => {
        const acc = state.accounts.find((a) => a.id === id)
        if (!acc || !isOwner) return
        setState((s) =>
          log(
            { ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, plan: c.plan, seats: c.seats } : a)) },
            { action: `Changed plan or seats, effective ${c.effective}`, target: acc.name, reason: c.reason, before: `${acc.plan}, ${acc.seats} seats`, after: `${c.plan}, ${c.seats} seats` }
          )
        )
      },
      requestSupport: (id) => {
        const acc = state.accounts.find((a) => a.id === id)
        if (!acc || !isOwner || state.supportRequests.some((r) => r.orgId === id)) return
        setState((s) => log({ ...s, supportRequests: [{ id: uid(), orgId: id, org: acc.name, admin: acc.admin, by: user.name, at: now() }, ...s.supportRequests] }, { action: "Asked for support access", target: acc.name }))
      },
      decideRequest: (id, yes) => {
        const r = PLATFORM_REQUESTS.find((x) => x.id === id)
        if (!r || !isOwner) return
        setState((s) => {
          let accounts = s.accounts
          let before: string | undefined
          let after: string | undefined
          if (yes && r.id === "q1") {
            const a = accounts.find((x) => x.id === "harborlabs")
            before = a && `${a.plan}, ${a.seats} seats`
            after = "Team, 25 seats"
            accounts = accounts.map((x) => (x.id === "harborlabs" ? { ...x, plan: "Team", seats: 25 } : x))
          }
          if (yes && r.id === "q2") {
            before = "220 seats"
            after = "240 seats"
            accounts = accounts.map((x) => (x.id === "northwind" ? { ...x, seats: 240 } : x))
          }
          if (yes && r.id === "q3") {
            before = "No client admin"
            after = "Juan Perez, client admin"
            accounts = accounts.map((x) => (x.id === "meridian" ? { ...x, admin: "Juan Perez", health: "Not checked" } : x))
          }
          return log({ ...s, accounts, requestDecisions: { ...s.requestDecisions, [id]: yes ? "yes" : "no" } }, { action: yes ? r.doneLabel : "Declined request", target: r.title, before, after })
        })
      },
      undoDecline: (id) => {
        if (!isOwner || state.requestDecisions[id] !== "no") return
        setState((s) => {
          const rest = { ...s.requestDecisions }
          delete rest[id]
          return log({ ...s, requestDecisions: rest }, { action: "Reopened declined request", target: PLATFORM_REQUESTS.find((r) => r.id === id)?.title ?? id })
        })
      },
      addMember: (m) => {
        if (!isOwner) return "Only the platform owner can add team members."
        const email = m.email.trim().toLowerCase()
        if (!m.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a name and a full email address."
        if (state.team.some((t) => t.email === email)) return "This person is already on the platform team."
        setState((s) => log({ ...s, team: [...s.team, { name: m.name.trim(), email, role: m.role, last: "Invited" }] }, { action: "Added team member", target: m.name.trim(), after: m.role }))
        return null
      },
      changeRole: (email, role, reason) => {
        const m = state.team.find((t) => t.email === email)
        if (!isOwner || !m) return "Only the platform owner can change roles."
        if (!reason.trim()) return "Say why the role changes."
        if (m.role === "Platform admin" && role !== "Platform admin" && state.team.filter((t) => t.role === "Platform admin").length === 1) return "Keep at least one platform admin. Make someone else platform admin first."
        setState((s) => log({ ...s, team: s.team.map((t) => (t.email === email ? { ...t, role } : t)) }, { action: "Changed platform role", target: m.name, reason, before: m.role, after: role }))
        return null
      },
      removeMember: (email, reason) => {
        const m = state.team.find((t) => t.email === email)
        if (!isOwner || !m) return "Only the platform owner can remove access."
        if (!reason.trim()) return "Say why access is removed."
        if (m.name === user.name) return "You can’t remove your own access."
        if (m.role === "Platform admin" && state.team.filter((t) => t.role === "Platform admin").length === 1) return "Keep at least one platform admin."
        setState((s) => log({ ...s, team: s.team.filter((t) => t.email !== email) }, { action: "Removed platform access", target: m.name, reason, before: m.role }))
        return null
      },
    }
  }, [state, user])

  return <PlatformContext.Provider value={api}>{children}</PlatformContext.Provider>
}

export function usePlatform() {
  const ctx = React.useContext(PlatformContext)
  if (!ctx) throw new Error("usePlatform must be used inside <PlatformProvider>")
  return ctx
}

export function partnerName(id?: string) {
  return PARTNERS.find((p) => p.partnerId === id)?.name
}
