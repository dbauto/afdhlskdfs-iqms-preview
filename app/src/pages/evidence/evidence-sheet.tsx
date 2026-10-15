import * as React from "react"
import { FileTextIcon, LinkIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore, startProcess } from "@/lib/store"
import { cn } from "@/lib/utils"
import { CLASSIFICATIONS, isLocked, type Classification, type EvidenceFile, type EvidenceItem } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ClausePicker, Field, ProcessPicker, RecordPicker } from "@/components/app/form"

/**
 * Add or edit an evidence item. Opened from the Evidence page, or from a record (a document,
 * a nonconformity) with defaults so the new item is linked to that record straight away.
 */
export function EvidenceSheet({ open, onOpenChange, item, defaults, onCreated }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item?: EvidenceItem
  /** pre-filled when adding from a record */
  defaults?: { usedIn?: string[]; processes?: string[]; clauses?: string[]; from?: string }
  onCreated?: (id: string) => void
}) {
  const { state, add, update, user, takenIds } = useStore()
  const [title, setTitle] = React.useState("")
  const [clauses, setClauses] = React.useState<string[]>(["8.5.1"])
  const [processes, setProcesses] = React.useState<string[]>([startProcess(state.processes)])
  const [files, setFiles] = React.useState<EvidenceFile[]>([])
  const [linkName, setLinkName] = React.useState("")
  const [linkUrl, setLinkUrl] = React.useState("")
  const [usedIn, setUsedIn] = React.useState<string[]>([])
  const [cls, setCls] = React.useState<Classification>("Internal")
  const [error, setError] = React.useState("")
  const [linkError, setLinkError] = React.useState("")
  const [filesError, setFilesError] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setTitle(item?.title ?? "")
    setClauses(item?.clauses ?? defaults?.clauses ?? ["8.5.1"])
    setProcesses(item?.processes ?? defaults?.processes ?? [startProcess(state.processes)])
    setFiles(item?.files ?? [])
    setUsedIn(item?.usedIn ?? defaults?.usedIn ?? [])
    setLinkName("")
    setLinkUrl("")
    setCls(item?.classification ?? "Internal")
    setError("")
    setLinkError("")
    setFilesError("")
  }, [open, item])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item ? `Edit ${item.id}` : "Add evidence"}</SheetTitle>
          <SheetDescription>
            {!item && defaults?.from ? `Saved to the Evidence register and linked to ${defaults.from}, so you can reuse it elsewhere. ` : ""}Evidence shows a requirement is met. Link it to every ISO 9001 clause and process it supports.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field label="What is it" htmlFor="ev-title" error={error}>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Production plan, week 42" aria-invalid={!!error} />
          </Field>
          <Field label="ISO 9001 clauses" htmlFor="ev-clause" error={linkError && !clauses.length ? linkError : undefined} help="One piece of evidence can support several clauses.">
            <ClausePicker id="ev-clause" label="ISO 9001 clauses" value={clauses} onChange={setClauses} />
          </Field>
          <Field label="Processes" htmlFor="ev-proc" error={linkError && !processes.length ? linkError : undefined}>
            <ProcessPicker id="ev-proc" label="Processes" value={processes} onChange={setProcesses} />
          </Field>
          <Field label="Classification" htmlFor="ev-cls">
            <NativeSelect id="ev-cls" value={cls} onChange={(e) => setCls(e.target.value as Classification)}>
              {CLASSIFICATIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Links" error={filesError} help="Paste links to files in your SharePoint or OneDrive. iQMS keeps the link, not the file. One link, or a pack of several kept together, such as all the calibration certificates for one month.">
            <div className="flex flex-col gap-2">
              {files.length > 0 && (
                <ul className="flex flex-col rounded-sm border" aria-label="Links in this evidence">
                  {files.map((f, i) => (
                    <li key={f.name + i} className={cn("flex items-center gap-2 px-3 py-2 text-[0.8125rem]", i > 0 && "border-t border-rule-soft")}>
                      {f.kind === "Link" ? <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" /> : <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <button type="button" onClick={() => setFiles(files.filter((_, k) => k !== i))} className="flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Remove ${f.name}`}>
                        <XIcon className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                <Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Name, optional" aria-label="Link name" />
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://yourcompany.sharepoint.com/…" aria-label="Link address" />
                <Button
                  variant="outline"
                  disabled={!linkUrl.trim()}
                  onClick={() => {
                    const url = linkUrl.trim()
                    let parsed: URL | undefined
                    try {
                      parsed = new URL(url)
                    } catch {
                      parsed = undefined
                    }
                    if (!parsed || parsed.protocol !== "https:") return setFilesError("Use a full https:// link, for example from SharePoint’s Copy link.")
                    const last = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? parsed.hostname)
                    const isFile = /\.[a-z0-9]{2,5}$/i.test(last)
                    setFiles([...files, { name: linkName.trim() || last, kind: isFile ? "File" : "Link", url }])
                    setFilesError("")
                    setLinkName("")
                    setLinkUrl("")
                  }}
                >
                  Add link
                </Button>
              </div>
              {isLocked(cls) && <p className="text-[0.8125rem] text-muted-foreground">Keep the name general and share the file in SharePoint only with the people who need it.</p>}
            </div>
          </Field>
          <Field label="Used on" optional help="Reuse this evidence on documents and nonconformities instead of adding it again.">
            <RecordPicker
              label="Records"
              value={usedIn}
              onChange={setUsedIn}
              options={[
                ...state.documents.map((d) => ({ id: d.id, title: d.title, meta: `${d.type}, ${d.process}` })),
                ...state.ncs.map((n) => ({ id: n.id, title: n.title, meta: `Nonconformity, ${n.process}` })),
              ]}
            />
          </Field>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!title.trim()) return setError("Say what the evidence is.")
              if (!clauses.length || !processes.length) return setLinkError("Choose at least one.")
              if (!files.length) return setFilesError("Add at least one link.")
              const kind = files.every((f) => f.kind === "Link") ? ("Link" as const) : ("File" as const)
              const patch = { title: title.trim(), clauses, processes, kind, classification: cls, files, usedIn }
              if (item) {
                update("evidence", item.id, patch)
                toast(`${item.id} saved`)
              } else {
                const id = nextId(takenIds("evidence"), "EV-", 4)
                add("evidence", { id, ...patch, addedBy: user.name, added: "Today" })
                toast(defaults?.from ? `${id} added and linked to ${defaults.from}` : clauses.length === 1 ? `${id} added to clause ${clauses[0]}` : `${id} added to ${clauses.length} clauses`, { description: defaults?.from ? "It’s also in the Evidence register, so it can be reused." : undefined })
                onCreated?.(id)
              }
              onOpenChange(false)
            }}
          >
            {item ? "Save changes" : "Add evidence"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
