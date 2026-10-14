/**
 * In-memory store for the prototype. Every page reads and writes through here,
 * so adding, editing and deleting work while the app is open.
 *
 * When the backend exists, replace these functions with API calls
 * (for example with TanStack Query) and keep the same names in the pages.
 */
import * as React from "react"

import { CURRENT_USER_ID, ISSUES, PARTIES, PEOPLE, PROCESSES, ROLES } from "@/data/org"
import { AUDITORS, AUDITS, REMARKS, REQUIREMENTS, CHECKLIST_TEMPLATES, GLOSSARY, DOCUMENTS, EVIDENCE_ITEMS, NONCONFORMITIES, OBJECTIVES, POLICIES, RISKS } from "@/data/records"
import { ACCESS_LEVELS, type AccessLevel, type AppNotification, type Area } from "@/data/types"
import { NOTIFICATIONS } from "@/data/notifications"
import { applyTheme, DEFAULT_BRAND, type Appearance, type Brand } from "@/lib/theme"
import { RULES, type QmsRules } from "@/lib/rules"
import { CURRENT_ORG_ID, isOn, type ModuleMap } from "@/lib/modules"
import { DEFAULT_ROUTES, type RouteDefaults } from "@/lib/routes"

const initial = {
  documents: DOCUMENTS,
  ncs: NONCONFORMITIES,
  risks: RISKS,
  objectives: OBJECTIVES,
  policies: POLICIES,
  audits: AUDITS,
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
}

export type State = typeof initial
export type Collection = keyof State
type ItemOf<C extends Collection> = State[C][number]

type Action =
  | { type: "add"; collection: Collection; item: { id: string } }
  | { type: "update"; collection: Collection; id: string; patch: object }
  | { type: "remove"; collection: Collection; id: string }

function reducer(state: State, action: Action): State {
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

interface StoreValue {
  state: State
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
  const [state, dispatch] = React.useReducer(reducer, initial)
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
    return {
      state,
      add: (collection, item) => dispatch({ type: "add", collection, item: item as { id: string } }),
      update: (collection, id, patch) => dispatch({ type: "update", collection, id, patch: patch as object }),
      remove: (collection, id) => dispatch({ type: "remove", collection, id }),
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
      canSee: (classification, viewers = []) => role.id !== "consultant" || classification === "Public" || classification === "Internal" || viewers.includes(user.name),
      routeDefaults,
      setRouteDefaults,
      notify: (to, n) => {
        for (const name of new Set(to)) {
          if (!name || name === user.name) continue
          dispatch({ type: "add", collection: "notifications", item: { ...n, id: `nt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, to: name, from: user.name, when: "Just now", age: 0, read: false } as AppNotification })
        }
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
export function nextId(ids: string[], prefix: string, width = 3) {
  const nums = ids.filter((i) => i.startsWith(prefix)).map((i) => parseInt(i.slice(prefix.length), 10) || 0)
  return prefix + String(Math.max(0, ...nums) + 1).padStart(width, "0")
}
