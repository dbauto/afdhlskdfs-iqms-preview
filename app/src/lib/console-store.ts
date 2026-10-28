import * as React from "react"

import { TENANTS, type Tenant } from "@/data/admin"
import { FEATURES, FINDINGS, PARTNERS, PARTNER_OF, PRICE_PER_USER, RELEASES, SANDBOXES, type Finding, type PartnerId, type Release, type Sandbox } from "@/data/platform"

/**
 * The console's own preview store (ADR-042): approvals, activity, notifications, sandboxes, releases,
 * findings, prices, plan/seat/feature changes, partner assignments and filing records.
 * Kept in this browser so changes survive a reload; in production each of these is a platform table
 * and every change goes through the API with the signed-in member's permissions.
 */
export type ApprovalKind = "Promotion" | "Deployment" | "Rollback" | "AI agent fix" | "AI settings" | "Archive organisation"

export interface Approval {
  id: string
  kind: ApprovalKind
  title: string
  detail: string
  org?: string
  requestedBy: string
  requestedAt: string
  state: "Waiting" | "Approved" | "Declined"
  decidedBy?: string
  decidedAt?: string
  reason?: string
  /** a second admin must decide, never the requester */
  second?: boolean
  /** what approving does */
  effect?: { sandboxId?: string; orgId?: string; version?: string; reportId?: string }
}

export interface Activity {
  id: string
  at: string
  who: string
  role: string
  action: string
  target: string
  kind: "Team" | "Deployments" | "Approvals" | "Organisations" | "Finance" | "Reports" | "Security" | "AI" | "Support"
}

export interface Note {
  id: string
  at: string
  text: string
  to: string
  read: boolean
}

export interface OrgChange {
  plan?: Tenant["plan"]
  seats?: number
  features?: Record<string, boolean>
  version?: string
  archived?: boolean
}

export interface ConsoleState {
  approvals: Approval[]
  activity: Activity[]
  notes: Note[]
  sandboxes: Sandbox[]
  releases: Release[]
  findings: Finding[]
  prices: Record<Tenant["plan"], number>
  orgs: Record<string, OrgChange>
  partnerOf: Record<string, PartnerId>
  shares: Record<PartnerId, number>
  filings: Record<string, { ref: string; date: string; proof?: string }>
}

const now = () => new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const START: ConsoleState = {
  approvals: [
    { id: "ap-1", kind: "Promotion", title: "Promote 2026.10.4 to Arden & Co.", detail: "Bug fix SEC-2026-014 · sandbox tests: 41 passed", org: "Arden & Co.", requestedBy: "Leo Navarro", requestedAt: "27 Oct 2026, 09:40", state: "Waiting", effect: { sandboxId: "sb-arden", orgId: "arden", version: "2026.10.4" } },
    { id: "ap-2", kind: "AI agent fix", title: "Deploy fix for SR-1043", detail: "Stream the evidence export to storage in parts · 41 tests passed", org: "Arden & Co.", requestedBy: "AI agent", requestedAt: "27 Oct 2026, 04:05", state: "Waiting" },
    { id: "ap-3", kind: "AI settings", title: "AI support prompt version 4", detail: "Adds the screenshot-check rule · model unchanged", requestedBy: "Danica", requestedAt: "26 Oct 2026, 17:12", state: "Waiting", second: true },
  ],
  activity: [
    { id: "ac-1", at: "27 Oct 2026, 09:40", who: "Leo Navarro", role: "Co-admin", action: "asked to promote", target: "2026.10.4 to Arden & Co.", kind: "Deployments" },
    { id: "ac-2", at: "27 Oct 2026, 09:12", who: "Ria Gomez", role: "Admin support", action: "replied to", target: "SR-1042", kind: "Support" },
    { id: "ac-3", at: "26 Oct 2026, 17:12", who: "Danica", role: "Developer", action: "proposed", target: "AI support prompt version 4", kind: "AI" },
    { id: "ac-4", at: "26 Oct 2026, 10:03", who: "Danica", role: "Developer", action: "deployed", target: "2026.10.3 to 20 organisations", kind: "Deployments" },
  ],
  notes: [
    { id: "n-1", at: "27 Oct 2026, 09:40", text: "Promotion of 2026.10.4 to Arden & Co. waits for your approval", to: "/platform/approvals", read: false },
    { id: "n-2", at: "27 Oct 2026, 06:00", text: "Library check found 1 high finding (SEC-2026-014), overdue", to: "/platform/scans", read: false },
    { id: "n-3", at: "26 Oct 2026, 22:10", text: "Invoice INV-2026-0189 for Coral Seafoods is 30 days late", to: "/platform/finance", read: true },
  ],
  sandboxes: SANDBOXES,
  releases: RELEASES,
  findings: FINDINGS.map((f) => (f.foundBy === "Claude" ? { ...f, confirmed: false } : f)),
  prices: { ...PRICE_PER_USER },
  orgs: {},
  partnerOf: { ...PARTNER_OF },
  shares: Object.fromEntries(PARTNERS.map((p) => [p.id, p.share])) as Record<PartnerId, number>,
  filings: {},
}

