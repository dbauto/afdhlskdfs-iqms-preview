/**
 * Supporting records: the records behind a figure, each opening its own page in a new tab, with a
 * review status someone sets on purpose. Generic, so audits and corrective actions can use it too.
 * Statuses are workflow controls, not ISO conformity decisions. Opening a record never changes
 * its status.
 */
import * as React from "react"
import { CircleAlertIcon, FileQuestionIcon, LinkIcon, PlusIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/periods"
import { isSafeUrl, RECORD_KIND_LABEL, type RecordKind } from "@/lib/record-links"
import { RECORD_CHECK_STATUSES, type RecordCheckStatus } from "@/data/types"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { OutsideLink, RecordLink } from "@/components/app/record-link"

export interface SupportingRow {
  /** stable key: "nonconformity:NC-2026-007", or the check id for a reference added by hand */
  key: string
  kind: RecordKind | "link"
  id?: string
  url?: string
  title: string
  module: string
  date?: string
  dateLabel?: string
  status?: string
  tone?: BadgeTone
  description?: string
  evidenceType?: string
  attention?: boolean
  /** false when the record was deleted or the person can't see it: shown as "Not available" with its ID */
  available: boolean
  /** "auto" when ThryveMS found it, otherwise who added the reference */
  addedBy: string
  check?: { status: RecordCheckStatus; by?: string; at?: string; notes?: string; evidenceRef?: string }
}

export interface NewReference {
  kind: RecordKind | "link"
  recordId?: string
  url?: string
  title: string
}

const CHECK_TONE: Record<RecordCheckStatus, BadgeTone> = { "Not reviewed": "draft", Reviewed: "done", "Needs clarification": "soon", "Insufficient evidence": "overdue" }

const when = (iso?: string) => (iso ? formatDate(iso.slice(0, 10)) : "")

function CheckControl({ row, onCheck, who }: { row: SupportingRow; onCheck: (row: SupportingRow, patch: { status: RecordCheckStatus; notes?: string; evidenceRef?: string }) => void; who: (name: string) => string }) {
  const [noting, setNoting] = React.useState(false)
  const [notes, setNotes] = React.useState(row.check?.notes ?? "")
  const [ev, setEv] = React.useState(row.check?.evidenceRef ?? "")
  const status = row.check?.status ?? "Not reviewed"
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label={`Review status of ${row.id ?? row.title}`} value={status} onChange={(e) => onCheck(row, { status: e.target.value as RecordCheckStatus, notes: row.check?.notes, evidenceRef: row.check?.evidenceRef })} className="h-8 w-auto min-w-[11rem] text-[0.8125rem]">
          {RECORD_CHECK_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        <button type="button" onClick={() => setNoting(!noting)} className="cursor-pointer text-xs font-medium text-primary hover:underline" aria-expanded={noting}>
          {row.check?.notes ? "Edit note" : "Add note"}
        </button>
      </div>
      {noting && (
        <div className="flex flex-col gap-2 rounded-sm border bg-background p-2.5">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you checked, or what’s missing" aria-label={`Note on ${row.id ?? row.title}`} className="h-8 text-[0.8125rem]" />
          <Input value={ev} onChange={(e) => setEv(e.target.value)} placeholder="Evidence reference, for example EV-0208" aria-label={`Evidence reference for ${row.id ?? row.title}`} className="h-8 text-[0.8125rem]" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onCheck(row, { status, notes: notes.trim() || undefined, evidenceRef: ev.trim() || undefined }); setNoting(false) }}>
              Save note
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNoting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {row.check?.by && (
        <span className="text-xs text-muted-foreground">
          {status} by {who(row.check.by)}
          {row.check.at ? `, ${when(row.check.at)}` : ""}
        </span>
      )}
    </div>
  )
}

function Row({ row, canCheck, onCheck, onRemove, who }: { row: SupportingRow; canCheck: boolean; onCheck: (row: SupportingRow, patch: { status: RecordCheckStatus; notes?: string; evidenceRef?: string }) => void; onRemove?: (row: SupportingRow) => void; who: (name: string) => string }) {
  const status = row.check?.status ?? "Not reviewed"
  return (
    <li className="grid grid-cols-1 gap-3 border-b border-rule-soft px-4 py-3.5 last:border-b-0 @[44rem]:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {!row.available ? (
            <span className="text-[0.8125rem] font-medium text-muted-foreground">{row.id}</span>
          ) : row.kind === "link" ? (
            <OutsideLink url={row.url} label={row.title} className="text-[0.8125rem]" />
          ) : (
            <RecordLink kind={row.kind} id={row.id!} label={row.title} className="text-[0.8125rem]" />
          )}
          <span className="text-xs text-muted-foreground">{row.module}</span>
          {row.available && row.status && <Badge tone={row.tone ?? "draft"}>{row.status}</Badge>}
          {row.attention && row.available && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-overdue">
              <CircleAlertIcon className="size-3" /> Needs attention
            </span>
          )}
        </div>
        {row.available ? (
          <>
            <span className="text-sm font-medium">{row.title}</span>
            {row.description && <span className="text-[0.8125rem] leading-snug text-muted-foreground">{row.description}</span>}
            <span className="text-xs text-muted-foreground">
              {[row.date ? `${row.dateLabel ?? "Date"} ${formatDate(row.date)}` : "", row.evidenceType, row.addedBy !== "auto" ? `Added by ${who(row.addedBy)}` : "Found by ThryveMS"].filter(Boolean).join(". ")}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Not available. The record was deleted, or you don’t have access to it.</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {canCheck ? (
          <CheckControl key={`${row.key}-${status}`} row={row} onCheck={onCheck} who={who} />
        ) : (
          <span className="flex flex-col gap-1">
            <Badge tone={CHECK_TONE[status]} className="self-start">
              {status}
            </Badge>
            {row.check?.by && <span className="text-xs text-muted-foreground">By {who(row.check.by)}{row.check.at ? `, ${when(row.check.at)}` : ""}</span>}
          </span>
        )}
        {row.check?.notes && <span className="text-xs leading-snug">Note: {row.check.notes}</span>}
        {row.check?.evidenceRef && <span className="text-xs text-muted-foreground">Evidence {row.check.evidenceRef}</span>}
        {onRemove && row.addedBy !== "auto" && canCheck && (
          <button type="button" onClick={() => onRemove(row)} className="flex cursor-pointer items-center gap-1 self-start text-xs text-muted-foreground hover:text-overdue">
            <XIcon className="size-3" /> Remove reference
          </button>
        )}
      </div>
    </li>
  )
}

