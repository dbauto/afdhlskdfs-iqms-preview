import * as React from "react"

/**
 * The platform-wide AI support switch (ADR-039). Off stops AI support drafting replies for every organisation;
 * each organisation's own opt-in still applies when it's on. In the preview the choice is kept in this browser;
 * in production it's a platform setting changed by a platform admin and logged.
 */
const KEY = "iqms.aiSupport"
const listeners = new Set<() => void>()

function read() {
  try {
    return localStorage.getItem(KEY) !== "off"
  } catch {
    return true
  }
}

export function setAiSupportOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off")
  } catch {
    /* preview only */
  }
  listeners.forEach((l) => l())
}

export function useAiSupportOn() {
  const [on, setOn] = React.useState(read)
  React.useEffect(() => {
    const l = () => setOn(read())
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return on
}