const KEY = "iqms.console.v1"
let state: ConsoleState = load()
const listeners = new Set<() => void>()

function load(): ConsoleState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<ConsoleState> | null
    if (s && typeof s === "object") return { ...START, ...s }
  } catch {
    /* preview only */
  }
  return START
}

function set(next: Partial<ConsoleState>) {
  state = { ...state, ...next }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* preview only: a full or blocked storage keeps working in memory */
  }
  listeners.forEach((l) => l())
}

export function resetConsole() {
  set(START)
}

type Who = { name: string; role: string }

export function useConsole() {
  const [, force] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    listeners.add(force)
    return () => {
      listeners.delete(force)
    }
  }, [])
  const log = (who: Who, action: string, target: string, kind: Activity["kind"]) =>
    set({ activity: [{ id: uid("ac"), at: now(), who: who.name, role: who.role, action, target, kind }, ...state.activity].slice(0, 500) })
  const notify = (text: string, to: string) => set({ notes: [{ id: uid("n"), at: now(), text, to, read: false }, ...state.notes].slice(0, 100) })
  return {
    ...state,
    log,
    notify,
    /** sends something to the Approvals inbox and tells the Developer */
    request(who: Who, a: Omit<Approval, "id" | "requestedBy" | "requestedAt" | "state">) {
      set({ approvals: [{ ...a, id: uid("ap"), requestedBy: who.name, requestedAt: now(), state: "Waiting" }, ...state.approvals] })
      log(who, "asked for approval:", a.title, "Approvals")
      notify(`${a.title} waits for approval`, "/platform/approvals")
    },
    decide(who: Who, id: string, approve: boolean, reason?: string) {
      const a = state.approvals.find((x) => x.id === id)
      if (!a || a.state !== "Waiting") return
      const next: Partial<ConsoleState> = { approvals: state.approvals.map((x) => (x.id === id ? { ...x, state: approve ? "Approved" : "Declined", decidedBy: who.name, decidedAt: now(), reason } : x)) }
      if (approve && a.effect?.sandboxId) next.sandboxes = state.sandboxes.filter((s) => s.id !== a.effect!.sandboxId)
      if (approve && a.effect?.orgId && a.effect.version) next.orgs = { ...state.orgs, [a.effect.orgId]: { ...state.orgs[a.effect.orgId], version: a.effect.version } }
      if (approve && a.kind === "Archive organisation" && a.effect?.orgId) next.orgs = { ...state.orgs, [a.effect.orgId]: { ...state.orgs[a.effect.orgId], archived: true } }
      set(next)
      log(who, approve ? "approved" : "declined", a.title, "Approvals")
    },
    setSandboxes: (sandboxes: Sandbox[]) => set({ sandboxes }),
    addRelease: (r: Release) => set({ releases: [r, ...state.releases] }),
    setFinding: (id: string, change: Partial<Finding>) => set({ findings: state.findings.map((f) => (f.id === id ? { ...f, ...change } : f)) }),
    removeFinding: (id: string) => set({ findings: state.findings.filter((f) => f.id !== id) }),
    setPrice: (plan: Tenant["plan"], value: number) => set({ prices: { ...state.prices, [plan]: value } }),
    changeOrg: (id: string, change: OrgChange) => set({ orgs: { ...state.orgs, [id]: { ...state.orgs[id], ...change } } }),
    assignPartner: (orgId: string, partner?: PartnerId) => {
      const next = { ...state.partnerOf }
      if (partner) next[orgId] = partner
      else delete next[orgId]
      set({ partnerOf: next })
    },
    setShare: (p: PartnerId, share: number) => set({ shares: { ...state.shares, [p]: share } }),
    file: (reportId: string, f: { ref: string; date: string; proof?: string }) => set({ filings: { ...state.filings, [reportId]: f } }),
    markRead: (id?: string) => set({ notes: state.notes.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) }),
  }
}

/** the organisation with the console's changes applied */
export function orgWithChanges(t: Tenant, s: Pick<ConsoleState, "orgs">): Tenant & { archived?: boolean } {
  const c = s.orgs[t.id]
  return c ? { ...t, plan: c.plan ?? t.plan, seats: c.seats ?? t.seats, archived: c.archived } : t
}

/** feature switches for one organisation, with defaults (sections are the client store's modules) */
export function featuresFor(id: string, s: Pick<ConsoleState, "orgs">, aiSupportOrgs: Set<string>) {
  const t = TENANTS.find((x) => x.id === id)
  const c = s.orgs[id] ?? {}
  return Object.fromEntries(FEATURES.map((f) => [f.key, c.features?.[f.key] ?? (f.key === "ai-support" ? !!t && aiSupportOrgs.has(t.name) : f.on)])) as Record<string, boolean>
}
