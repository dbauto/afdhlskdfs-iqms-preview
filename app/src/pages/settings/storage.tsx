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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DownloadIcon, EllipsisIcon, Trash2Icon } from "lucide-react"
import { formatDate } from "@/lib/periods"

function ConfirmDialog({ open, title, body, confirm, onOpenChange, onConfirm }: { open: boolean; title: string; body: string; confirm: string; onOpenChange: (v: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
import { SettingsHeader } from "./layout"

const KIND_COLOR: Record<StorageKind, string> = { Documents: "bg-primary", Evidence: "bg-done", "Exports, kept 24 hours": "bg-soon-bar", "Logos and profile photos": "bg-faint" }
const STATUS_TONE: Record<string, BadgeTone> = { Healthy: "done", "Nearly full": "soon", Full: "overdue" }

/** Settings › Storage (ADR-044): how much of the plan's file storage is used, by what, and the largest files. Admins only. */
export default function Storage() {
  const { state, allowed, deleteFile, restoreDeleted, remove } = useStore()
  const u = storageUsage(state)
  const [view, setView] = React.useState<"all" | StorageKind | "deleted">("all")
  const [deleting, setDeleting] = React.useState<(typeof u.largest)[number]>()
  const [purging, setPurging] = React.useState<(typeof state.deleted)[number]>()
  const rows = u.largest.filter((f) => view === "all" || f.kind === view).slice(0, 10)
  const canDelete = allowed("docs.delete")
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
      {view !== "deleted" && (
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
              views={[{ id: "all", label: "All" }, { id: "Documents", label: "Documents" }, { id: "Evidence", label: "Evidence" }, { id: "Exports, kept 24 hours", label: "Exports" }, { id: "deleted", label: "Deleted", count: state.deleted.length }]}
            />
            <span className="ml-auto text-[0.8125rem] text-muted-foreground">Deleted files free their space after 30 days.</span>
          </>
        }
        columns={[
          { id: "n", header: "File", className: "min-w-[240px]", cell: (f) => (f.to ? <Link to={f.to} className="font-medium text-primary hover:underline">{f.name}</Link> : <span className="font-medium">{f.name}</span>) },
          { id: "k", header: "Kind", cell: (f) => <Badge tone="draft">{f.kind.startsWith("Exports") ? "Export" : f.kind === "Documents" ? "Document" : f.kind}</Badge> },
          { id: "p", header: "Process", cell: (f) => <span className="text-muted-foreground">{f.process || "No process"}</span> },
          { id: "b", header: "Uploaded by", cell: (f) => f.by },
          { id: "o", header: "When", cell: (f) => <span className="whitespace-nowrap text-muted-foreground">{f.on}</span> },
          { id: "s", header: <span className="block text-right">Size</span>, cell: (f) => <span className="block text-right font-semibold tabular-nums">{fmtBytes(f.size)}</span> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-12",
            cell: (f) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`More actions for ${f.name}`}><EllipsisIcon /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {f.to && <DropdownMenuItem asChild><Link to={f.to}>Open record</Link></DropdownMenuItem>}
                  <DropdownMenuItem onSelect={() => toast(`Downloading ${f.name}`, { description: "In production the file comes from storage through a short-lived link." })}><DownloadIcon /> Download</DropdownMenuItem>
                  {canDelete && !f.kind.startsWith("Exports") && <DropdownMenuItem className="text-destructive" onSelect={() => setDeleting(f)}><Trash2Icon /> Delete</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />
      )}
      {view === "deleted" && (
        <DataTable
          label="Deleted"
          rows={state.deleted}
          getRowId={(d) => d.id}
          minWidth={860}
          empty={{ title: "Nothing deleted", body: "Deleted records and files stay here for 30 days, so you can put them back." }}
          toolbar={
            <>
              <ViewChips value={view} onChange={(v) => setView(v as typeof view)} views={[{ id: "all", label: "All" }, { id: "Documents", label: "Documents" }, { id: "Evidence", label: "Evidence" }, { id: "Exports, kept 24 hours", label: "Exports" }, { id: "deleted", label: "Deleted", count: state.deleted.length }]} />
              <span className="ml-auto text-[0.8125rem] text-muted-foreground">Kept 30 days, then removed for good and the space is freed.</span>
            </>
          }
          columns={[
            { id: "n", header: "Item", className: "min-w-[220px]", cell: (d) => <span className="font-medium">{d.label}</span> },
            { id: "w", header: "Was in", cell: (d) => <span className="text-muted-foreground">{d.wasIn}</span> },
            { id: "b", header: "Deleted by", cell: (d) => d.by },
            { id: "p", header: "Removed for good", cell: (d) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(d.purgeOn)}</span> },
            { id: "s", header: <span className="block text-right">Size</span>, cell: (d) => <span className="block text-right font-semibold tabular-nums">{d.size ? fmtBytes(d.size) : "No file"}</span> },
            {
              id: "x",
              header: <span className="sr-only">Actions</span>,
              cell: (d) => (
                <span className="flex justify-end gap-2">
                  {allowed("docs.restore") && <Button size="sm" variant="outline" onClick={() => { restoreDeleted(d.id); toast(`${d.label} restored`, { description: `Back in ${d.wasIn}.` }) }}>Restore</Button>}
                  {allowed("docs.purge") && <Button size="sm" variant="destructive" onClick={() => setPurging(d)}>Delete for good</Button>}
                </span>
              ),
            },
          ]}
        />
      )}
      <p className="text-[0.8125rem] text-muted-foreground">Workspace backups: the whole workspace can be restored to any point in the last 30 days, with nightly encrypted copies kept 35 days. ThryveMS does this on request; it isn’t a way to undo one change.</p>
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name}?`}
        body="It goes to Deleted for 30 days, where it can be restored. Its space is freed when it’s removed for good."
        confirm="Delete"
        onOpenChange={(o) => !o && setDeleting(undefined)}
        onConfirm={() => {
          const f = deleting!
          deleteFile({ label: f.name, wasIn: f.process ? `${f.kind} · ${f.process}` : f.kind, size: f.size, key: f.key ?? f.name, parentCollection: f.parent?.collection, parentId: f.parent?.id, removePatch: f.parent?.removePatch, restorePatch: f.parent?.restorePatch })
          toast(`${f.name} moved to Deleted`, { description: "Restore it from Storage › Deleted within 30 days." })
          setDeleting(undefined)
        }}
      />
      <ConfirmDialog
        open={!!purging}
        title={`Delete ${purging?.label} for good?`}
        body="It can’t be restored after this, except from a workspace backup."
        confirm="Delete for good"
        onOpenChange={(o) => !o && setPurging(undefined)}
        onConfirm={() => {
          remove("deleted", purging!.id)
          toast(`${purging!.label} deleted for good`)
          setPurging(undefined)
        }}
      />
    </div>
  )
}