const REF_KINDS: RecordKind[] = ["document", "evidence", "objective", "risk", "nonconformity", "audit", "review", "review-action"]

function AddReference({ onAdd, resolve, onClose }: { onAdd: (r: NewReference) => void; resolve: (kind: RecordKind, id: string) => string | undefined; onClose: () => void }) {
  const [mode, setMode] = React.useState<"link" | "record">("link")
  const [url, setUrl] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [kind, setKind] = React.useState<RecordKind>("document")
  const [id, setId] = React.useState("")
  const [error, setError] = React.useState("")
  function add() {
    if (mode === "link") {
      if (!isSafeUrl(url)) return setError("Paste a full https:// link, for example from SharePoint’s Copy link.")
      if (!title.trim()) return setError("Give the reference a short title.")
      onAdd({ kind: "link", url: url.trim(), title: title.trim() })
    } else {
      const found = resolve(kind, id.trim())
      if (!found) return setError(`No ${RECORD_KIND_LABEL[kind].toLowerCase()} ${id.trim() || "with that ID"} that you can see.`)
      onAdd({ kind, recordId: id.trim(), title: found })
    }
    onClose()
  }
  return (
    <div className="flex flex-col gap-3 border-t bg-background px-4 py-4">
      <div role="radiogroup" aria-label="Reference type" className="flex flex-wrap gap-2">
        {(
          [
            ["link", "SharePoint, OneDrive or other link"],
            ["record", "Record in ThryveMS"],
          ] as const
        ).map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); setError("") }} className={cn("inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-[0.8125rem]", mode === m ? "border-primary bg-highlight font-medium text-primary" : "border-input bg-card")}>
            {label}
          </button>
        ))}
      </div>
      {mode === "link" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link" htmlFor="ref-url">
            <Input id="ref-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourcompany.sharepoint.com/…" />
          </Field>
          <Field label="Title" htmlFor="ref-title">
            <Input id="ref-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Customer survey results, Q3" />
          </Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <Field label="Kind" htmlFor="ref-kind">
            <NativeSelect id="ref-kind" value={kind} onChange={(e) => setKind(e.target.value as RecordKind)}>
              {REF_KINDS.map((k) => (
                <option key={k} value={k}>
                  {RECORD_KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="ID" htmlFor="ref-id">
            <Input id="ref-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="EV-0208" />
          </Field>
        </div>
      )}
      {error && <p className="text-[0.8125rem] text-overdue">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={add}>
          Add reference
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

type Filter = "all" | "attention" | "unchecked"

export function SupportingRecords({
  rows,
  missing = [],
  canCheck,
  canAddReference,
  onCheck,
  onAddReference,
  onRemoveReference,
  resolve,
  who = (n) => n,
  emptyText = "No records were found for this input in the reporting period.",
}: {
  rows: SupportingRow[]
  /** sources ThryveMS has no module for: each is shown as "no source" */
  missing?: string[]
  canCheck: boolean
  canAddReference: boolean
  onCheck: (row: SupportingRow, patch: { status: RecordCheckStatus; notes?: string; evidenceRef?: string }) => void
  onAddReference?: (r: NewReference) => void
  onRemoveReference?: (row: SupportingRow) => void
  /** title of a record the person can see, to check a reference to it */
  resolve: (kind: RecordKind, id: string) => string | undefined
  /** shows a name as the viewer should see it, such as "Your consultant" */
  who?: (name: string) => string
  emptyText?: string
}) {
  const [filter, setFilter] = React.useState<Filter>("all")
  const [adding, setAdding] = React.useState(false)
  const attention = rows.filter((r) => r.attention && r.available)
  const unchecked = rows.filter((r) => (r.check?.status ?? "Not reviewed") === "Not reviewed")
  const reviewed = rows.filter((r) => r.check?.status === "Reviewed").length
  const shown = (filter === "attention" ? attention : filter === "unchecked" ? unchecked : rows).slice().sort((a, b) => Number(!!b.attention) - Number(!!a.attention))

  return (
    <div className="@container flex flex-col">
      {missing.map((m) => (
        <div key={m} className="flex items-start gap-2.5 border-b border-rule-soft bg-background px-4 py-3 text-[0.8125rem] leading-snug">
          <FileQuestionIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            <b className="font-semibold">No source in ThryveMS.</b> {m}
          </span>
        </div>
      ))}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule-soft px-4 py-2.5">
          <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", `All ${rows.length}`],
                ["attention", `Needs attention ${attention.length}`],
                ["unchecked", `Not reviewed ${unchecked.length}`],
              ] as const
            ).map(([f, label]) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-xs font-medium", filter === f ? "border-foreground bg-foreground text-background" : "border-input bg-card hover:bg-background")}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {reviewed} of {rows.length} reviewed
          </span>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : shown.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul aria-label="Supporting records" className="max-h-[36rem] overflow-y-auto overscroll-contain">
          {shown.map((r) => (
            <Row key={r.key} row={r} canCheck={canCheck} onCheck={onCheck} onRemove={onRemoveReference} who={who} />
          ))}
        </ul>
      )}
      {canAddReference && onAddReference && !adding && (
        <div className="border-t px-4 py-3">
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <PlusIcon /> Add reference
          </Button>
          <span className="ml-3 text-xs text-muted-foreground">
            <LinkIcon className="mr-1 inline size-3" />
            Links only: files stay in SharePoint or OneDrive.
          </span>
        </div>
      )}
      {adding && onAddReference && <AddReference onAdd={onAddReference} resolve={resolve} onClose={() => setAdding(false)} />}
    </div>
  )
}
