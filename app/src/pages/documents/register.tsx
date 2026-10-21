import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { ChevronDownIcon, ChevronRightIcon, FilePlus2Icon, FileTextIcon, PlusIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { RemarkMarker } from "@/components/app/remarks"
import { controlledRevision, documentRights } from "@/lib/document-control"
import { useStore } from "@/lib/store"
import { isLocked, type DocRecord } from "@/data/types"
import { DOC_TYPES } from "@/data/records"
import { ISO_CLAUSES } from "@/data/iso"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/input"
import { DataTable, type Column } from "@/components/app/data-table"
import { PageHeader, ViewChips } from "@/components/app/page"
import { ClassificationTag, DocStage } from "@/components/app/status"
import { RowActions, type RemoveKind } from "@/components/app/record-actions"
import { ProcessOptions } from "@/components/app/form"
import { DocSheet } from "./doc-sheet"
import { RevisionSheet } from "./revision-sheet"

type View = "all" | "published" | "review" | "overdue" | "drafts" | "confidential"
const IN_REVIEW = ["Technical review", "Changes requested", "Approval", "Ready to publish"]

export function removeKindFor(d: DocRecord): RemoveKind {
  if (d.stage === "Draft" && !controlledRevision(d)) return "delete"
  if (d.stage === "Published") return "archive"
  return "withdraw"
}

export default function Documents() {
  const { state, documentCommand, remove, can, canSee, user } = useStore()
  const [view, setView] = React.useState<View>("all")
  const [process, setProcess] = React.useState("")
  const [type, setType] = React.useState("")
  const [q, setQ] = React.useState("")
  const [sheet, setSheet] = React.useState<{ open: boolean; doc?: DocRecord }>({ open: false })
  const [revising, setRevising] = React.useState<DocRecord | undefined>()

  const docs = state.documents.filter((d) => d.stage !== "Archived" && canSee(d.classification, d.viewers, d.owner, [...d.reviewers, ...d.approvers]))
  const count = (f: (d: DocRecord) => boolean) => docs.filter(f).length
  const VIEWS: Record<View, (d: DocRecord) => boolean> = {
    all: () => true,
    published: (d) => d.stage === "Published",
    review: (d) => IN_REVIEW.includes(d.stage),
    overdue: (d) => !!d.reviewOverdue || !!d.lateBy,
    drafts: (d) => d.stage === "Draft",
    confidential: (d) => isLocked(d.classification),
  }
  const rows = docs
    .filter(VIEWS[view])
    .filter((d) => !process || d.process === process)
    .filter((d) => !type || d.type === type)
    .filter((d) => !q || `${d.id} ${d.title} ${d.owner}`.toLowerCase().includes(q.toLowerCase()))

  const canAdd = can("Documents", "Add and edit")

  const columns: Column<DocRecord>[] = [
    {
      id: "doc",
      header: "Document",
      cell: (d) => (
        <Link to={`/documents/${d.id}`} className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2"><span className="text-[0.8125rem] font-medium text-primary">{d.id}</span><RemarkMarker kind="Document" id={d.id} /></span>
          <span className="font-medium text-foreground">{d.title}</span>
          <span className="text-xs text-muted-foreground">
            {d.type}, revision {d.rev}
          </span>
        </Link>
      ),
      className: "min-w-[220px]",
    },
    { id: "process", header: "Process", cell: (d) => <span className="text-muted-foreground">{d.process}</span>, className: "min-w-[130px]" },
    { id: "cls", header: "Classification", cell: (d) => <ClassificationTag value={d.classification} /> },
    { id: "stage", header: "Stage", cell: (d) => <DocStage doc={d} />, className: "min-w-[150px]" },
    {
      id: "owner",
      header: "Owner, next review",
      cell: (d) => (
        <span className="flex flex-col gap-0.5 whitespace-nowrap">
          <span>{d.owner}</span>
          <span className={d.reviewOverdue ? "text-[0.8125rem] font-semibold text-overdue" : "text-[0.8125rem] text-muted-foreground"}>
            {d.reviewOverdue ? `Review overdue, ${d.nextReview}` : `Review ${d.nextReview}`}
          </span>
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12",
      cell: (d) => (
        <RowActions
          name={d.id}
          openTo={`/documents/${d.id}`}
          onEdit={documentRights(state, user, d).draft ? () => setSheet({ open: true, doc: d }) : undefined}
          extra={
            documentRights(state, user, d).edit && d.stage === "Published"
              ? [{ label: "Start new revision", icon: <FilePlus2Icon />, onSelect: () => setRevising(d) }]
              : undefined
          }
          removeKind={documentRights(state, user, d).draft || documentRights(state, user, d).manage ? removeKindFor(d) : undefined}
          onRemove={() => {
            const k = removeKindFor(d)
            if (k === "delete") remove("documents", d.id)
            else documentCommand({ kind: k === "archive" ? "archive" : "withdraw", id: d.id, expectedRev: d.rev })
          }}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Documents"
        description="Every controlled document, its current revision and where it is in review. Files stay in SharePoint or OneDrive."
        actions={
          canAdd && (
            <Button onClick={() => setSheet({ open: true })}>
              <PlusIcon /> Add document
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewChips
          value={view}
          onChange={setView}
          views={[
            { id: "all", label: "All", count: count(VIEWS.all) },
            { id: "published", label: "Published", count: count(VIEWS.published) },
            { id: "review", label: "In review", count: count(VIEWS.review) },
            { id: "overdue", label: "Review overdue", count: count(VIEWS.overdue), warn: true },
            { id: "drafts", label: "Drafts", count: count(VIEWS.drafts) },
            { id: "confidential", label: "Confidential", count: count(VIEWS.confidential) },
          ]}
        />
        <Link to="/documents/reviews" className="text-[0.8125rem] font-medium text-primary">
          Open reviews
        </Link>
      </div>

      <Tabs defaultValue="register" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="clause">By ISO clause</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
      <DataTable
        label="Document register"
        rows={rows}
        columns={columns}
        getRowId={(d) => d.id}
        minWidth={860}
        empty={{
          title: "No documents match",
          body: "Try another view or clear the filters.",
          action: (
            <Button variant="outline" size="sm" onClick={() => { setView("all"); setProcess(""); setType(""); setQ("") }}>
              Clear filters
            </Button>
          ),
        }}
        toolbar={
          <>
            <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-sm border border-input bg-card px-3 sm:max-w-xs">
              <SearchIcon className="size-4 text-muted-foreground" />
              <span className="sr-only">Filter documents</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by number, title or owner" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <NativeSelect aria-label="Process" value={process} onChange={(e) => setProcess(e.target.value)} className="h-9 w-auto min-w-44 text-[0.8125rem]">
              <option value="">All processes</option>
              <ProcessOptions />
            </NativeSelect>
            <NativeSelect aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-auto min-w-36 text-[0.8125rem]">
              <option value="">All types</option>
              {DOC_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </NativeSelect>
            <span className="ml-auto flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
              <FileTextIcon className="size-4" /> {rows.length} shown
            </span>
          </>
        }
      />
        </TabsContent>

        <TabsContent value="clause">
          <DocumentsByClause docs={docs.filter(VIEWS[view])} />
        </TabsContent>
      </Tabs>

      <DocSheet open={sheet.open} doc={sheet.doc} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} />
      <RevisionSheet doc={revising} onClose={() => setRevising(undefined)} />
    </>
  )
}

const depthOf = (no: string) => no.split(".").length
const CHAPTERS = ISO_CLAUSES.filter((c) => depthOf(c.no) === 1)

/**
 * Documents grouped by the ISO 9001 clauses they cover. A document covering several clauses
 * shows under each of them. Uses the same rows as the register, so access, view and filters
 * apply before anything is counted.
 */
function DocumentsByClause({ docs }: { docs: DocRecord[] }) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({})
  const valid = new Set(ISO_CLAUSES.map((c) => c.no))
  const unmapped = docs.filter((d) => !d.clauses.some((c) => valid.has(c)))

  const groups = CHAPTERS.map((ch) => {
    const clauses = ISO_CLAUSES.filter((c) => c.no === ch.no || c.no.startsWith(`${ch.no}.`))
      .map((c) => ({ ...c, docs: docs.filter((d) => d.clauses.includes(c.no)) }))
      .filter((c) => c.docs.length > 0)
    const count = new Set(clauses.flatMap((c) => c.docs.map((d) => d.id))).size
    return { ...ch, clauses, count }
  })
  const all = [...groups.map((g) => ({ key: g.no, label: g.no, name: g.title, count: g.count })), ...(unmapped.length ? [{ key: "none", label: "", name: "No clause chosen yet", count: unmapped.length }] : [])]

  return (
    <section className="rounded-md border bg-card" aria-label="Documents by ISO 9001 clause">
      {all.map((g, i) => {
        const isOpen = !!open[g.key]
        const group = groups.find((x) => x.no === g.key)
        return (
          <div key={g.key} className={cn(i > 0 && "border-t")}>
            <button
              type="button"
              aria-expanded={isOpen}
              disabled={g.count === 0}
              onClick={() => setOpen((o) => ({ ...o, [g.key]: !isOpen }))}
              className={cn("grid w-full grid-cols-[20px_32px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 text-left", g.count ? "cursor-pointer hover:bg-hover" : "text-muted-foreground", isOpen && "bg-hover")}
            >
              {g.count === 0 ? <span /> : isOpen ? <ChevronDownIcon className="size-4 text-muted-foreground" /> : <ChevronRightIcon className="size-4 text-muted-foreground" />}
              <span className="text-[0.9375rem] font-semibold">{g.label}</span>
              <span className="truncate text-sm font-medium">{g.name}</span>
              <span className="text-right text-[0.8125rem] text-muted-foreground">{g.count === 0 ? "No documents" : g.count === 1 ? "1 document" : `${g.count} documents`}</span>
            </button>
            {isOpen && (
              <ul className="border-t border-rule-soft">
                {(group ? group.clauses : [{ no: "", title: "Edit each document to choose the clauses it covers.", docs: unmapped }]).map((c, k) => (
                  <li key={c.no || "none"} className={cn("flex flex-col gap-2 px-5 py-3 pl-[72px] text-sm", k > 0 && "border-t border-rule-soft")}>
                    <span className="flex gap-3">
                      {c.no && <span className="w-14 shrink-0 font-medium">{c.no}</span>}
                      <span className="text-muted-foreground">{c.title}</span>
                    </span>
                    <ul className={cn("flex flex-col gap-1.5", c.no && "pl-[68px]")}>
                      {c.docs.map((d) => (
                        <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Link to={`/documents/${d.id}`} className="flex min-w-0 items-baseline gap-2 hover:underline">
                            <span className="text-[0.8125rem] font-medium text-primary">{d.id}</span>
                            <span className="truncate font-medium">{d.title}</span>
                          </Link>
                          <span className="text-xs text-muted-foreground">{d.type}, revision {d.rev}</span>
                          <ClassificationTag value={d.classification} />
                          <DocStage doc={d} />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </section>
  )
}
