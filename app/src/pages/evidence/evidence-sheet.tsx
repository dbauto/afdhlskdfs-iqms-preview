import * as React from "react"
import { FolderUpIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore, startProcess } from "@/lib/store"
import { todayIso } from "@/lib/periods"
import { cleanFolder, folderOf, MAX_UPLOAD_LABEL, storedFile, uploadProblem, uploadsAllowed } from "@/lib/uploads"
import { CLASSIFICATIONS, isLocked, type Classification, type EvidenceFile, type EvidenceItem } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ClausePicker, Field, ProcessPicker, RecordPicker } from "@/components/app/form"
import { FileTree } from "@/components/app/file-tree"

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
  const [folder, setFolder] = React.useState("")
  const fileInput = React.useRef<HTMLInputElement>(null)
  const folderInput = React.useRef<HTMLInputElement>(null)
  const canUpload = uploadsAllowed(cls)

  /** uploads the files that pass the checks and says which ones didn't, and why */
  function addUploads(list: FileList | null, fromFolder: boolean) {
    if (!list?.length) return
    const picked = Array.from(list)
    const ok = picked.filter((f) => !uploadProblem(f))
    const problems = picked.map(uploadProblem).filter(Boolean) as string[]
    const base = cleanFolder(folder)
    setFiles((now) => [...now, ...ok.map((f) => ({ name: f.name, kind: "File" as const, stored: storedFile(f, user.name), folder: fromFolder ? folderOf(f, base) : base || undefined }))])
    setFilesError(problems.length === 0 ? "" : problems.length === 1 ? problems[0] : `${problems.length} files weren’t added. ${problems[0]}`)
  }

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
    setFolder("")
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
          <Field
            label="Files and links"
            error={filesError}
            help={
              canUpload
                ? `Upload files (up to ${MAX_UPLOAD_LABEL} each, no videos or .exe files), a whole folder with its subfolders, or paste links to SharePoint or OneDrive. One item, or a pack kept together, such as all the calibration certificates for one month.`
                : "Confidential evidence stays in SharePoint or OneDrive: paste links. ThryveMS keeps the link, not the file."
            }
          >
            <div className="flex flex-col gap-2">
              {files.length > 0 && (
                <div className="rounded-sm border">
                  <FileTree label="Files and links in this evidence" files={files} onRemove={(i) => setFiles(files.filter((_, k) => k !== i))} />
                </div>
              )}
              <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder, optional, such as Calibration/2026/Q3" aria-label="Folder for the next files and links" />
              {canUpload && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => fileInput.current?.click()}>
                    <UploadIcon /> Upload files
                  </Button>
                  <Button variant="outline" onClick={() => folderInput.current?.click()}>
                    <FolderUpIcon /> Upload folder
                  </Button>
                  <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="ev-files-input" onChange={(e) => { addUploads(e.target.files, false); e.target.value = "" }} />
                  <input ref={folderInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="ev-folder-input" {...{ webkitdirectory: "", directory: "" }} onChange={(e) => { addUploads(e.target.files, true); e.target.value = "" }} />
                </div>
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
                    setFiles([...files, { name: linkName.trim() || last, kind: isFile ? "File" : "Link", url, folder: cleanFolder(folder) || undefined }])
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
              if (!files.length) return setFilesError(canUpload ? "Upload a file or add a link." : "Add at least one link.")
              if (!canUpload && files.some((f) => f.stored)) return setFilesError(`${cls} evidence stays as links. Remove the uploaded files, or choose Public or Internal.`)
              const kind = files.every((f) => f.kind === "Link") ? ("Link" as const) : ("File" as const)
              const patch = { title: title.trim(), clauses, processes, kind, classification: cls, files, usedIn }
              if (item) {
                update("evidence", item.id, patch)
                toast(`${item.id} saved`)
              } else {
                const id = nextId(takenIds("evidence"), "EV-", 4)
                add("evidence", { id, ...patch, addedBy: user.name, added: "Today", addedDate: todayIso() })
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
