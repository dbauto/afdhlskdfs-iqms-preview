import * as React from "react"
import { BookOpenIcon, ChevronDownIcon, ChevronRightIcon, CircleCheckIcon, ClockIcon, PaperclipIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { EVIDENCE_GROUPS, INFORMATIVE_CLAUSES } from "@/data/records"
import { CLASSIFICATIONS, isLocked, type Classification, type EvidenceItem } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader } from "@/components/app/page"
import { ClassificationTag, StateBadge } from "@/components/app/status"
import { RowActions } from "@/components/app/record-actions"
import { ChipChoice, ClausePicker, Field, ProcessPicker } from "@/components/app/form"
import { formatClauses } from "@/data/iso"

function EvidenceSheet({ open, onOpenChange, item }: { open: boolean; onOpenChange: (v: boolean) => void; item?: EvidenceItem }) {
  const { state, add, update, user } = useStore()
  const [title, setTitle] = React.useState("")
  const [clauses, setClauses] = React.useState<string[]>(["8.5.1"])
  const [processes, setProcesses] = React.useState<string[]>(["Operations"])
  const [kind, setKind] = React.useState<"File" | "Link">("Link")
  const [cls, setCls] = React.useState<Classification>("Internal")
  const [error, setError] = React.useState("")
  const [linkError, setLinkError] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setTitle(item?.title ?? "")
    setClauses(item?.clauses ?? ["8.5.1"])
    setProcesses(item?.processes ?? ["Operations"])
    setKind(item?.kind === "File" ? "File" : "Link")
    setCls(item?.classification ?? "Internal")
    setError("")
    setLinkError("")
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
          {isLocked(cls) ? (
            <Alert tone="warning" title="Link only">
              Confidential evidence is kept as a link. Share the file in SharePoint only with the people who need it, and keep the title general.
            </Alert>
          ) : (
            <Field label="Add as">
              <ChipChoice label="Add as" options={["Link", "File"] as const} value={kind} onChange={setKind} />
            </Field>
          )}
          {kind === "File" && !isLocked(cls) ? (
            <Field label="File">
              <Input type="file" className="h-auto py-2" />
            </Field>
          ) : (
            <Field label="Link" htmlFor="ev-link">
              <Input id="ev-link" placeholder="https://yourcompany.sharepoint.com/…" />
            </Field>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!title.trim()) return setError("Say what the evidence is.")
              if (!clauses.length || !processes.length) return setLinkError("Choose at least one.")
              const patch = { title: title.trim(), clauses, processes, kind: isLocked(cls) ? ("Link" as const) : kind, classification: cls }
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
  const { state, remove, can } = useStore()
  const [open, setOpen] = React.useState<Record<string, boolean>>({ "7": true, "8": true })
  const [sheet, setSheet] = React.useState<{ open: boolean; item?: EvidenceItem }>({ open: false })
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
                    <span className="text-[15px] font-semibold">{c.no}</span>
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className="flex items-center gap-1.5 text-[13px]">
                      <BookOpenIcon className="size-3.5" /> Informative, no evidence needed
                    </span>
                    <span className="text-right text-[13px]">n/a</span>
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
                    <span className="text-[15px] font-semibold">{g.no}</span>
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <span className="flex h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
                      <span className="bg-done" style={{ width: `${g.ok}%` }} />
                      <span className="bg-soon-bar" style={{ width: `${g.part}%` }} />
                      <span className="bg-overdue" style={{ width: `${g.gap}%` }} />
                    </span>
                    <span className="text-right text-[13px] text-muted-foreground">{g.frac}</span>
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
                          <span className="text-[13px] text-muted-foreground max-lg:hidden">{r.items ? `${r.items} items, latest ${r.latest}` : "Nothing linked"}</span>
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
            label="All evidence"
            rows={state.evidence}
            getRowId={(e) => e.id}
            minWidth={980}
            columns={[
              { id: "t", header: "Evidence", cell: (e) => <span className="flex flex-col gap-0.5"><span className="text-[13px] font-medium text-primary">{e.id}</span><span className="font-medium">{e.title}</span></span>, className: "min-w-[260px]" },
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
              { id: "k", header: "Kind", cell: (e) => e.kind },
              { id: "cl", header: "Classification", cell: (e) => <ClassificationTag value={e.classification} /> },
              { id: "a", header: "Added", cell: (e) => <span className="flex flex-col"><span className="whitespace-nowrap">{e.added}</span><span className="text-xs text-muted-foreground">{e.addedBy}</span></span> },
              {
                id: "x",
                header: <span className="sr-only">Actions</span>,
                className: "w-12",
                cell: (e) => <RowActions name={e.id} onEdit={canAdd ? () => setSheet({ open: true, item: e }) : undefined} removeKind={canAdd ? "delete" : undefined} onRemove={() => remove("evidence", e.id)} />,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="old">
          <DataTable
            label="Evidence getting old"
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
    </>
  )
}
