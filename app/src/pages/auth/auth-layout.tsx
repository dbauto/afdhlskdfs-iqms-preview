import * as React from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

const ROWS = [
  { title: "Work instruction, goods receipt", id: "OPS-WI-014", at: 1 },
  { title: "Internal audit, purchasing", id: "IA-2026-06", at: 2 },
  { title: "Supplier late deliveries", id: "NC-2026-005", at: 3 },
  { title: "On-time delivery objective", id: "OBJ-2026-03", at: 2 },
]
const PDCA = ["Plan", "Do", "Check", "Act"]

/**
 * The signed-out layout: form on the left, a quiet product panel on the right
 * built from the lifecycle track (based on the shadcn "login-02" block).
 * One sign-in page serves every client, so it shows the iQMS mark, not a company.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-card lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/sign-in" className="flex items-center gap-2.5 self-start">
          <span className="flex size-7 items-center justify-center rounded-sm bg-foreground text-xs font-bold text-background">iQ</span>
          <span className="text-sm font-semibold">iQMS</span>
        </Link>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-[360px] flex-col gap-6">{children}</div>
        </main>
        <div className="flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
          <span>iQMS for ISO 9001:2015</span>
          <span className="flex gap-4">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Help</a>
          </span>
        </div>
      </div>

      <aside aria-hidden="true" className="hidden flex-col justify-center bg-console p-12 text-white lg:flex">
        <div className="flex max-w-[520px] flex-col gap-8">
          <div className="flex flex-col gap-2.5">
            <p className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]">Every record moves through the same cycle.</p>
            <p className="text-[0.9375rem] leading-relaxed text-console-text">Documents, audits and corrective actions all follow plan, do, check, act, so everyone can see where things stand.</p>
          </div>
          <div className="rounded-xl border border-console-raised bg-[#222c39] px-5 py-2">
            {ROWS.map((r, i) => (
              <div key={r.id} className={cn("flex flex-col gap-2.5 py-4", i < ROWS.length - 1 && "border-b border-console-raised")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{r.title}</span>
                  <span className="text-xs text-console-text">{r.id}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {PDCA.map((s, k) => (
                    <div key={s} className="flex flex-col gap-1.5">
                      <span className={cn("h-1 rounded-full", k < r.at ? "bg-[#6f7fe0]" : k === r.at ? "bg-white" : "bg-[#3a4657]")} />
                      <span className={cn("text-[0.6875rem]", k === r.at ? "text-white" : "text-[#8a93a1]")}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

/** Cloudflare Turnstile placeholder. Replace with the real widget (@marsidev/react-turnstile or the script tag). */
export function HumanCheck({ value, onChange, error }: { value: "idle" | "busy" | "ok"; onChange: (v: "idle" | "busy" | "ok") => void; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div role="group" aria-label="Human check" className={cn("flex h-16 items-center gap-3 rounded-sm border bg-hover px-3.5", error ? "border-destructive" : "border-border")}>
        {value === "idle" && (
          <button
            type="button"
            role="checkbox"
            aria-checked="false"
            aria-label="Verify you are human"
            onClick={() => {
              onChange("busy")
              setTimeout(() => onChange("ok"), 1200)
            }}
            className="size-6 shrink-0 cursor-pointer rounded-[4px] border-2 border-faint bg-card"
          />
        )}
        {value === "busy" && <span aria-hidden="true" className="size-6 shrink-0 animate-spin rounded-full border-[3px] border-border border-t-primary" />}
        {value === "ok" && (
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-done text-background">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4 4L19 7" />
            </svg>
          </span>
        )}
        <span role="status" className="flex-1 text-sm">
          {value === "ok" ? "Success!" : value === "busy" ? "Verifying…" : "Verify you are human"}
        </span>
        <span className="flex flex-col items-end gap-0.5">
          <span className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground">Cloudflare</span>
          <span className="text-[0.625rem] text-muted-foreground">Privacy · Terms</span>
        </span>
      </div>
      {error && <span className="text-[0.8125rem] text-destructive">{error}</span>}
    </div>
  )
}

export function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 3h8.5v8.5H3zM12.5 3H21v8.5h-8.5zM3 12.5h8.5V21H3zM12.5 12.5H21V21h-8.5z" />
    </svg>
  )
}
