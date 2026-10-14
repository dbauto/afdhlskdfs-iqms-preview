/**
 * Keeps the last few errors seen in this browser tab, so a support report can include them.
 * Nothing leaves the browser unless the person ticks "Include technical details" when reporting.
 * Only error messages and the page address are kept: no record contents, no form values.
 */
export const APP_VERSION = "0.9.0-preview"

export interface SeenError {
  at: string
  message: string
  page: string
}

const recent: SeenError[] = []

export function rememberError(message: string) {
  recent.unshift({ at: new Date().toISOString(), message: message.slice(0, 300), page: currentPage() })
  recent.length = Math.min(recent.length, 10)
}

export function recentErrors() {
  return [...recent]
}

export function currentPage() {
  // hash routes in the preview, normal paths in the real app
  return window.location.hash.startsWith("#/") ? window.location.hash.slice(1) : window.location.pathname
}

export function browserSummary() {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Other browser"
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Other"
  return `${browser} on ${os}, screen ${window.innerWidth}×${window.innerHeight} at ${Math.round(window.devicePixelRatio * 100)}% scale`
}

let started = false
export function watchErrors() {
  if (started) return
  started = true
  window.addEventListener("error", (e) => rememberError(e.message || "Script error"))
  window.addEventListener("unhandledrejection", (e) => rememberError(String((e.reason as Error)?.message ?? e.reason ?? "Unhandled promise rejection")))
}
