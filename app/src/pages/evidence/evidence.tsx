import * as React from "react"
import { BookOpenIcon, ChevronDownIcon, ChevronRightIcon, CircleCheckIcon, ClockIcon, PaperclipIcon, PlusIcon, TriangleAlertIcon, TargetIcon, LinkIcon, FileTextIcon, XIcon, UploadIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { clauseCoverage } from "@/lib/record-figures"
import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { INFORMATIVE_CLAUSES } from "@/data/records"
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
import { hrefForId } from "@/lib/record-links"
import { EvidenceSheet } from "./evidence-sheet"

export default function Evidence() {
  const { state, remove, can, canSee } = useStore()
  const [open, setOpen] = React.useState<Record<string, boolean>>({ "7": true, "8": true })
  const [sheet, setSheet] = React.useState<{ open: boolean; item?: EvidenceItem }>({ open: false })
  const [remarksFor, setRemarksFor] = React.useState<EvidenceItem | undefined>()
  const canAdd = can("Evidence", "Add and edit")
  const coverage = clauseCoverage(state, canSee)
  const old = coverage.rows.filter(r => r.state === "Partial")

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
          { value: coverage.hasData ? `${Math.round(100 * coverage.current / coverage.total)}%` : "No data", label: "Requirements with current evidence", badge: coverage.hasData ? `${coverage.current} of ${coverage.total}` : "No data", tone: "draft", icon: CircleCheckIcon },
          { value: coverage.hasData ? coverage.missing : "No data", label: "Requirements with no evidence", badge: "Fix before audit", tone: "overdue", icon: TriangleAlertIcon },
          { value: coverage.evidence.length ? coverage.old.length : "No data", label: "Evidence older than 12 months", badge: "Refresh", tone: "soon", icon: ClockIcon },
          { value: coverage.evidence.length || "No data", label: "Evidence items linked", badge: `${coverage.addedThisMonth} this month`, tone: "done", icon: PaperclipIcon },
        ]}
      />

      <Tabs defaultValue="clause" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="clause">By ISO clause</TabsTrigger>
          <TabsTrigger value="all">
            All evidence <span className="text-xs font-normal text-muted-foreground">{coverage.evidence.length}</span>
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
                    className="grid w-full cursor-pointer grid-cols-[20px_32px_minmax(0,1fr)_minmax(60px,200px)_64px] max-sm:grid-cols-[20px_24px_minmax(0,1fr)_64px] items-center gap-3 px-5 py-4 text-left text-muted-foreground hover:bg-hover"
                  >
                    {isOpen ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
                    <span className="text-[0.9375rem] font-semibold">{c.no}</span>
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className="flex items-center gap-1.5 text-[0.8125rem] max-sm:hidden">
                      <BookOpenIcon className="size-3.5" /> Informative
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
            {coverage.groups.map((g, i) => {
              const isOpen = !!open[g.no]
              return (
                <div key={g.no} className={cn(i > 0 && "border-t")}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [g.no]: !isOpen }))}
                    className={cn("grid w-full cursor-pointer grid-cols-[20px_32px_minmax(0,1fr)_minmax(60px,200px)_64px] max-sm:grid-cols-[20px_24px_minmax(0,1fr)_64px] items-center gap-3 px-5 py-4 text-left hover:bg-hover", isOpen && "bg-hover")}
                  >
                    {isOpen ? <ChevronDownIcon className="size-4 text-muted-foreground" /> : <ChevronRightIcon className="size-4 text-muted-foreground" />}
                    <span className="text-[0.9375rem] font-semibold">{g.no}</span>
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <span className="flex h-2 overflow-hidden rounded-full bg-border max-sm:hidden" aria-hidden="true">
                      <span className="bg-done" style={{ width: `${g.ok}%` }} />
                      <span className="bg-soon-bar" style={{ width: `${g.part}%` }} />
                      <span className="bg-overdue" style={{ width: `${g.gap}%` }} />
                    </span>
                    <span className="text-right text-[0.8125rem] text-muted-foreground">{g.frac}</span>
                  </button>
                  {isOpen && (
                    <ul className="border-t border-rule-soft">
                      {g.rows.map((r, k) => (
                        <li key={r.no} className={cn("grid grid-cols-[52px_minmax(0,1fr)_200px_90px_160px] items-center gap-3 px-5 py-3 pl-[72px] text-sm max-lg:grid-cols-[52px_minmax(0,1fr)_140px] max-sm:grid-cols-[40px_minmax(0,1fr)] max-sm:pl-5", k > 0 && "border-t border-rule-soft")}>
                          <span className="font-medium">{r.no}</span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate max-sm:whitespace-normal max-sm:overflow-visible">{r.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{r.process}</span>
                          </span>
                          <span className="text-[0.8125rem] text-muted-foreground max-lg:hidden">{r.items ? `${r.items} items, latest ${r.latest}` : "Nothing linked"}</span>
                          <span className="max-lg:hidden">{r.state === "No evidence" && canAdd ? <Button variant="quiet" size="sm" onClick={() => setSheet({ open: true })}>Add</Button> : null}</span>
                          <StateBadge value={r.state} className="justify-self-end max-sm:col-span-2 max-sm:justify-self-start max-sm:ml-[52px]" />
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
            rows={coverage.evidence}
            getRowId={(e) => e.id}
            minWidth={980}
            columns={[
              { id: "t", header: "Evidence", cell: (e) => <span className="flex flex-col gap-0.5"><span className="flex items-center gap-2"><Link to={`/evidence/${e.id}`} className="text-[0.8125rem] font-medium text-primary hover:underline">{e.id}</Link><RemarkMarker kind="Evidence" id={e.id} onClick={() => setRemarksFor(e)} /></span><Link to={`/evidence/${e.id}`} className="font-medium hover:text-primary">{e.title}</Link>{state.objectives.some((o) => o.evidence?.includes(e.id)) && <span className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground"><TargetIcon className="size-3" />Supports {state.objectives.filter((o) => o.evidence?.includes(e.id)).map((o, i, all) => <Link key={o.id} to={`/qms/objectives/${o.id}`} className="hover:text-primary hover:underline">{o.name.toLowerCase()}{i < all.length - 1 ? "," : ""}</Link>)}</span>}{!!e.usedIn?.length && <span className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground"><LinkIcon className="size-3" />Used on {e.usedIn.map((id, i) => <Link key={id} to={hrefForId(id)} className="hover:text-primary hover:underline">{id}{i < e.usedIn!.length - 1 ? "," : ""}</Link>)}</span>}</span>, className: "min-w-[260px]" },
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
      <RemarksSheet target={remarksFor ? { kind: "Evidence", id: remarksFor.id, label: `${remarksFor.id} ${remarksFor.title}`, to: `/evidence/${remarksFor.id}`, area: "Evidence" } : undefined} onClose={() => setRemarksFor(undefined)} />
    </>
  )
}
