import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { LOGS, type LogLevel } from "@/data/admin"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/input"
import { PlatformHeader } from "./shell"

const TONE: Record<LogLevel, BadgeTone> = { Error: "overdue", Warning: "soon", Info: "draft" }

export default function Logs() {
  const [params] = useSearchParams()
  const [level, setLevel] = React.useState<"All" | LogLevel>("All")
  const [org, setOrg] = React.useState(params.get("org") ?? "")
  const [service, setService] = React.useState("")
  const rows = LOGS.filter((l) => (level === "All" || l.level === level) && (!org || l.org === org) && (!service || l.service === service))
  const [pick, setPick] = React.useState(LOGS[0].id)
  const sel = rows.find((l) => l.id === pick) ?? rows[0]
  const orgs = Array.from(new Set(LOGS.map((l) => l.org)))
  const services = Array.from(new Set(LOGS.map((l) => l.service)))
  const count = (lv: LogLevel | "All") => LOGS.filter((l) => lv === "All" || l.level === lv).length

  return (
    <>
      <PlatformHeader title="Logs" description="What iQMS did behind the scenes, for quick troubleshooting. Logs keep record IDs only, never document descriptions or content." />

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Level" className="inline-flex gap-0.5 rounded-sm bg-secondary p-[3px]">
          {(["All", "Error", "Warning", "Info"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={cn("inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[4px] px-3 text-[0.8125rem] font-medium", level === l && "bg-card shadow-[0_0_0_1px_var(--border)]")}>
              {l === "All" ? "All" : l === "Info" ? "Info" : `${l}s`}
              <span className="text-xs text-muted-foreground">{count(l)}</span>
            </button>
          ))}
        </div>
        <NativeSelect aria-label="Organisation" value={org} onChange={(e) => setOrg(e.target.value)} className="h-9 w-auto min-w-48 text-[0.8125rem]">
          <option value="">All organisations</option>
          {orgs.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Service" value={service} onChange={(e) => setService(e.target.value)} className="h-9 w-auto min-w-40 font-mono text-[0.8125rem]">
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Time range" defaultValue="24h" className="h-9 w-auto min-w-36 text-[0.8125rem]">
          <option value="1h">Last hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </NativeSelect>
        <Button variant="outline" size="sm" className="ml-auto h-9" onClick={() => toast("Logs exported")}>
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[640px] border-collapse text-[0.8125rem]">
              <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:bg-card">
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="w-24 px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_var(--border)]">Time</th>
                  <th scope="col" className="w-24 px-2 py-3 text-left font-medium shadow-[inset_0_-1px_0_var(--border)]">Level</th>
                  <th scope="col" className="px-2 py-3 text-left font-medium shadow-[inset_0_-1px_0_var(--border)]">Event</th>
                  <th scope="col" className="w-40 px-4 py-3 text-left font-medium shadow-[inset_0_-1px_0_var(--border)]">Organisation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const on = sel?.id === l.id
                  return (
                    <tr key={l.id} tabIndex={0} aria-selected={on} onClick={() => setPick(l.id)} onKeyDown={(e) => e.key === "Enter" && setPick(l.id)} className={cn("cursor-pointer border-t border-rule-soft", on ? "bg-accent shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-[#f8f9fa]")}>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{l.time}</td>
                      <td className="px-2 py-2.5">
                        <Badge tone={TONE[l.level]}>{l.level}</Badge>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="flex flex-col gap-0.5">
                          <span className="font-medium">{l.message}</span>
                          <span className="font-mono text-[0.6875rem] text-muted-foreground">{l.service}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.org}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between border-t px-4 py-2.5 text-[0.8125rem] text-muted-foreground">
            <span>{rows.length} events in the last 24 hours</span>
            <span>Newest first, live</span>
          </div>
        </Card>

        {sel && (
          <Card className="xl:sticky xl:top-6" aria-label="Log detail">
            <div className="flex flex-col gap-2.5 border-b border-rule-soft px-5 py-4">
              <Badge tone={TONE[sel.level]} className="self-start">
                {sel.level}
              </Badge>
              <h2 className="text-base font-semibold leading-snug">{sel.message}</h2>
              <p className="text-[0.8125rem] leading-normal text-muted-foreground">{sel.hint}</p>
            </div>
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-rule-soft px-5 py-4 text-[0.8125rem]">
              {[["Time", `14 Oct 2026, ${sel.time} UTC+8`], ["Service", sel.service, true], ["Organisation", sel.org], ...sel.facts].map(([k, v, mono]) => (
                <React.Fragment key={k as string}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className={cn("break-all", mono && "font-mono")}>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            {sel.trace && (
              <div className="flex flex-col gap-2 border-b border-rule-soft px-5 py-4">
                <span className="text-xs text-muted-foreground">Error detail</span>
                <pre className="whitespace-pre-wrap break-all rounded-sm bg-background p-3 font-mono text-[0.71875rem] leading-relaxed">{sel.trace}</pre>
              </div>
            )}
            <div className="flex flex-wrap gap-2 px-5 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const id = sel.facts.find(([k]) => k === "Request ID")?.[1] ?? ""
                  navigator.clipboard?.writeText(id).catch(() => {})
                  toast(`Copied ${id}`)
                }}
              >
                Copy request ID
              </Button>
              {sel.retry && (
                <Button variant="outline" size="sm" onClick={() => toast("Job queued to retry")}>
                  Retry job
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => toast(`Support access requested from ${sel.org}`)}>
                Ask for support access
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
