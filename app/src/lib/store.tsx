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

import { CURRENT_USER_ID, ISSUES, PARTIES, PEOPLE, PROCESSES, ROLES } from "@/data/org"
import { AUDITORS, AUDITS, REMARKS, REQUIREMENTS, CHECKLIST, CHECKLIST_TEMPLATES, GLOSSARY, DOCUMENTS, EVIDENCE_ITEMS, NONCONFORMITIES, OBJECTIVES, POLICIES, RISKS } from "@/data/records"
import { ACCESS_LEVELS, type ChecklistSection, type AccessLevel, type AgreementAcceptance, type AppNotification, type Area, type Person, type Process, type Remark, type Role } from "@/data/types"
import { NOTIFICATIONS } from "@/data/notifications"
import { REVIEWS, REVIEW_ACTIONS, REVIEW_EVALUATIONS, REVIEW_RECORD_CHECKS, migrateReview } from "@/data/reviews"
import { computeInput, freezeFigure, reviewPeriod } from "@/lib/review-figures"
import { parseDisplayDate, todayIso } from "@/lib/periods"
import { SUPPORT_REPORTS } from "@/data/support"
import { applyTheme, DEFAULT_BRAND, type Appearance, type Brand } from "@/lib/theme"
import { RULES, type QmsRules } from "@/lib/rules"
import { CURRENT_ORG_ID, isOn, type ModuleMap } from "@/lib/modules"
import { DEFAULT_ROUTES, type RouteDefaults } from "@/lib/routes"

import type { QuestionnaireInvitation, AuditChecklist, QuestionnaireAssignment, AuditeeResponse, AuditorAssessment, EvidenceVerification, ClarificationRequest, AuditFinding, AuditReport } from "@/data/audit-types"
import { migrateAudits, scopeAuditRecords, applyAuditCommand, type AuditCommand } from "@/lib/audit-workflow"

const initial = {
  documents: DOCUMENTS,
  ncs: NONCONFORMITIES,
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
  auditFindings: [] as AuditFinding[],
  auditReports: [] as AuditReport[],
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
const protectedAuditCollections = new Set<Collection>(["auditChecklists", "questionnaireInvitations", "questionnaireAssignments", "auditeeResponses", "auditorAssessments", "evidenceVerifications", "clarificationRequests", "auditFindings", "auditReports"])

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
  const visible = {
    documents: new Set(state.documents.filter((d) => ok(d.process)).map((d) => d.id)),
    ncs: new Set(state.ncs.filter((n) => ok(n.process)).map((n) => n.id)),
    risks: new Set(state.risks.filter((r) => ok(r.process)).map((r) => r.id)),
    audits: new Set(state.audits.filter((a) => ok(a.process)).map((a) => a.id)),
    evidence: new Set(state.evidence.filter((e) => e.processes.length === 0 || e.processes.some(ok)).map((e) => e.id)),
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
    audits: state.audits.filter((a) => visible.audits.has(a.id)),
    auditChecklists: state.auditChecklists.filter((c) => visible.audits.has(c.auditId)),
    evidence: state.evidence.filter((e) => visible.evidence.has(e.id)),
    remarks: state.remarks.filter(remarkOk),
  }
}

function scopeState(state: State, person: Person, role: Role): State {
  return scopeAuditRecords(processScopeState(state, person, role), state, person, role)
}

interface StoreValue {
  /** what the signed-in person may see: already narrowed to their processes */
  state: State
  auditCommand: (command: AuditCommand) => void
  invitedPreview: (invitationId: string) => InvitedPreview | undefined
  saveInvitedPreview: (invitationId: string, responses: ResponseDraft[], submit: boolean) => void
  replyInvitedPreview: (invitationId: string, requestId: string, reply: string) => void
  /** every ID in a collection, including records this person can't see. IDs only, for numbering new records; the backend assigns numbers itself. */
  takenIds: (collection: Collection) => string[]
  add: <C extends Collection>(collection: C, item: ItemOf<C>) => void
  update: <C extends Collection>(collection: C, id: string, patch: Partial<ItemOf<C>>) => void
  remove: (collection: Collection, id: string) => void
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
  /** sections turned on for each client, by organisation id (Platform › Organisations) */
  modules: Record<string, ModuleMap>
  setModules: (orgId: string, map: ModuleMap) => void
  /** may the signed-in person see a record with this classification? Outside consultants only see confidential records they're named on. */
  canSee: (classification: string, viewers?: string[]) => boolean
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
  const dispatch = (action: Action) => { currentState.current = reducer(currentState.current, action); rawDispatch(action) }
  const lastSaved = React.useRef<string | null>(null)

