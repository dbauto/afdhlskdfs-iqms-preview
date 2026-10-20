import * as React from "react"
import { useParams } from "react-router-dom"
import { CircleCheckIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { addMonths, formatDate, todayIso } from "@/lib/periods"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyFacts, MetaLine, PageHeader, RecordLayout } from "@/components/app/page"
import { RiskLevel } from "@/components/app/status"
import { NcStage } from "@/components/app/status"
import { RecordLink } from "@/components/app/record-link"
import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import NotFound from "@/pages/not-found"
import { RiskSheet } from "./register"
import { isLate } from "@/pages/review/shared"

/** One risk or opportunity: rating, treatment, reviews and the nonconformities that show it happened. */
export default function RiskDetail() {
  const { id } = useParams()
  const { state, can, update } = useStore()
  const r = state.risks.find((x) => x.id === id)
  const [edit, setEdit] = React.useState(false)
  if (!r || !can("Risks & Opportunities")) return <NotFound />
  const canEdit = can("Risks & Opportunities", "Add and edit")
  const ncs = state.ncs.filter((n) => n.risks?.includes(r.id))
  const actions = can("Management Review") ? state.reviewActions.filter((a) => a.linked === r.id || a.sourceRecords?.some((s) => s.id === r.id)) : []
  const overdue = !!r.late || (!!r.nextReviewDate && r.nextReviewDate < todayIso() && r.review !== "Archived")

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Risks & Opportunities", to: "/risks" }, { label: r.id }]}
        title={r.title}
        badge={overdue ? <Badge tone="overdue">Review overdue</Badge> : r.review === "Archived" ? <Badge tone="draft">Archived</Badge> : undefined}
        meta={<MetaLine parts={[r.id, r.kind, r.process, r.kind === "Risk" ? "Clause 6.1.2" : "Clause 6.1.3"]} />}
        actions={
          canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  const today = todayIso()
                  update("risks", r.id, { late: false, review: "In 12 months", reviewedDate: today, nextReviewDate: addMonths(today, 12) })
                  toast(`${r.id} reviewed`)
                }}
              >
                <CircleCheckIcon /> Mark reviewed today
              </Button>
              <Button variant="outline" onClick={() => setEdit(true)}>
                <PencilIcon /> Edit
              </Button>
            </>
          )
        }
      />
      <RemarkBanner kind="Risk" id={r.id} />
      <RecordLayout
        main={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Treatment</CardTitle>
              </CardHeader>
              <CardContent className="py-1">
                <KeyFacts
                  facts={[
                    { k: "Decision", v: r.treatment },
                    { k: "Action", v: r.action },
                    { k: "Owner", v: r.owner },
                    { k: "Effectiveness", v: <span className="text-muted-foreground">Not recorded. ThryveMS doesn’t keep effectiveness checks for risk actions yet.</span> },
                    ...(r.source ? [{ k: "Came from", v: r.source }] : []),
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Nonconformities linked to it</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">Clause 10.2.1 e</span>
              </CardHeader>
              <ul>
                {ncs.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">None. When a nonconformity shows this {r.kind.toLowerCase()} happened, link it from the nonconformity.</li>}
                {ncs.map((n, i) => (
                  <li key={n.id} className={cn("flex flex-wrap items-center justify-between gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    <span className="flex min-w-0 flex-col">
                      <RecordLink kind="nonconformity" id={n.id} className="self-start text-[0.8125rem]" />
                      <span className="text-sm">{n.title}</span>
                    </span>
                    <NcStage nc={n} />
                  </li>
                ))}
              </ul>
            </Card>
            {actions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Management review actions</CardTitle>
                </CardHeader>
                <ul>
                  {actions.map((a, i) => (
                    <li key={a.id} className={cn("flex flex-wrap items-center justify-between gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                      <span className="flex min-w-0 flex-col">
                        <RecordLink kind="review-action" id={a.id} className="self-start text-[0.8125rem]" />
                        <span className="text-sm">{a.text}</span>
                      </span>
                      <Badge tone={a.state === "Done" ? "done" : isLate(a) ? "overdue" : "progress"}>{a.state === "Done" ? "Done" : isLate(a) ? "Overdue" : "Open"}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <RemarksPanel target={{ kind: "Risk", id: r.id, label: `${r.id} ${r.title}`, to: `/risks/${r.id}`, area: "Risks & Opportunities" }} />
          </>
        }
        side={
          <Card>
            <CardHeader>
              <CardTitle>Rating and reviews</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "Rating", v: <RiskLevel risk={r} /> },
                  { k: "Likelihood", v: `${r.likelihood} of 5` },
                  { k: "Impact", v: `${r.impact} of 5` },
                  { k: "Last reviewed", v: r.reviewedDate ? formatDate(r.reviewedDate) : "Not recorded" },
                  { k: "Next review", v: <span className={cn(overdue && "font-semibold text-overdue")}>{r.nextReviewDate ? formatDate(r.nextReviewDate) : r.review}</span> },
                ]}
              />
            </CardContent>
          </Card>
        }
      />
      <RiskSheet open={edit} risk={r} onOpenChange={setEdit} />
    </>
  )
}
