/**
 * In-memory store for the prototype. Every page reads and writes through here,
 * so adding, editing and deleting work while the app is open.
 *
 * When the backend exists, replace these functions with API calls
 * (for example with TanStack Query) and keep the same names in the pages.
 */
import * as React from "react"

import { CURRENT_USER_ID, ISSUES, PARTIES, PEOPLE, PROCESSES, ROLES } from "@/data/org"
import { AUDITS, CHECKLIST_TEMPLATES, GLOSSARY, DOCUMENTS, EVIDENCE_ITEMS, NONCONFORMITIES, OBJECTIVES, POLICIES, RISKS } from "@/data/records"
import { ACCESS_LEVELS, type AccessLevel, type Area } from "@/data/types"

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
  const [userId, setUserIdRaw] = React.useState(() => readPref("iqms.user") ?? CURRENT_USER_ID)
  const [sidebarCollapsed, setCollapsedRaw] = React.useState(() => readPref("iqms.sidebar") === "collapsed")

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
        writePref("iqms.user", id)
        setUserIdRaw(id)
      },
      user,
      role,
      can: (area, level = "View") => ACCESS_LEVELS.indexOf(role.access[area] ?? "None") >= ACCESS_LEVELS.indexOf(level),
      sidebarCollapsed,
      setSidebarCollapsed: (v) => {
        writePref("iqms.sidebar", v ? "collapsed" : "open")
        setCollapsedRaw(v)
      },
    }
  }, [state, userId, sidebarCollapsed])

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
