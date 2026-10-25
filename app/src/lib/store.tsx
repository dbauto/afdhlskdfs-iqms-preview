import { classificationAllows } from "@/lib/classification"
import { replaceEverywhere } from "@/lib/rename"
import { DEFAULT_SETTINGS, mergeSettings, wantsNotification, type WorkspaceSettings } from "@/lib/settings"
import { invitedPreview, saveInvitedPreview, replyInvitedPreview, type InvitedPreview } from "./questionnaire-invitations"
import type { ResponseDraft } from "./questionnaire-workflow"
/**
 * In-memory store for the prototype. Every page reads and writes through here,
 * so adding, editing and deleting work while the app is open.
 *
 * When the backend exists, replace these functions with API calls
 * (for example with TanStack Query) and keep the same names in the pages.
 */
import * as React from "react"

import { CURRENT_USER_ID, ORG, ISSUES, PARTIES, PEOPLE, PROCESSES, ROLES } from "@/data/org"
import { AUDITORS, AUDITS, REMARKS, REQUIREMENTS, CHECKLIST, CHECKLIST_TEMPLATES, GLOSSARY, DOCUMENTS, EVIDENCE_ITEMS, NONCONFORMITIES, IMPROVEMENTS, COMPLAINTS, OBJECTIVES, POLICIES, RISKS } from "@/data/records"
import { ACCESS_LEVELS, type AccessGrant, type AccessRequest, type ChecklistSection, type AccessLevel, type AgreementAcceptance, type AppNotification, type Area, type Person, type Process, type Remark, type Role, type TopDecision } from "@/data/types"
import { NOTIFICATIONS } from "@/data/notifications"
import { REVIEWS, REVIEW_ACTIONS, REVIEW_EVALUATIONS, REVIEW_RECORD_CHECKS, migrateReview } from "@/data/reviews"
import { computeInput, freezeFigure, reviewPeriod } from "@/lib/review-figures"
import { parseDisplayDate, todayIso } from "@/lib/periods"
import { SUPPORT_REPORTS } from "@/data/support"
import { samplePlans, type AuditPlan } from "@/data/audit-plans"
import { ISO_EDITION } from "@/data/iso"
import { applyTheme, DEFAULT_BRAND, type Appearance, type Brand } from "@/lib/theme"
import { DEFAULT_RULES, RULES, type QmsRules } from "@/lib/rules"
import { CURRENT_ORG_ID, isOn, type ModuleMap } from "@/lib/modules"
import { DEFAULT_ROUTES, type RouteDefaults } from "@/lib/routes"

import type { QuestionnaireInvitation, AuditChecklist, QuestionnaireAssignment, AuditeeResponse, AuditorAssessment, EvidenceVerification, ClarificationRequest, AuditReport } from "@/data/audit-types"
import { migrateAudits, scopeAuditRecords, applyAuditCommand, type AuditCommand } from "@/lib/audit-workflow"
import { applyDocumentCommand, type DocumentCommand } from "@/lib/document-control"
import { auditLocked } from "./audit-report-policy"
import { activePerson } from "./audit-form-policy"
import { blockedReason } from "./auditors"
import { isIsoDate } from "./periods"
import { accessTarget, decideAccess, requestAccess, type AccessTarget, type RequestKind } from "./access-requests"

