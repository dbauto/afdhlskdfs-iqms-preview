/**
 * Evidence linked to a record (a document, a nonconformity). Evidence lives once in the
 * Evidence register and is reused: the same item can back several documents and records.
 * An item can be a single file or link, or a pack of several kept together.
 */
import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronDownIcon, ExternalLinkIcon, FileTextIcon, LinkIcon, PaperclipIcon, PlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { EvidenceItem } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EvidencePicker, Field } from "@/components/app/form"
import { EvidenceSheet } from "@/pages/evidence/evidence-sheet"

export const fileCount = (e: EvidenceItem) => e.files?.length ?? 1
export const fileSummary = (e: EvidenceItem) => {
  const n = fileCount(e)
  if (n === 1) return e.files?.[0]?.kind === "Link" || e.kind === "Link" ? "1 link" : "1 file"
  const links = e.files!.filter((f) => f.kind === "Link").length
  const files = n - links
  return links === 0 ? `${n} files` : links === n ? `${n} links` : `${files} file${files > 1 ? "s" : ""}, ${links} link${links > 1 ? "s" : ""}`
}

function EvidenceRow({ e, recordId, canEdit, onUnlink }: { e: EvidenceItem; recordId: string; canEdit: boolean; onUnlink: () => void }) {
  const [open, setOpen] = React.useState(false)
  const others = (e.usedIn ?? []).filter((x) => x !== recordId)
  const many = fileCount(e) > 1
  return (
    <li className="border-b border-rule-soft last:border-b-0">
      <div className="flex items-start gap-3 px-5 py-3">
        <PaperclipIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{e.title}</span>
          <span className="text-xs text-muted-foreground">
            {e.id}, added {e.added}
          </span>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex cursor-pointer items-center gap-1 self-start text-xs font-medium text-primary hover:underline">
            {many ? `${fileSummary(e)} in this pack` : fileSummary(e)}
            <ChevronDownIcon className={cn("size-3 transition-transform", open && "rotate-180")} />
          </button>
          {others.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Also used on{" "}
              {others.map((id, i) => (
                <React.Fragment key={id}>
                  <Link to={id.startsWith("NC-") ? `/corrective-action/${id}` : `/documents/${id}`} className="hover:text-primary hover:underline">
                    {id}
                  </Link>
                  {i < others.length - 1 ? ", " : ""}
                </React.Fragment>
              ))}
            </span>
          )}
        </span>
        {canEdit && (
          <button type="button" onClick={onUnlink} className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Unlink ${e.id}`} title="Unlink from this record. The evidence stays in the register.">
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      {open && (
        <ul className="mx-5 mb-3 flex flex-col rounded-sm border bg-background" aria-label={`Files in ${e.id}`}>
          {(e.files ?? []).map((f, i) => (
            <li key={f.name + i} className={cn("flex items-center gap-2 px-3 py-2 text-[0.8125rem]", i > 0 && "border-t border-rule-soft")}>
              {f.kind === "Link" ? <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" /> : <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
                            <a href={f.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary" aria-label={`Open ${f.name} in SharePoint`}>
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function LinkedEvidence({ recordId, process, label, clauses }: { recordId: string; process?: string; label: string; clauses?: string[] }) {
  const { state, update, can, canSee } = useStore()
  const [linking, setLinking] = React.useState(false)
  const [adding, setAdding] = React.useState(false)
  const [pick, setPick] = React.useState<string[]>([])
  if (!can("Evidence")) return null
  const canEdit = can("Evidence", "Add and edit")
  const all = state.evidence.filter((e) => e.usedIn?.includes(recordId))
  const shown = all.filter((e) => canSee(e.classification))

  function setUsed(e: EvidenceItem, on: boolean) {
    const cur = e.usedIn ?? []
    update("evidence", e.id, { usedIn: on ? [...new Set([...cur, recordId])] : cur.filter((x) => x !== recordId) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence</CardTitle>
        {shown.length > 0 && <span className="text-[0.8125rem] text-muted-foreground">{shown.length}</span>}
      </CardHeader>
      <ul>
        {shown.map((e) => (
          <EvidenceRow key={e.id} e={e} recordId={recordId} canEdit={canEdit} onUnlink={() => { setUsed(e, false); toast(`${e.id} unlinked`, { description: "It stays in the Evidence register." }) }} />
        ))}
        {shown.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No evidence linked yet.</li>}
      </ul>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
          <Button size="sm" variant="outline" onClick={() => { setPick(shown.map((e) => e.id)); setLinking(true) }}>
            <LinkIcon /> Link evidence
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <PlusIcon /> Add new evidence
          </Button>
        </div>
      )}

      <EvidenceSheet open={adding} onOpenChange={setAdding} defaults={{ usedIn: [recordId], processes: process ? [process] : undefined, clauses: clauses?.length ? clauses : undefined, from: recordId }} />

      <Dialog open={linking} onOpenChange={setLinking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link evidence to {recordId}</DialogTitle>
            <DialogDescription>{label}. Choose from the Evidence register. One item can back several documents and records, so nothing is copied.</DialogDescription>
          </DialogHeader>
          <Field label="Evidence" help={process ? `Evidence for ${process} is listed first.` : undefined}>
            <EvidencePicker value={pick} onChange={setPick} process={process} label="Evidence" />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinking(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                for (const e of state.evidence) {
                  const was = !!e.usedIn?.includes(recordId)
                  const now = pick.includes(e.id)
                  if (was !== now && canSee(e.classification)) setUsed(e, now)
                }
                toast("Evidence links saved")
                setLinking(false)
              }}
            >
              Save links
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