  // save every change for other tabs, and pick up changes made in them
  React.useEffect(() => {
    let raw: string
    try {
      raw = JSON.stringify({ version: PREVIEW_VERSION, state })
    } catch {
      return
    }
    if (raw === lastSaved.current) return
    lastSaved.current = raw
    writePref(PREVIEW_STORE_KEY, raw)
  }, [state])
  React.useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key !== PREVIEW_STORE_KEY) return
      if (e.newValue === null) {
        lastSaved.current = null
        return dispatch({ type: "replace", state: sampleState })
      }
      if (e.newValue === lastSaved.current) return
      try {
        const parsed = JSON.parse(e.newValue) as { version?: number; state?: Partial<State> }
        if (parsed.version !== PREVIEW_VERSION || !parsed.state) return
        lastSaved.current = e.newValue
        dispatch({ type: "replace", state: migrate(parsed.state) })
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
  const [routeDefaults, setRouteDefaults] = React.useState<RouteDefaults>(DEFAULT_ROUTES)
  const [rules, setRulesRaw] = React.useState<QmsRules>(() => ({ ...RULES }))
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
    return {
      state: scopeState(state, user, role),
      invitedPreview: id => isOn(modules[CURRENT_ORG_ID], "Audits") ? invitedPreview(state, id) : undefined,
      saveInvitedPreview: (id, responses, submit) => { if (!isOn(modules[CURRENT_ORG_ID], "Audits")) throw Error("Audits is turned off for this workspace."); dispatch({ type: "replace", state: saveInvitedPreview(currentState.current, id, responses, submit) }) },
      replyInvitedPreview: (id, requestId, reply) => { if (!isOn(modules[CURRENT_ORG_ID], "Audits")) throw Error("Audits is turned off for this workspace."); dispatch({ type: "replace", state: replyInvitedPreview(currentState.current, id, requestId, reply) }) },
      auditCommand: (command) => { if (!isOn(modules[CURRENT_ORG_ID], "Audits")) throw Error("Audits is turned off for this workspace."); dispatch({ type: "replace", state: applyAuditCommand(currentState.current, user, role, command) }) },
      takenIds: (collection) => (state[collection] as { id: string }[]).map((x) => x.id),
      add: (collection, item) => { if (collection === "templates") guardTemplate(undefined, (item as State["templates"][number]).process); if (protectedAuditCollections.has(collection)) throw Error("Use the audit workflow action for this record."); dispatch({ type: "add", collection, item: item as { id: string } }) },
      update: (collection, id, patch) => { if (collection === "templates") guardTemplate(id, (patch as Partial<State["templates"][number]>).process); if (protectedAuditCollections.has(collection)) throw Error("Use the audit workflow action for this record."); dispatch({ type: "update", collection, id, patch: patch as object }) },
      remove: (collection, id) => { if (collection === "templates") guardTemplate(id); if (protectedAuditCollections.has(collection)) throw Error("Audit history cannot be deleted here."); dispatch({ type: "remove", collection, id }) },
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
      // consultants: Public and Internal; Confidential only when named; Highly confidential never
      canSee: (classification, viewers = []) => role.id !== "consultant" || classification === "Public" || classification === "Internal" || (classification === "Confidential" && viewers.includes(user.name)),
      routeDefaults,
      setRouteDefaults,
      notify: (to, n) => {
        for (const name of new Set(to)) {
          if (!name || name === user.name) continue
          dispatch({ type: "add", collection: "notifications", item: { ...n, id: `nt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, to: name, from: user.name, when: "Just now", age: 0, read: false } as AppNotification })
        }
      },
      resetSampleData: () => {
        try {
          window.localStorage.removeItem(PREVIEW_STORE_KEY)
        } catch {
          /* storage can be blocked */
        }
        lastSaved.current = null
        dispatch({ type: "replace", state: sampleState })
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
        setRulesRaw({ ...r })
      },
      appearance,
      setAppearance: (a) => {
        writePref("iqms.appearance", a)
        setAppearanceRaw(a)
      },
    }
  }, [state, userId, sidebarCollapsed, brand, appearance, rules, modules, routeDefaults])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
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
