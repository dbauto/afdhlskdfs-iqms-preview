/**
 * The Overview is not real time (Danica, 1 Nov 2026; backend COV-21). Its figures come from the last
 * analysis the signed-in person ran with "Analyze latest data". Later changes to records do not move
 * the Overview until it is analyzed again. Each person (and role) has their own analysis, worked out
 * with their own access; a change of role hides the old one, like the server's authorization epoch.
 *
 * In production the analysis runs on the server and is saved per person. The preview keeps it in
 * memory only (never in browser storage). The sample workspace starts with one analysis already made,
 * taken when the preview opens, so the page is not empty.
 */
import * as React from "react"
import type { State } from "@/lib/store"

export interface OverviewAnalysis {
  state: State
  /** when the data was read */
  at: Date
}

type Listener = () => void
const saved = new Map<string, OverviewAnalysis>()
const running = new Set<string>()
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: Listener) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
let version = 0
const getVersion = () => version
const changed = () => {
  version++
  emit()
}

/** how long the preview shows "Analyzing…" before the result appears */
export const ANALYZE_MS = 600

export function useOverviewAnalysis(live: State, key: string) {
  React.useSyncExternalStore(subscribe, getVersion, getVersion)
  // the sample workspace already has an analysis; a real new workspace starts empty on the server
  if (!saved.has(key)) saved.set(key, { state: live, at: new Date() })
  const analysis = saved.get(key)!
  const isRunning = running.has(key)
  const liveRef = React.useRef(live)
  liveRef.current = live
  const analyze = React.useCallback(() => {
    if (running.has(key)) return
    running.add(key)
    changed()
    window.setTimeout(() => {
      saved.set(key, { state: liveRef.current, at: new Date() })
      running.delete(key)
      changed()
    }, ANALYZE_MS)
  }, [key])
  return { analysis, running: isRunning, analyze }
}

export function analyzedText(at: Date) {
  const day = at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  const time = at.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  return `Last analyzed ${day}, ${time}`
}

/** the analyzed records, for parts of the Overview that would otherwise read the live store */
export const AnalyzedState = React.createContext<State | undefined>(undefined)
export const useAnalyzedState = () => React.useContext(AnalyzedState)
