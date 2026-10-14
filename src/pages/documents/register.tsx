import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { FilePlus2Icon, FileTextIcon, PlusIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { isLocked, type DocRecord } from "@/data/types"
import { DOC_TYPES } from "@/data/records"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/input"
import { DataTable, type Column } from "@/components/app/data-table"
import { PageHeader, ViewChips } from "@/components/app/page"
import { ClassificationTag, DocStage } from "@/components/app/status"
import { RowActions, type RemoveKind } from "@/components/app/record-actions"
import { ProcessOptions } from "@/components/app/form"
import { DocSheet } from "./doc-sheet"

type View = "all" | "published" | "review" | "overdue" | "drafts" | "confidential"
const IN_REVIEW = ["Technical review", "Changes requested", "Approval", "Ready to publish"]

export function removeKindFor(d: DocRecord): RemoveKind {
  if (d.stage === "Draft") return "delete"
  if (d.stage === "Published") return "archive"
  return "withdraw"
}

export default function Documents() {
  const { state, update, remove, can } = useStore()
  const navigate = useNavigate()
  const [view, setView] = React.useState<View>("all")
  const [process, setProcess] = React.useState("")
  const [type, setType] = React.useState("")
  const [q, setQ] = React.useState("")
  const [sheet, setSheet] = React.useState<{ open: boolean; doc?: DocRecord }>({ open: false })

  const docs = state.documents.filter((d) => d.stage !== "Archived")
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
          <span className="text-[13px] font-medium text-primary">{d.id}</span>
          <span className="truncate font-medium text-foreground">{d.title}</span>
        </Link>
      ),
    },
    { id: "process", header: "Process", cell: (d) => <span className="whitespace-nowrap text-muted-foreground">{d.process}</span> },
    { id: "type", header: "Type", cell: (d) => d.type },
    { id: "rev", header: "Rev", cell: (d) => d.rev },
    { id: "cls", header: "Classification", cell: (d) => <ClassificationTag value={d.classification} /> },
    { id: "stage", header: "Stage", cell: (d) => <DocStage doc={d} />, className: "min-w-[170px]" },
    { id: "owner", header: "Owner", cell: (d) => <span className="whitespace-nowrap">{d.owner}</span> },
    {
      id: "next",
      header: "Next review",
      cell: (d) => <span className={d.reviewOverdue ? "whitespace-nowrap font-semibold text-overdue" : "whitespace-nowrap"}>{d.nextReview}</span>,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12",
      cell: (d) => (
        <RowActions
          name={d.id}
          onOpen={() => navigate(`/documents/${d.id}`)}
          onEdit={canAdd ? () => setSheet({ open: true, doc: d }) : undefined}
          extra={
            canAdd && d.stage === "Published"
              ? [{ label: "Start new revision", icon: <FilePlus2Icon />, onSelect: () => { update("documents", d.id, { stage: "Draft", rev: String(parseInt(d.rev, 10) + 1).padStart(2, "0") }); toast(`Revision ${String(parseInt(d.rev, 10) + 1).padStart(2, "0")} of ${d.id} started`, { description: `Revision ${d.rev} stays in force until it is published.` }) } }]
              : undefined
          }
          removeKind={canAdd ? removeKindFor(d) : undefined}
          onRemove={() => {
            const k = removeKindFor(d)
            if (k === "delete") remove("documents", d.id)
            else update("documents", d.id, { stage: "Archived" })
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
        <Link to="/documents/reviews" className="text-[13px] font-medium text-primary">
          Open reviews
        </Link>
      </div>

      <DataTable
        label="Document register"
        rows={rows}
        columns={columns}
        getRowId={(d) => d.id}
        minWidth={1240}
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
            <NativeSelect aria-label="Process" value={process} onChange={(e) => setProcess(e.target.value)} className="h-9 w-auto min-w-44 text-[13px]">
              <option value="">All processes</option>
              <ProcessOptions />
            </NativeSelect>
            <NativeSelect aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-auto min-w-36 text-[13px]">
              <option value="">All types</option>
              {DOC_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </NativeSelect>
            <span className="ml-auto flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <FileTextIcon className="size-4" /> {rows.length} shown
            </span>
          </>
        }
      />

      <DocSheet open={sheet.open} doc={sheet.doc} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} />
    </>
  )
}
