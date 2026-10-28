import * as React from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { ProductMark } from "@/components/app/product-mark"

const NAV = ["Overview", "Documents", "Processes", "Audits", "Evidence", "Objectives", "Settings"]
const TILES = [["Documents in review", "06"], ["Open audit actions", "04"], ["Evidence linked", "28"]]
const ATTENTION = [["Document review", "Due soon"], ["Corrective action", "In progress"], ["Audit evidence", "Pending"]]

/** The product picture from the ThryveMS website: an illustrative Overview with synthetic figures (ADR-044). */
function ProductPreview() {
  return (
    <div className="relative w-full max-w-[560px] -rotate-[2.5deg] overflow-hidden rounded-[18px] border border-[#dfe3df] bg-[#f7f8f6] text-[#0a2a22] shadow-[0_40px_80px_-30px_rgba(10,42,34,0.45)]">
      <div className="flex h-8 items-center border-b border-[#e6e9e7] px-3.5 text-[0.6875rem] text-[#4a5463]">
        <span className="tracking-[2px]">•••</span>
        <span className="mx-auto">ThryveMS / Overview</span>
        <span>···</span>
      </div>
      <div className="flex">
        <div className="flex w-[122px] shrink-0 flex-col gap-1 bg-[#0f4a3c] px-2 py-3.5">
          <span className="px-1.5 pb-3 text-[0.8125rem] font-bold text-white">ThryveMS</span>
          {NAV.map((n, i) => <span key={n} className={cn("flex h-[30px] items-center rounded-md px-2.5 text-xs font-semibold text-[#e7f1ec]", i === 0 && "bg-white/10")}>{n}</span>)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3.5">
          <span className="text-[0.5625rem] font-semibold tracking-[0.1em] text-[#4a5463]">QUALITY MANAGEMENT / OVERVIEW</span>
          <span className="flex items-baseline justify-between"><span className="text-[0.9375rem] font-bold">ISO 9001 readiness</span><span className="text-[0.625rem] text-[#4a5463]">Sample organization</span></span>
          <div className="flex gap-4 rounded-xl border border-[#e6e9e7] bg-white p-3">
            <div className="flex flex-1 flex-col">
              <span className="text-[0.6875rem] text-[#4a5463]">Certification readiness</span>
              <span className="text-[2.6rem] font-extrabold leading-tight">82<span className="align-top text-lg">%</span></span>
              <span className="self-start rounded bg-[#fbf1e1] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[#8f5200]">Needs attention</span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 text-[0.625rem] text-[#4a5463]">
              Requirements status
              <span className="flex gap-1"><span className="h-1.5 flex-[6] rounded-full bg-[#3e8a63]" /><span className="h-1.5 flex-[2] rounded-full bg-[#e0b04a]" /><span className="h-1.5 flex-1 rounded-full bg-[#d4705e]" /></span>
              Readiness by clause
              <span className="h-1 rounded-full bg-[linear-gradient(90deg,#6aa985_80%,#e6e9e7_80%)]" />
              <span className="h-1 rounded-full bg-[linear-gradient(90deg,#6aa985_55%,#e6e9e7_55%)]" />
            </div>
          </div>
          <div className="flex gap-2">
            {TILES.map(([l, v]) => <div key={l} className="flex-1 rounded-xl border border-[#e6e9e7] bg-white px-3 py-2.5"><span className="block text-[0.625rem] text-[#4a5463]">{l}</span><span className="mt-1 block text-2xl font-bold">{v}</span></div>)}
          </div>
          <div className="rounded-xl border border-[#e6e9e7] bg-white px-3 py-2">
            <span className="flex justify-between text-[0.6875rem]"><span className="font-bold">Attention required</span><span className="text-[#4a5463]">3 items</span></span>
            {ATTENTION.map(([a, b]) => <span key={a} className="flex justify-between border-t border-[#eef0ee] py-1.5 text-[0.625rem] text-[#4a5463] first-of-type:mt-1"><span>{a}</span><span className="font-semibold text-[#8f5200]">{b}</span></span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The signed-out layout: form on the left, a quiet product panel on the right
 * built from the lifecycle track (based on the shadcn "login-02" block).
 * One sign-in page serves every client, so it shows the ThryveMS mark, not a company.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-card lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/sign-in" className="flex items-center gap-2.5 self-start">
          <ProductMark />
        </Link>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-[360px] flex-col gap-6">{children}</div>
        </main>
        <div className="flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
          <span>ThryveMS for ISO 9001:2026</span>
          <span className="flex gap-4">
            <Link to="/legal/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/legal/security" className="hover:text-foreground">Security</Link>
            <a href="#" className="hover:text-foreground">Help</a>
          </span>
        </div>
      </div>

      <aside aria-hidden="true" className="relative hidden flex-col items-center justify-center gap-10 overflow-hidden bg-[radial-gradient(120%_90%_at_80%_10%,#e3efe8_0%,#f3f6f3_55%,#eef2ee_100%)] p-12 lg:flex dark:bg-[radial-gradient(120%_90%_at_80%_10%,#10261f_0%,#0c1a16_60%,#0a1512_100%)]">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cfdcd4_1px,transparent_1px)] bg-[length:20px_20px] opacity-50 dark:opacity-10" />
        <ProductPreview />
        <div className="relative flex max-w-[460px] flex-col items-center gap-2 text-center">
          <p className="text-[1.375rem] font-semibold tracking-[-0.01em] text-[#0a2a22] dark:text-[#e3efe8]">Quality, made workable.</p>
          <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">See where you stand for ISO 9001 at a glance: readiness, documents, audits and evidence in one place.</p>
          <p className="text-xs text-faint">Illustrative interface · synthetic example data</p>
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
