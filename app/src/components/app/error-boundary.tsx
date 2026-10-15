import * as React from "react"
import { rememberError } from "@/lib/diagnostics"

/**
 * Keeps one page error from blanking the whole app.
 *
 * Browser extensions (translators, grammar checkers, AI sidebars) sometimes change the page
 * behind React's back, which makes React throw while switching pages. The first time that
 * happens we simply redraw the app from scratch, which fixes it. If it keeps failing,
 * we show a message with a reload button instead of a white screen.
 */
interface State {
  error: Error | null
  attempt: number
  lastAt: number
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, attempt: 0, lastAt: 0 }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error("ThryveMS page error:", error)
    rememberError(error.message)
    const now = Date.now()
    const recent = now - this.state.lastAt < 2000
    if (!recent || this.state.attempt < 2) {
      // redraw from scratch with a fresh key
      setTimeout(() => this.setState((s) => ({ error: null, attempt: recent ? s.attempt + 1 : 1, lastAt: now })), 0)
    }
  }

  render() {
    const { error, attempt } = this.state
    if (error && attempt >= 2) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Public Sans, sans-serif" }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>This page didn’t load</p>
            <p style={{ fontSize: 14, color: "#4A5463", lineHeight: 1.5 }}>
              Reload to try again. If it keeps happening, turn off browser extensions that change pages, such as translators or grammar checkers.
            </p>
            <button type="button" onClick={() => window.location.reload()} style={{ height: 40, padding: "0 16px", borderRadius: 6, border: 0, background: "#2B3A9E", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              Reload page
            </button>
            <p style={{ fontSize: 14, marginTop: 12 }}>
              <a href={window.location.hash.startsWith("#/") ? "#/settings/support?from=error" : "/settings/support?from=error"} onClick={() => setTimeout(() => window.location.reload(), 0)} style={{ color: "#2B3A9E", fontWeight: 600 }}>
                Report this problem
              </a>
            </p>
            <p style={{ fontSize: 12, color: "#8A93A1", marginTop: 16 }}>{error.message}</p>
          </div>
        </div>
      )
    }
    if (error) return null
    return <React.Fragment key={attempt}>{this.props.children}</React.Fragment>
  }
}
