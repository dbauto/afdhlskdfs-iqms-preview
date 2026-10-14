import * as React from "react"
import { BookOpenIcon, ChevronDownIcon, ChevronRightIcon, CircleCheckIcon, ClockIcon, PaperclipIcon, PlusIcon, TriangleAlertIcon, TargetIcon, LinkIcon, FileTextIcon, XIcon, UploadIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { EVIDENCE_GROUPS, INFORMATIVE_CLAUSES } from "@/data/records"
import { CLASSIFICATIONS, isLocked, type Classification, type EvidenceFile, type EvidenceItem } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RemarkMarker, RemarksSheet } from "@/components/app/remarks"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader } from "@/components/app/page"
import { ClassificationTag, StateBadge } from "@/components/app/status"
import { RowActions } from "@/components/app/record-actions"
import { ClausePicker, Field, ProcessPicker, RecordPicker } from "@/components/app/form"
import { fileSummary } from "@/components/app/linked-evidence"
import { formatClauses } from "@/data/iso"

function EvidenceSheet({ open, onOpenChange, item }: { open: boolean; onOpenChange: (v: boolean) => void; item?: EvidenceItem }) {
  const { state, add, update, user } = useStore()
  const [title, setTitle] = React.useState("")
  const [clauses, setClauses] = React.useState<string[]>(["8.5.1"])
  const [processes, setProcesses] = React.useState<string[]>(["Operations"])
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
    setClauses(item?.clauses ?? ["8.5.1"])
    setProcesses(item?.processes ?? ["Operations"])
    setFiles(item?.files ?? [])
    setUsedIn(item?.usedIn ?? [])
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
          <SheetDescription>Evidence shows a requirement is met. Link it to every ISO 9001 clause and process it supports.</SheetDescription>
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
          <Field label="Files and links" error={filesError} help="One file, or a pack of several kept together, such as all the calibration certificates for one month.">
            <div className="flex flex-col gap-2">
              {files.length > 0 && (
                <ul className="flex flex-col rounded-sm border" aria-label="Files and links in this evidence">
                  {files.map((f, i) => (
                    <li key={f.name + i} className={cn("flex items-center gap-2 px-3 py-2 text-[0.8125rem]", i > 0 && "border-t border-rule-soft")}>
                      {f.kind === "Link" ? <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" /> : <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      {f.size && <span className="text-xs text-muted-foreground">{f.size}</span>}
                      <button type="button" onClick={() => setFiles(files.filter((_, k) => k !== i))} className="flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Remove ${f.name}`}>
                        <XIcon className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {isLocked(cls) ? (
                <Alert tone="warning" title="Links only">
                  Confidential evidence is kept as links. Share the files in SharePoint only with the people who need them, and keep the title general.
                </Alert>
              ) : (
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-input text-sm font-medium text-primary hover:bg-background">
                  <UploadIcon className="size-4" /> Upload files
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const picked = [...(e.target.files ?? [])].map((f) => ({ name: f.name, kind: "File" as const, size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB` }))
                      setFiles([...files, ...picked])
                      e.target.value = ""
                    }}
                  />
                </label>
              )}
              <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                <Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Link name" aria-label="Link name" />
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://yourcompany.sharepoint.com/…" aria-label="Link address" />
                <Button
                  variant="outline"
                  disabled={!linkUrl.trim()}
                  onClick={() => {
                    setFiles([...files, { name: linkName.trim() || linkUrl.trim(), kind: "Link", url: linkUrl.trim() }])
                    setLinkName("")
                    setLinkUrl("")
                  }}
                >
                  Add link
                </Button>
              </div>
            </div>
          </Field>
          <Field label="Also used on" optional help="Reuse this evidence on documents and nonconformities instead of uploading it again.">
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
              if (!files.length) return setFilesError("Upload a file or add a link.")
              if (isLocked(cls) && files.some((f) => f.kind === "File")) return setFilesError(`${cls} evidence is kept as links. Remove the uploaded files or change the classification.`)
              const kind = files.every((f) => f.kind === "Link") ? ("Link" as const) : ("File" as const)
              const patch = { title: title.trim(), clauses, processes, kind, classification: cls, files, usedIn }
              if (item) {
                update("evidence", item.id, patch)
                toast(`${item.id} saved`)
              } else {
                const id = nextId(state.evidence.map((e) => e.id), "EV-", 4)
                add("evidence", { id, ...patch, addedBy: user.name, added: "Today" })
                toast(clauses.length === 1 ? `${id} added to clause ${clauses[0]}` : `${id} added to ${clauses.length} clauses`)
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

export default function Evidence() {
  const { state, remove, can, canSee } = useStore()
  const [open, setOpen] = React.useState<Record<string, boolean>>({ "7": true, "8": true })
  const [sheet, setSheet] = React.useState<{ open: boolean; item?: EvidenceItem }>({ open: false })
  const [remarksFor, setRemarksFor] = React.useState<EvidenceItem | undefined>()
  const canAdd = can("Evidence", "Add and edit")
  const old = EVIDENCE_GROUPS.flatMap((g) => g.rows).filter((r) => r.state === "Older than 12 months" || r.state === "Partial")

  return (
    <>
      <PageHeader
        title="Evidence"
        description="Proof that each ISO 9001 requirement is met: records, files and links, grouped by clause."
        actions={
          canAdd && (
            <Button onClick={() => setSheet({ open: true })}>
              <PlusIcon /> Add evidence
            </Button>
          )
        }
      />
      <FigureGrid
        figures={[
          { value: "71%", label: "Requirements with current evidence", badge: "29 of 41", tone: "draft", icon: CircleCheckIcon },
          { value: 4, label: "Requirements with no evidence", badge: "Fix before audit", tone: "overdue", icon: TriangleAlertIcon },
          { value: 9, label: "Evidence older than 12 months", badge: "Refresh", tone: "soon", icon: ClockIcon },
          { value: 200 + state.evidence.length - 1, label: "Evidence items linked", badge: "18 this month", tone: "done", icon: PaperclipIcon },
        ]}
      />

      <Tabs defaultValue="clause" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="clause">By ISO clause</TabsTrigger>
          <TabsTrigger value="all">
            All evidence <span className="text-xs font-normal text-muted-foreground">{state.evidence.length}</span>
          </TabsTrigger>
          <TabsTrigger value="old">
            Getting old <span className="text-xs font-normal text-muted-foreground">{old.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clause" className="flex flex-col gap-4">
          <Alert tone="info">
            Clauses 1 to 3 (Scope, Normative references, Terms and definitions) explain the standard and need no evidence or documented information. Requirements start at clause 4.
          </Alert>
          <section className="rounded-md border bg-card">
            {INFORMATIVE_CLAUSES.map((c) => {
              const isOpen = !!open[c.no]
              return (
                <div key={c.no} className="border-b">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [c.no]: !isOpen }))}
                    className="grid w-full cursor-pointer grid-cols-[20px_32px_minmax(0,1fr)_minmax(120px,280px)_48px] items-center gap-3 px-5 py-4 text-left text-muted-foreground hover:bg-hover"
                  >
                    {isOpen ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
                    <span className="text-[0.9375rem] font-semibold">{c.no}</span>
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className="flex items-center gap-1.5 text-[0.8125rem]">
                      <BookOpenIcon className="size-3.5" /> Informative, no evidence needed
                    </span>
                    <span className="text-right text-[0.8125rem]">n/a</span>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-2 border-t border-rule-soft bg-hover px-5 py-4 pl-[72px] text-sm leading-relaxed">
                      <p>{c.summary}</p>
                      {c.link && (
                        <Link to={c.link.to} className="self-start font-medium text-primary">
                          {c.link.label}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {EVIDENCE_GROUPS.map((g, i) => {
              const isOpen = !!open[g.no]
              return (
                <div key={g.no} className={cn(i > 0 && "border-t")}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [g.no]: !isOpen }))}
                    className={cn("grid w-full cursor-pointer grid-cols-[20px_32px_minmax(0,1fr)_minmax(120px,280px)_48px] items-center gap-3 px-5 py-4 text-left hover:bg-hover", isOpen && "bg-hover")}
                  >
                    {isOpen ? <ChevronDownIcon className="size-4 text-muted-foreground" /> : <ChevronRightIcon className="size-4 text-muted-foreground" />}
                    <span className="text-[0.9375rem] font-semibold">{g.no}</span>
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <span className="flex h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
                      <span className="bg-done" style={{ width: `${g.ok}%` }} />
                      <span className="bg-soon-bar" style={{ width: `${g.part}%` }} />
                      <span className="bg-overdue" style={{ width: `${g.gap}%` }} />
                    </span>
                    <span className="text-right text-[0.8125rem] text-muted-foreground">{g.frac}</span>
                  </button>
                  {isOpen && (
                    <ul className="border-t border-rule-soft">
                      {g.rows.map((r, k) => (
                        <li key={r.no} className={cn("grid grid-cols-[52px_minmax(0,1fr)_200px_90px_160px] items-center gap-3 px-5 py-3 pl-[72px] text-sm max-lg:grid-cols-[52px_minmax(0,1fr)_160px]", k > 0 && "border-t border-rule-soft")}>
                          <span className="font-medium">{r.no}</span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{r.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{r.process}</span>
                          </span>
                          <span className="text-[0.8125rem] text-muted-foreground max-lg:hidden">{r.items ? `${r.items} items, latest ${r.latest}` : "Nothing linked"}</span>
                          <span className="max-lg:hidden">{r.state === "No evidence" && canAdd ? <Button variant="quiet" size="sm" onClick={() => setSheet({ open: true })}>Add</Button> : null}</span>
                          <StateBadge value={r.state} className="justify-self-end" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </section>
        </TabsContent>

        <TabsContent value="all">
          <DataTable
            label="All evidence" empty={{ title: "No evidence yet", body: "Add records, files and links that show each ISO 9001 requirement is met." }}
            rows={state.evidence.filter((e) => canSee(e.classification))}
            getRowId={(e) => e.id}
            minWidth={980}
            columns={[
              { id: "t", header: "Evidence", cell: (e) => <span className="flex flex-col gap-0.5"><span className="flex items-center gap-2"><span className="text-[0.8125rem] font-medium text-primary">{e.id}</span><RemarkMarker kind="Evidence" id={e.id} onClick={() => setRemarksFor(e)} /></span><span className="font-medium">{e.title}</span>{state.objectives.some((o) => o.evidence?.includes(e.id)) && <Link to="/qms/objectives" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><TargetIcon className="size-3" />Supports {state.objectives.filter((o) => o.evidence?.includes(e.id)).map((o) => o.name.toLowerCase()).join(", ")}</Link>}{!!e.usedIn?.length && <span className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground"><LinkIcon className="size-3" />Used on {e.usedIn.map((id, i) => <Link key={id} to={id.startsWith("NC-") ? `/corrective-action/${id}` : `/documents/${id}`} className="hover:text-primary hover:underline">{id}{i < e.usedIn!.length - 1 ? "," : ""}</Link>)}</span>}</span>, className: "min-w-[260px]" },
              { id: "c", header: "Clauses", cell: (e) => <span className="whitespace-nowrap">{formatClauses(e.clauses)}</span> },
              {
                id: "p",
                header: "Processes",
                cell: (e) => (
                  <span className="flex flex-col text-muted-foreground">
                    {e.processes.map((p) => (
                      <span key={p} className="whitespace-nowrap">{p}</span>
                    ))}
                  </span>
                ),
              },
              { id: "k", header: "Contents", cell: (e) => <span className="whitespace-nowrap">{fileSummary(e)}</span> },
              { id: "cl", header: "Classification", cell: (e) => <ClassificationTag value={e.classification} /> },
              { id: "a", header: "Added", cell: (e) => <span className="flex flex-col"><span className="whitespace-nowrap">{e.added}</span><span className="text-xs text-muted-foreground">{e.addedBy}</span></span> },
              {
                id: "x",
                header: <span className="sr-only">Actions</span>,
                className: "w-12",
                cell: (e) => <RowActions name={e.id} onEdit={canAdd ? () => setSheet({ open: true, item: e }) : undefined} extra={[{ label: "Consultant remarks", onSelect: () => setRemarksFor(e) }]} removeKind={canAdd ? "delete" : undefined} onRemove={() => remove("evidence", e.id)} />,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="old">
          <DataTable
            label="Evidence getting old" empty={{ title: "Nothing getting old", body: "All evidence is less than 12 months old." }}
            rows={old}
            getRowId={(r) => r.no}
            minWidth={760}
            columns={[
              { id: "n", header: "Clause", cell: (r) => <span className="font-medium">{r.no}</span> },
              { id: "t", header: "Requirement", cell: (r) => r.name },
              { id: "p", header: "Process", cell: (r) => <span className="text-muted-foreground">{r.process}</span> },
              { id: "l", header: "Latest", cell: (r) => r.latest },
              { id: "s", header: "State", cell: (r) => <StateBadge value={r.state} /> },
            ]}
          />
        </TabsContent>
      </Tabs>

      <EvidenceSheet open={sheet.open} item={sheet.item} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} />
      <RemarksSheet target={remarksFor ? { kind: "Evidence", id: remarksFor.id, label: `${remarksFor.id} ${remarksFor.title}`, to: "/evidence", area: "Evidence" } : undefined} onClose={() => setRemarksFor(undefined)} />
    </>
  )
}