const initial = {
  documents: DOCUMENTS,
  ncs: NONCONFORMITIES,
  improvements: IMPROVEMENTS,
  complaints: COMPLAINTS,
  risks: RISKS,
  objectives: OBJECTIVES,
  policies: POLICIES,
  audits: AUDITS,
  auditChecklists: [{ id: "IA-2026-05", auditId: "IA-2026-05", version: 1, usesQuestionnaire: false, sections: CHECKLIST, status: "Draft" }] as AuditChecklist[],
  questionnaireAssignments: [] as QuestionnaireAssignment[],
  questionnaireInvitations: [] as QuestionnaireInvitation[],
  auditeeResponses: [] as AuditeeResponse[],
  auditorAssessments: [] as AuditorAssessment[],
  evidenceVerifications: [] as EvidenceVerification[],
  clarificationRequests: [] as ClarificationRequest[],
  auditReports: [] as AuditReport[],
  /** mock, certification and whole-QMS audits with a timetable (Audits › Audit plans) */
  auditPlans: samplePlans({ body: "Example Certification Body Inc.", scope: "Precision tooling fabrication and machining", sites: "Head office", standard: ISO_EDITION }) as AuditPlan[],
  evidence: EVIDENCE_ITEMS,
  parties: PARTIES,
  issues: ISSUES,
  roles: ROLES,
  people: PEOPLE,
  processes: PROCESSES,
  templates: CHECKLIST_TEMPLATES,
  glossary: GLOSSARY,
  auditors: AUDITORS,
  remarks: REMARKS,
  requirements: REQUIREMENTS,
  notifications: NOTIFICATIONS,
  reviews: REVIEWS,
  reviewActions: REVIEW_ACTIONS,
  reviewRecordChecks: REVIEW_RECORD_CHECKS,
  reviewEvaluations: REVIEW_EVALUATIONS,
  supportReports: SUPPORT_REPORTS,
  agreements: [] as AgreementAcceptance[],
  topDecisions: [] as TopDecision[],
  /** requests for access to a record or a process's shared documents (ADR-037) */
  accessRequests: [] as AccessRequest[],
  /** records opened to one person outside their role's process scope */
  accessGrants: [] as AccessGrant[],
}

export type State = typeof initial

/**
 * Reviews in an older shape are brought up to date, and a review whose pack was sent before
 * pack snapshots existed gets one, worked out from the data as it is now.
 */
function prepareReviews(state: State): State {
  const reviews = state.reviews.map(migrateReview).map((r) => {
    if (!r.packSentOn || r.packSnapshot || r.stage === "Reviewed" || r.stage === "Closed") return r
    const period = reviewPeriod(r, (d) => parseDisplayDate(d))
    const sentAt = parseDisplayDate(r.packSentOn) ?? period.end
    const figures = Object.fromEntries(r.inputs.map((i) => [i.ref, { ...freezeFigure(computeInput(i.ref, state, period, { review: r, canSee: () => true }), () => undefined), computedAt: `${sentAt}T09:00:00` }]))
    return { ...r, packSnapshot: { sentAt, figures } }
  })
  return { ...state, reviews }
}

/** The sample data, as a new browser first sees it. */
const sampleState = prepareReviews(migrateAudits(initial))

export type Collection = keyof State
type ItemOf<C extends Collection> = State[C][number]
const protectedAuditCollections = new Set<Collection>(["auditChecklists", "questionnaireInvitations", "questionnaireAssignments", "auditeeResponses", "auditorAssessments", "evidenceVerifications", "clarificationRequests", "auditReports"])

type Action =
  | { type: "add"; collection: Collection; item: { id: string } }
  | { type: "update"; collection: Collection; id: string; patch: object }
  | { type: "remove"; collection: Collection; id: string }
  | { type: "replace"; state: State }

/*
 * Preview only: the store is saved in this browser so a record opened in a new tab sees the same
 * data. It isn't shared between people or devices, isn't secure, and doesn't apply the server's
 * access rules (plan v3 §9). When the backend exists, the API is the source of truth and this goes.
 */
export const PREVIEW_STORE_KEY = "thryvems.preview.v1"
const PREVIEW_VERSION = 1

/** Brings saved data up to date with the current shape. Missing collections come from the sample data. */
function migrate(saved: Partial<State>): State {
  const next = { ...sampleState }
  for (const k of Object.keys(initial) as Collection[]) {
    if (Array.isArray(saved[k])) (next as Record<Collection, unknown>)[k] = saved[k]
  }
  // remarks on a risk open the risk itself, not the register
  next.remarks = next.remarks.map((m) => (m.kind === "Risk" && m.to === "/risks" ? { ...m, to: `/risks/${m.targetId}` } : m))
  // the Confidential grant arrived after some previews were saved: give built-in roles their default
  next.roles = next.roles.map((r) => (r.confidentialRead === undefined && ROLES.find((x) => x.id === r.id)?.confidentialRead ? { ...r, confidentialRead: true } : r))
  // the readiness grant replaced a fixed list of roles: give built-in roles their default
  next.roles = next.roles.map((r) => (r.seesReadiness === undefined && ROLES.find((x) => x.id === r.id)?.seesReadiness ? { ...r, seesReadiness: true } : r))
  return prepareReviews(migrateAudits(next))
}

