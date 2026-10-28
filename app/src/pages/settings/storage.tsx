import * as React from "react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { ORG } from "@/data/org"
import { cn } from "@/lib/utils"
import { PLAN_STORAGE_GB, fmtBytes, storageUsage, type StorageKind } from "@/lib/storage"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/app/data-table"
import { ContentLink as Link } from "@/components/app/content-link"
import { ViewChips } from "@/components/app/page"
import { SettingsHeader } from "./layout"

const KIND_COLOR: Record<StorageKind, string> = { Documents: "bg-primary", Evidence: "bg-done", "Exports, kept 24 hours": "bg-soon-bar", "Logos and profile photos": "bg-faint" }
const STATUS_TONE: Record<string, BadgeTone> = { Healthy: "done", "Nearly full": "soon", Full: "overdue" }

/** Settings › Storage (ADR-044): how much of the plan's file storage is used, by what, and the largest files. Admins only. */
export default function Storage() {
  const { state } = useStore()
  const u = storageUsage(state)
  const [view, setView] = React.useState<"all" | StorageKind>("all")
  const rows = u.largest.filter((f) => view === "all" || f.kind === view).slice(0, 10)
  const maxProcess = Math.max(...u.byProcess.map((p) => p.bytes), 1)
  return (
    <div className="flex flex-col gap-6">
      <SettingsHeader title="Storage" description="How much of your plan’s file storage is used, by what, and the largest files. Links to SharePoint and OneDrive take no space." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <span className="flex flex-col">
              <CardTitle>Storage used</CardTitle>
              <span className="text-[0.8125rem] text-muted-foreground">{ORG.plan} plan · {PLAN_STORAGE_GB[ORG.plan] ?? 25} GB for files uploaded to ThryveMS</span>
            </span>
            <Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-[2rem] font-semibold leading-none tabular-nums">{fmtBytes(u.used)}</span>
              <span className="text-sm text-muted-foreground">of {fmtBytes(u.limit)} · {u.pct}% used · {fmtBytes(Math.max(0, u.limit - u.used))} free</span>
            </p>
            <div className="relative">
              <div className="flex h-3 overflow-hidden rounded-full bg-secondary" role="img" aria-label={u.kinds.map((k) => `${k.kind} ${fmtBytes(k.bytes)}`).join(", ")}>
                {u.kinds.map((k) => <span key={k.kind} className={KIND_COLOR[k.kind]} style={{ width: `${(k.bytes / u.limit) * 100}%` }} title={`${k.kind}: ${fmtBytes(k.bytes)}`} />)}
              </div>
              <span className="absolute -top-1 h-5 border-l-2 border-dashed border-soon" style={{ left: "80%" }} aria-hidden="true" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>0</span><span className="mr-[14%]">Admins told at 80%</span><span>{fmtBytes(u.limit)}</span></div>
            <ul className="flex flex-col">
              {u.kinds.map((k) => (
                <li key={k.kind} className="grid grid-cols-[12px_minmax(0,1fr)_auto_5.5rem] items-center gap-3 border-t border-rule-soft py-2.5 text-sm">
                  <span className={cn("size-2.5 rounded-[3px]", KIND_COLOR[k.kind])} aria-hidden="true" />
                  <span>{k.kind}</span>
                  <span className="text-[0.8125rem] text-muted-foreground">{k.files.toLocaleString()} files</span>
                  <span className="text-right font-semibold tabular-nums">{fmtBytes(k.bytes)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>What the status means</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <ul className="flex flex-col">
              {[["Healthy", "Under 80%. Nothing to do."], ["Nearly full", "80% or more. Admins get a notification and an email."], ["Full", "100%. New uploads pause; links, records and downloads keep working."]].map(([s, d]) => (
                <li key={s} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 border-t border-rule-soft py-2.5 first:border-t-0">
                  <Badge tone={STATUS_TONE[s]} className="self-start">{s}</Badge>
                  <span className="text-muted-foreground">{d}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Not counted</span>
              <span className="text-muted-foreground">Links to SharePoint and OneDrive ({u.links.toLocaleString()} linked files). Confidential and highly confidential records are always links, never uploads.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => toast("Request sent to ThryveMS", { description: "We reply within one working day with the options for your plan." })}>Ask for more storage</Button>
              <Button size="sm" variant="outline" asChild><Link to="/settings/billing">Compare plans</Link></Button>
            </div>
            <span className="text-xs text-muted-foreground">Base: 5 GB · Business: 25 GB · Enterprise: 100 GB</span>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>By process</CardTitle><span className="text-[0.8125rem] text-muted-foreground">Documents and evidence</span></CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2.5">
            {u.byProcess.map((p) => (
              <li key={p.name} className="grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)_5.5rem] items-center gap-3 text-sm">
                <span className="truncate">{p.name}</span>
                <span className="h-2 rounded-full bg-secondary"><span className="block h-2 rounded-full bg-primary" style={{ width: `${(p.bytes / maxProcess) * 100}%` }} title={fmtBytes(p.bytes)} /></span>
                <span className="text-right font-semibold tabular-nums">{fmtBytes(p.bytes)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <DataTable
        label="Largest files"
        rows={rows}
        getRowId={(f) => `${f.name}-${f.on}`}
        minWidth={820}
        toolbar={
          <>
            <ViewChips
              value={view}
              onChange={(v) => setView(v as typeof view)}
              views={[{ id: "all", label: "All" }, { id: "Documents", label: "Documents" }, { id: "Evidence", label: "Evidence" }, { id: "Exports, kept 24 hours", label: "Exports" }]}
            />
            <span className="ml-auto text-[0.8125rem] text-muted-foreground">Removing a file from its record frees the space after 30 days in Deleted.</span>
          </>
        }
        columns={[
          { id: "n", header: "File", className: "min-w-[240px]", cell: (f) => (f.to ? <Link to={f.to} className="font-medium text-primary hover:underline">{f.name}</Link> : <span className="font-medium">{f.name}</span>) },
          { id: "k", header: "Kind", cell: (f) => <Badge tone="draft">{f.kind.startsWith("Exports") ? "Export" : f.kind === "Documents" ? "Document" : f.kind}</Badge> },
          { id: "p", header: "Process", cell: (f) => <span className="text-muted-foreground">{f.process || "No process"}</span> },
          { id: "b", header: "Uploaded by", cell: (f) => f.by },
          { id: "o", header: "When", cell: (f) => <span className="whitespace-nowrap text-muted-foreground">{f.on}</span> },
          { id: "s", header: <span className="block text-right">Size</span>, cell: (f) => <span className="block text-right font-semibold tabular-nums">{fmtBytes(f.size)}</span> },
        ]}
      />
    </div>
  )
}
