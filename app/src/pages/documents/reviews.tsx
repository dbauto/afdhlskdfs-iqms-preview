import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"

import { useStore } from "@/lib/store"
import type { DocRecord } from "@/data/types"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/app/data-table"
import { PageHeader, ViewChips } from "@/components/app/page"
import { DocStage } from "@/components/app/status"

type View = "mine" | "review" | "periodic"

function stepPeople(d: DocRecord) {
  if (d.stage === "Technical review") return d.reviewers
  if (d.stage === "Approval") return d.approvers
  if (d.stage === "Changes requested" || d.stage === "Draft") return [d.owner]
  if (d.stage === "Ready to publish") return ["Nina Flores"]
  return [d.owner]
}

export default function Reviews() {
  const { state, user } = useStore()
  const [view, setView] = React.useState<View>("mine")
  const inReview = state.documents.filter((d) => ["Technical review", "Changes requested", "Approval", "Ready to publish"].includes(d.stage))
  const mine = inReview.filter((d) => stepPeople(d).includes(user.name))
  const periodic = state.documents.filter((d) => d.stage === "Published" && d.reviewOverdue)
  const rows = view === "mine" ? mine : view === "review" ? inReview : periodic

  const columns: Column<DocRecord>[] = [
    {
      id: "doc",
      header: "Document",
      cell: (d) => (
        <Link to={`/documents/${d.id}`} className="flex flex-col gap-0.5">
          <span className="text-[0.8125rem] font-medium text-primary">
            {d.id}, rev {d.rev}
          </span>
          <span className="font-medium">{d.title}</span>
        </Link>
      ),
    },
    { id: "stage", header: "Stage", cell: (d) => <DocStage doc={d} />, className: "min-w-[180px]" },
    {
      id: "with",
      header: "Waiting on",
      cell: (d) => {
        const people = view === "periodic" ? [d.owner] : stepPeople(d)
        return (
          <span className="flex flex-col gap-1.5">
            {people.map((p) => (
              <span key={p} className="flex items-center gap-2 text-[0.8125rem]">
                <Avatar name={p} size={22} />
                {p === user.name ? <span className="font-semibold">You</span> : p}
              </span>
            ))}
            {people.length > 1 && d.stage === "Approval" && <span className="text-xs text-muted-foreground">{d.approvalMode}</span>}
          </span>
        )
      },
    },
    { id: "process", header: "Process", cell: (d) => <span className="text-muted-foreground">{d.process}</span> },
    {
      id: "due",
      header: view === "periodic" ? "Review was due" : "Due",
      cell: (d) =>
        view === "periodic" ? <span className="font-semibold text-overdue">{d.nextReview}</span> : d.lateBy ? <Badge tone="overdue">{d.lateBy}</Badge> : <span className="text-muted-foreground">Within 5 days</span>,
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Documents", to: "/documents" }, { label: "Reviews" }]}
        title="Reviews"
        description="Revisions moving through technical review and approval, and published documents due their periodic review. A step can have several people."
      />
      <ViewChips
        value={view}
        onChange={setView}
        views={[
          { id: "mine", label: "Waiting on you", count: mine.length },
          { id: "review", label: "All in review", count: inReview.length },
          { id: "periodic", label: "Periodic review overdue", count: periodic.length, warn: true },
        ]}
      />
      <DataTable
        label="Reviews"
        rows={rows}
        columns={columns}
        getRowId={(d) => d.id}
        minWidth={920}
        empty={{ title: "Nothing is waiting on you", body: "When a revision reaches your step, it shows here and on the Overview." }}
      />
    </>
  )
}