function loadSaved(): State | undefined {
  try {
    const raw = window.localStorage.getItem(PREVIEW_STORE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { version?: number; state?: Partial<State> }
    if (parsed.version !== PREVIEW_VERSION || !parsed.state) return undefined
    return migrate(parsed.state)
  } catch {
    return undefined
  }
}

function reducer(state: State, action: Action): State {
  if (action.type === "replace") return action.state
  const list = state[action.collection] as { id: string }[]
  switch (action.type) {
    case "add":
      return { ...state, [action.collection]: [action.item, ...list] }
    case "update":
      return { ...state, [action.collection]: list.map((x) => (x.id === action.id ? { ...x, ...action.patch } : x)) }
    case "remove":
      return { ...state, [action.collection]: list.filter((x) => x.id !== action.id) }
  }
}

/** roles whose scope reaches every process; the rest see only processes they own or are assigned to */
const WIDE_SCOPES: Role["scope"][] = ["All processes", "Not their own process"]

/** does this role see every process? Only these people see management review summary figures (plan v3 §9: filter before counting). */
export const coversAllProcesses = (role: Role) => WIDE_SCOPES.includes(role.scope)

/** may this person see this process? Owners and assigned members always can. */
export function inProcess(p: Process, person: Person, role: Role) {
  return WIDE_SCOPES.includes(role.scope) || p.owner === person.name || !!p.members?.includes(person.name)
}

/** the documents and evidence opened to this person by an access grant */
export function grantedTo(state: Pick<State, "accessGrants">, person: Pick<Person, "name">) {
  const mine = (state.accessGrants ?? []).filter((g) => g.person === person.name)
  return {
    documents: new Set(mine.filter((g) => g.kind === "Document").map((g) => g.targetId)),
    evidence: new Set(mine.filter((g) => g.kind === "Evidence").map((g) => g.targetId)),
  }
}

/**
 * The records this person may see, by process. Records follow their process: if the process is
 * out of scope, its documents, risks, objectives, audits, nonconformities and remarks are left out
 * before anything is listed, counted or searched. Evidence shows when any of its processes is in
 * scope. Records not tied to a process (company-wide) are unaffected. Classification still applies
 * on top through canSee. The backend enforces the same rule on every request (plan v3 §9).
 */
function processScopeState(state: State, person: Person, role: Role): State {
  if (WIDE_SCOPES.includes(role.scope)) return state
  const known = new Set(state.processes.map((p) => p.name))
  const mine = new Set(state.processes.filter((p) => inProcess(p, person, role)).map((p) => p.name))
  const ok = (process?: string) => !process || !known.has(process) || mine.has(process)
  const hiddenIds = new Set(state.processes.filter((p) => !mine.has(p.name)).map((p) => p.id))
  // an owner's grant opens one record outside the person's processes; classification still applies on top
  const granted = grantedTo(state, person)
  const visible = {
    documents: new Set(state.documents.filter((d) => ok(d.process) || granted.documents.has(d.id)).map((d) => d.id)),
    ncs: new Set(state.ncs.filter((n) => ok(n.process)).map((n) => n.id)),
    risks: new Set(state.risks.filter((r) => ok(r.process)).map((r) => r.id)),
    audits: new Set(state.audits.filter((a) => ok(a.process)).map((a) => a.id)),
    evidence: new Set(state.evidence.filter((e) => e.processes.length === 0 || e.processes.some(ok) || granted.evidence.has(e.id)).map((e) => e.id)),
  }
  const remarkOk = (m: Remark) => {
    switch (m.kind) {
      case "Process": return !hiddenIds.has(m.targetId)
      case "Document": return visible.documents.has(m.targetId)
      case "Nonconformity": return visible.ncs.has(m.targetId)
      case "Risk": return visible.risks.has(m.targetId)
      case "Audit": return visible.audits.has(m.targetId)
      case "Evidence": return visible.evidence.has(m.targetId)
      default: return true
    }
  }
  return {
    ...state,
    processes: state.processes.filter((p) => mine.has(p.name)),
    templates: state.templates.filter(t => ok(t.process)),
    documents: state.documents.filter((d) => visible.documents.has(d.id)),
    ncs: state.ncs.filter((n) => visible.ncs.has(n.id)),
    risks: state.risks.filter((x) => visible.risks.has(x.id)),
    objectives: state.objectives.filter((o) => ok(o.process)),
    improvements: state.improvements.filter((i) => ok(i.process)),
    complaints: state.complaints.filter((c) => ok(c.process)),
    audits: state.audits.filter((a) => visible.audits.has(a.id)),
    auditChecklists: state.auditChecklists.filter((c) => visible.audits.has(c.auditId)),
    evidence: state.evidence.filter((e) => visible.evidence.has(e.id)),
    remarks: state.remarks.filter(remarkOk),
  }
}

function scopeState(state: State, person: Person, role: Role): State {
  const scoped = scopeAuditRecords(processScopeState(state, person, role), state, person, role)
  // access requests and grants are seen only by the person asking and the owner deciding
  return {
    ...scoped,
    accessRequests: state.accessRequests.filter((q) => q.person === person.name || q.decider === person.name),
    accessGrants: state.accessGrants.filter((g) => g.person === person.name || g.grantedBy === person.name),
  }
}

interface StoreValue {
  /** what the signed-in person may see: already narrowed to their processes */
  state: State
  auditCommand: (command: AuditCommand) => void
  documentCommand: (command: DocumentCommand) => void
  invitedPreview: (invitationId: string) => InvitedPreview | undefined
  saveInvitedPreview: (invitationId: string, responses: ResponseDraft[], submit: boolean) => void
  replyInvitedPreview: (invitationId: string, requestId: string, reply: string) => void
  /** a Public or Internal record outside this person's processes that they may ask for; undefined otherwise */
  accessTarget: (kind: RequestKind, id: string) => AccessTarget | undefined
  requestAccess: (input: { kind: RequestKind; id: string; scope: "Record" | "Process"; note?: string }) => void
  /** the owner a request was sent to grants the ticked records, or declines with a reason */
  decideAccess: (requestId: string, decision: { grant: string[] } | { decline: string }) => void
  /** every ID in a collection, including records this person can't see. IDs only, for numbering new records; the backend assigns numbers itself. */
  takenIds: (collection: Collection) => string[]
  add: <C extends Collection>(collection: C, item: ItemOf<C>) => void
  update: <C extends Collection>(collection: C, id: string, patch: Partial<ItemOf<C>>) => void
  remove: (collection: Collection, id: string) => void
  /** rename a person or process everywhere it is referenced; refuses a name already in use */
  rename: (kind: "person" | "process", id: string, name: string) => void
  /** prototype only: who is signed in */
  userId: string
  setUserId: (id: string) => void
  user: (typeof PEOPLE)[number]
  role: (typeof ROLES)[number]
  /** true when the signed-in person's role has at least `level` for `area` */
  can: (area: Area, level?: AccessLevel) => boolean
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  /** company branding, set by a client admin; stored per company by the backend later */
  brand: Brand
  setBrand: (b: Brand) => void
  /** this person's light or dark view */
  appearance: Appearance
  setAppearance: (a: Appearance) => void
  /** company QMS rules (Settings › QMS rules) */
  rules: QmsRules
  setRules: (r: QmsRules) => void
  settings: WorkspaceSettings
  saveSettings: <K extends keyof WorkspaceSettings>(section: K, value: WorkspaceSettings[K]) => void
  /** sections turned on for each client, by organisation id (Platform › Organisations) */
  modules: Record<string, ModuleMap>
  setModules: (orgId: string, map: ModuleMap) => void
  /** may the signed-in person see a record with this classification? Outside consultants only see confidential records they're named on. */
  canSee: (classification: string, viewers?: string[], owner?: string, route?: string[]) => boolean
  /** is this section turned on for the signed-in client? */
  moduleOn: (area: Area) => boolean
  /** company review route defaults (Settings › Review and approval) */
  routeDefaults: RouteDefaults
  setRouteDefaults: (r: RouteDefaults) => void
  /** send an in-app notification to each named person except the one acting. Email follows Settings › Notifications once the backend exists. */
  notify: (to: string[], n: Omit<AppNotification, "id" | "to" | "when" | "age" | "read" | "from">) => void
  /** preview only: put the sample data back, in every open tab */
  resetSampleData: () => void
}

const StoreContext = React.createContext<StoreValue | null>(null)

function readJson<T>(key: string): T | undefined {
  try {
    const raw = readPref(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}
function readPref(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage can be blocked; the app still works */
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = React.useReducer(reducer, sampleState, (init) => loadSaved() ?? init)
  const currentState = React.useRef(state)
  currentState.current = state
  const lastSaved = React.useRef<string | null>(null)
  const persist = (next: State) => {
    let raw: string
    try {
      raw = JSON.stringify({ version: PREVIEW_VERSION, state: next })
    } catch {
      return
    }
    if (raw === lastSaved.current) return
    lastSaved.current = raw
    writePref(PREVIEW_STORE_KEY, raw)
  }
  const dispatch = (action: Action) => {
    const next = reducer(currentState.current, action)
    currentState.current = next
    // Publish our own edit before another tab can read or echo an older snapshot.
    persist(next)
    rawDispatch({ type: "replace", state: next })
  }
  React.useEffect(() => { persist(currentState.current) }, [])
  React.useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key !== PREVIEW_STORE_KEY) return
      // Storage events can queue up while someone types. Only import the latest value.
      if (e.newValue !== readPref(PREVIEW_STORE_KEY)) return
      if (e.newValue === null) {
        lastSaved.current = null
        currentState.current = sampleState
        return rawDispatch({ type: "replace", state: sampleState })
      }
      if (e.newValue === lastSaved.current) return
      try {
        const parsed = JSON.parse(e.newValue) as { version?: number; state?: Partial<State> }
        if (parsed.version !== PREVIEW_VERSION || !parsed.state) return
        const next = migrate(parsed.state)
        lastSaved.current = JSON.stringify({ version: PREVIEW_VERSION, state: next })
        currentState.current = next
        // Import a peer's snapshot without writing it back into that peer's tab.
        rawDispatch({ type: "replace", state: next })
      } catch {
        /* ignore data this version can't read */
      }
    }
    window.addEventListener("storage", on)
    return () => window.removeEventListener("storage", on)
  }, [])
  const [userId, setUserIdRaw] = React.useState(() => readPref("iqms.viewAs") ?? CURRENT_USER_ID)
  const [sidebarCollapsed, setCollapsedRaw] = React.useState(() => readPref("iqms.sidebar") === "collapsed")
  const [brand, setBrandRaw] = React.useState<Brand>(() => {
    try {
      return { ...DEFAULT_BRAND, ...JSON.parse(readPref("iqms.brand") ?? "{}") }
    } catch {
      return DEFAULT_BRAND
    }
  })
  const [modules, setModulesRaw] = React.useState<Record<string, ModuleMap>>(() => {
    try {
      return JSON.parse(readPref("iqms.modules") ?? "{}")
    } catch {
      return {}
    }
  })
  // QMS rules, review routes and workspace settings are kept in this browser, so a reload keeps them
  const [routeDefaults, setRouteDefaultsRaw] = React.useState<RouteDefaults>(() => readJson<RouteDefaults>("iqms.routes") ?? DEFAULT_ROUTES)
  const [rules, setRulesRaw] = React.useState<QmsRules>(() => {
    const saved = readJson<Partial<QmsRules>>("iqms.rules")
    if (saved) Object.assign(RULES, saved)
    return { ...RULES }
  })
  const [settings, setSettingsRaw] = React.useState<WorkspaceSettings>(() => mergeSettings(readJson<Partial<WorkspaceSettings>>("iqms.settings")))
  const settingsRef = React.useRef(settings)
  settingsRef.current = settings
  // pages read the company name from ORG, as they read RULES; keep it in step with Settings › Organization profile
  ORG.name = settings.org.name
  const [appearance, setAppearanceRaw] = React.useState<Appearance>(() => (readPref("iqms.appearance") as Appearance) || "Light")

  React.useLayoutEffect(() => {
    applyTheme(brand, appearance)
    if (appearance !== "Device") return
    let mq: MediaQueryList | undefined
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)")
    } catch {
      return
    }
    const on = () => applyTheme(brand, appearance)
    mq.addEventListener?.("change", on)
    return () => mq?.removeEventListener?.("change", on)
  }, [brand, appearance])

  const value = React.useMemo<StoreValue>(() => {
    const user = state.people.find((p) => p.id === userId) ?? state.people[0]
    const role = state.roles.find((r) => r.id === user.roleId) ?? state.roles[0]
    function guardTemplate(id?: string, process?: string) {
      const current = currentState.current
      const actor = current.people.find(p => p.id === user.id)
      const currentRole = current.roles.find(r => r.id === actor?.roleId)
      if (!actor || actor.status === "Deactivated" || (actor.accessEndsOn && actor.accessEndsOn < todayIso()) || !currentRole || currentRole.id === "guest-auditor" || !isOn(modules[CURRENT_ORG_ID], "Audits") || ACCESS_LEVELS.indexOf(currentRole.access.Audits ?? "None") < ACCESS_LEVELS.indexOf("Add and edit")) throw Error("You don’t have permission to change checklist templates.")
      if (id && !scopeState(current, actor, currentRole).templates.some(t => t.id === id)) throw Error("This checklist template is not available.")
      if (process && !current.processes.some(p => p.name === process && inProcess(p, actor, currentRole))) throw Error("This process is not available.")
    }
    function guardAudit(operation: "add" | "update" | "remove", id: string, patch: Partial<State["audits"][number]> = {}) {
      const current = currentState.current, before = current.audits.find(a => a.id === id)
      if (!activePerson(user) || !isOn(modules[CURRENT_ORG_ID], "Audits") || ["consultant", "guest-auditor"].includes(role.id) || !["Add and edit", "Manage"].includes(role.access.Audits)) throw Error("You don’t have permission to change audit plans.")
      if (operation !== "add" && (!before || !scopeState(current, user, role).audits.some(a => a.id === id))) throw Error("This audit is not available.")
      if (operation === "add" && (before || patch.state !== "Planned")) throw Error("Create a new audit plan with an unused number.")
      if (operation === "update" && ("state" in patch || "reportDate" in patch || "heldDate" in patch)) throw Error("Use the audit workflow to complete work or issue a report.")
      if (operation !== "add" && auditLocked(current, id)) throw Error("The issued audit is read-only. Start a report amendment first.")
      const hasWork = current.auditChecklists.some(c => c.auditId === id) || current.auditReports.some(r => r.auditId === id)
      if (operation === "remove") { if (hasWork) throw Error("An audit with saved work cannot be deleted. Withdraw unneeded forms instead."); return }
      const next = { ...before, ...patch }, target = current.processes.find(p => p.name === next.process)
      if (!target || (!before || next.process !== before.process) && !inProcess(target, user, role)) throw Error("This process is not available.")
      if (before && hasWork && next.process !== before.process) throw Error("Keep the process of an audit with saved work. Use Copy to another process instead.")
      if (!next.lead || !next.auditors || new Set([next.lead, ...next.auditors]).size !== next.auditors.length + 1) throw Error("Choose the lead and each auditor once.")
      const auditee = current.people.find(p => p.name === next.auditee)
      if (!activePerson(auditee) || [next.lead, ...next.auditors].includes(auditee!.name) || current.roles.find(r => r.id === auditee!.roleId)?.access.Audits === "None") throw Error("Choose an active auditee outside the audit team who can review findings.")
      for (const name of [next.lead, ...next.auditors]) {
        const p = current.people.find(p => p.name === name), a = current.auditors.find(a => a.name === name && a.status === "Active")
        if (!activePerson(p) || !a || (name === next.lead && a.level !== "Lead auditor") || blockedReason(a, target.name, current.processes, current.people)) throw Error("Choose active, independently qualified auditors for this process.")
      }
      if (next.plannedDate && !isIsoDate(next.plannedDate) || next.reportDueDate && !isIsoDate(next.reportDueDate)) throw Error("Enter valid audit and report dates.")
    }
    function notifyRaw(to: string[], n: Omit<AppNotification, "id" | "to" | "when" | "age" | "read" | "from">) {
      for (const name of new Set(to)) {
        if (!name || name === user.name) continue
        // the person turned this kind off in Settings › Notifications
        const to = currentState.current.people.find((p) => p.name === name)
        if (to && !wantsNotification(settingsRef.current, to.id, n.kind)) continue
        dispatch({ type: "add", collection: "notifications", item: { ...n, id: `nt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, to: name, from: user.name, when: "Just now", age: 0, read: false } as AppNotification })
      }
    }
    return {
      state: scopeState(state, user, role),
      invitedPreview: id => isOn(modules[CURRENT_ORG_ID], "Audits") ? invitedPreview(state, id) : undefined,
      saveInvitedPreview: (id, responses, submit) => { if (!isOn(modules[CURRENT_ORG_ID], "Audits")) throw Error("Audits is turned off for this workspace."); dispatch({ type: "replace", state: saveInvitedPreview(currentState.current, id, responses, submit) }) },
      replyInvitedPreview: (id, requestId, reply) => { if (!isOn(modules[CURRENT_ORG_ID], "Audits")) throw Error("Audits is turned off for this workspace."); dispatch({ type: "replace", state: replyInvitedPreview(currentState.current, id, requestId, reply) }) },
      auditCommand: (command) => { if (!isOn(modules[CURRENT_ORG_ID], "Audits")) throw Error("Audits is turned off for this workspace."); dispatch({ type: "replace", state: applyAuditCommand(currentState.current, user, role, command) }) },
      documentCommand: (command) => { if (!isOn(modules[CURRENT_ORG_ID], "Documents")) throw Error("Documents is turned off for this workspace."); dispatch({ type: "replace", state: applyDocumentCommand(currentState.current, user, command) }) },
      accessTarget: (kind, id) => accessTarget(state, scopeState(state, user, role), user, kind, id),
      requestAccess: (input) => {
        const current = currentState.current
        const { state: next, request } = requestAccess(current, scopeState(current, user, role), user, input)
        dispatch({ type: "replace", state: next })
        const what = request.scope === "Process" ? `the shared records of ${request.process}` : request.targetId
        notifyRaw([request.decider], { kind: "Waiting on you", title: `${user.name} asks for access to ${what}`, body: request.note, href: `/access-requests/${request.id}` })
      },
      decideAccess: (requestId, decision) => {
        const next = decideAccess(currentState.current, user, role, requestId, decision)
        dispatch({ type: "replace", state: next })
        const q = next.accessRequests.find((x) => x.id === requestId)!
        const what = q.scope === "Process" ? `${q.process} records` : q.targetId
        notifyRaw([q.person], q.status === "Granted"
          ? { kind: "Shared", title: `${user.name} gave you access to ${q.granted!.length === 1 ? q.granted![0] : `${q.granted!.length} ${what}`}`, href: q.granted!.length !== 1 ? `/access-requests/${q.id}` : q.granted![0].startsWith("EV-") ? `/evidence/${q.granted![0]}` : `/documents/${q.granted![0]}` }
          : { kind: "Shared", title: `${user.name} declined your request for ${what}`, body: q.reason, href: `/access-requests/${q.id}` })
      },
      takenIds: (collection) => (state[collection] as { id: string }[]).map((x) => x.id),
      add: (collection, item) => { if (collection === "audits") guardAudit("add", item.id, item as State["audits"][number]); if (collection === "templates") guardTemplate(undefined, (item as State["templates"][number]).process); if (protectedAuditCollections.has(collection)) throw Error("Use the audit workflow action for this record."); dispatch({ type: "add", collection, item: item as { id: string } }) },
      update: (collection, id, patch) => { if (collection === "audits") guardAudit("update", id, patch as Partial<State["audits"][number]>); if (collection === "templates") guardTemplate(id, (patch as Partial<State["templates"][number]>).process); if (protectedAuditCollections.has(collection)) throw Error("Use the audit workflow action for this record."); dispatch({ type: "update", collection, id, patch: patch as object }) },
      remove: (collection, id) => { if (collection === "audits") guardAudit("remove", id); if (collection === "templates") guardTemplate(id); if (protectedAuditCollections.has(collection)) throw Error("Audit history cannot be deleted here."); dispatch({ type: "remove", collection, id }) },
      rename: (kind, id, name) => {
        const s = currentState.current
        const to = name.trim()
        const list: { id: string; name: string }[] = kind === "person" ? s.people : s.processes
        const item = list.find((x) => x.id === id)
        if (!item || !to) throw Error("Nothing to rename.")
        if (item.name === to) return
        if (list.some((x) => x.id !== id && x.name.toLowerCase() === to.toLowerCase())) throw Error(kind === "person" ? `Someone is already called ${to}.` : `There is already a process called ${to}.`)
        const next = replaceEverywhere(s, item.name, to)
        currentState.current = next
        persist(next)
        rawDispatch({ type: "replace", state: next })
      },
      userId,
      setUserId: (id) => {
        writePref("iqms.viewAs", id)
        setUserIdRaw(id)
      },
      user,
      role,
      can: (area, level = "View") => isOn(modules[CURRENT_ORG_ID], area) && ACCESS_LEVELS.indexOf(role.access[area] ?? "None") >= ACCESS_LEVELS.indexOf(level),
      modules,
      setModules: (orgId, map) => {
        const next = { ...modules, [orgId]: map }
        writePref("iqms.modules", JSON.stringify(next))
        setModulesRaw(next)
      },
      moduleOn: (area) => isOn(modules[CURRENT_ORG_ID], area),
      // plan v3 §9: one classification rule for lists, counts and record pages (lib/classification.ts)
      canSee: (classification, viewers = [], owner, route) => classificationAllows(classification, { viewers, owner, route }, user, role),
      routeDefaults,
      setRouteDefaults: (r) => {
        writePref("iqms.routes", JSON.stringify(r))
        setRouteDefaultsRaw(r)
      },
      notify: (to, n) => notifyRaw(to, n),
      resetSampleData: () => {
        try {
          window.localStorage.removeItem(PREVIEW_STORE_KEY)
        } catch {
          /* storage can be blocked */
        }
        lastSaved.current = null
        dispatch({ type: "replace", state: sampleState })
        // reset the workspace settings and rules too, so the sample is as a new visitor sees it
        for (const k of ["iqms.settings", "iqms.rules", "iqms.routes"]) {
          try {
            window.localStorage.removeItem(k)
          } catch {
            /* storage can be blocked */
          }
        }
        Object.assign(RULES, DEFAULT_RULES)
        setRulesRaw({ ...DEFAULT_RULES })
        setRouteDefaultsRaw(DEFAULT_ROUTES)
        settingsRef.current = DEFAULT_SETTINGS
        setSettingsRaw(DEFAULT_SETTINGS)
      },
      sidebarCollapsed,
      setSidebarCollapsed: (v) => {
        writePref("iqms.sidebar", v ? "collapsed" : "open")
        setCollapsedRaw(v)
      },
      brand,
      setBrand: (b) => {
        writePref("iqms.brand", JSON.stringify(b))
        setBrandRaw(b)
      },
      rules,
      setRules: (r) => {
        Object.assign(RULES, r)
        writePref("iqms.rules", JSON.stringify(r))
        setRulesRaw({ ...r })
      },
      settings,
      saveSettings: (section, value) => {
        const next = { ...settingsRef.current, [section]: value }
        settingsRef.current = next
        writePref("iqms.settings", JSON.stringify(next))
        setSettingsRaw(next)
      },
      appearance,
      setAppearance: (a) => {
        writePref("iqms.appearance", a)
        setAppearanceRaw(a)
      },
    }
  }, [state, userId, sidebarCollapsed, brand, appearance, rules, modules, routeDefaults, settings])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

/** The store when there is one (pages and their components), or null (the platform console, tests). */
export function useOptionalStore() {
  return React.useContext(StoreContext)
}

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>")
  return ctx
}

/** Next ID in a series, for example nextId(["NC-2026-011"], "NC-2026-") -> "NC-2026-012" */
/** "Operations" when this person can see it, otherwise their first process; forms use it as the starting choice */
export function startProcess(processes: { name: string }[], preferred = "Operations") {
  return processes.some((p) => p.name === preferred) ? preferred : (processes[0]?.name ?? "")
}

export { nextId } from "@/lib/ids"
