import * as React from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/periods"
import { kindOfId } from "@/lib/record-links"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyFacts, MetaLine, PageHeader, RecordLayout } from "@/components/app/page"
import { EvidencePicker } from "@/components/app/form"
import { RecordLink } from "@/components/app/record-link"
import { useAuthorName } from "@/components/app/remarks"
import NotFound from "@/pages/not-found"
import { ActionState } from "./list"
import { useResolve, useReviewRights } from "./shared"

/** One action decided at a management review (clause 9.3.3), traceable to the input, records and evaluation it came from. */
export default function ReviewActionDetail() {
  const { id } = useParams()
  const { state, can, update, user } = useStore()
  const { canManage } = useReviewRights()
  const resolve = useResolve()
  const who = useAuthorName()
  const a = state.reviewActions.find((x) => x.id === id)
  const [editing, setEditing] = React.useState(false)
  const [evidence, setEvidence] = React.useState<string[]>(a?.completionEvidence ?? [])
  if (!a || !can("Management Review")) return <NotFound />
  const review = state.reviews.find((r) => r.id === a.reviewId)
  const input = review?.inputs.find((i) => i.ref === a.inputRef)
  const evaluation = state.reviewEvaluations.find((e) => e.id === a.evaluationId)
  const mayEdit = canManage || a.owner === user.name
  // still open after its own review: it is input a of the next one
  const carried = a.state === "Open" && state.reviews.find((r) => (r.stage === "Planned" || r.stage === "Preparing") && r.id !== a.reviewId)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Management Review", to: "/management-review" }, ...(review ? [{ label: review.id, to: `/management-review/${review.id}` }] : []), { label: a.id }]}
        title={a.text}
        badge={<ActionState a={a} />}
        meta={<MetaLine parts={[a.id, a.type, `From ${a.reviewId}`, a.inputRef ? `Input ${a.inputRef}` : ""]} />}
      />
      {carried && (
        <div className="rounded-md border border-info-border bg-highlight px-4 py-3 text-sm">
          Still open, so it is part of input a, actions from previous reviews, in <RecordLink kind="review" id={carried.id} newTab={false} />.
        </div>
      )}
      <RecordLayout
        main={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Action</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">Clause 9.3.3</span>
              </CardHeader>
              <CardContent className="py-1">
                <KeyFacts
                  facts={[
                    { k: "Decision type", v: a.type },
                    { k: "Owner", v: a.owner },
                    { k: "Due", v: a.dueDate ? formatDate(a.dueDate) : a.due },
                    { k: "Done", v: a.state === "Done" ? (a.doneDate ? formatDate(a.doneDate) : (a.doneOn ?? "Yes")) : "Not yet" },
                    { k: "Linked record", v: a.linked ? (resolve(kindOfId(a.linked), a.linked) ? <RecordLink kind={kindOfId(a.linked)} id={a.linked} newTab={false} /> : `${a.linked}, not available`) : "None" },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Evidence it was done</CardTitle>
                {mayEdit && !editing && (
                  <Button size="sm" variant="outline" onClick={() => { setEvidence(a.completionEvidence ?? []); setEditing(true) }}>
                    {a.completionEvidence?.length ? "Change" : "Link evidence"}
                  </Button>
                )}
              </CardHeader>
              {editing ? (
                <CardContent className="flex flex-col gap-3">
                  <EvidencePicker value={evidence} onChange={setEvidence} label="Completion evidence" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { update("reviewActions", a.id, { completionEvidence: evidence }); setEditing(false); toast("Completion evidence saved") }}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <ul>
                  {!a.completionEvidence?.length && <li className="px-5 py-4 text-sm text-muted-foreground">{a.state === "Done" ? "Marked done with no evidence linked. Link the record that shows it was done." : "Link the record that shows it was done, such as a training record or a revised procedure."}</li>}
                  {a.completionEvidence?.map((e, i) => (
                    <li key={e} className={cn("flex flex-col gap-0.5 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                      {resolve("evidence", e) ? <RecordLink kind="evidence" id={e} newTab={false} className="self-start text-[0.8125rem]" /> : <span className="text-[0.8125rem] text-muted-foreground">{e}, not available</span>}
                      <span className="text-sm">{resolve("evidence", e) ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        }
        side={
          <Card>
            <CardHeader>
              <CardTitle>Where it came from</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "Review", v: review ? <RecordLink kind="review" id={review.id} newTab={false} /> : `${a.reviewId}, not available` },
                  ...(review ? [{ k: "Reviewed", v: review.recordedOn ?? review.date }] : []),
                  { k: "Input", v: input ? `${input.ref} ${input.name}` : "Not tied to one input" },
                  {
                    k: "Based on",
                    v: a.sourceRecords?.length ? (
                      <span className="flex flex-col gap-0.5">
                        {a.sourceRecords.map((s) => (resolve(s.kind, s.id) ? <RecordLink key={s.id} kind={s.kind} id={s.id} newTab={false} className="self-start" /> : <span key={s.id} className="text-muted-foreground">{s.id}, not available</span>))}
                      </span>
                    ) : (
                      "No records linked"
                    ),
                  },
                  ...(evaluation ? [{ k: "Evaluation", v: `${who(evaluation.by)}${evaluation.status ? `, ${evaluation.status.toLowerCase()}` : ""}: ${evaluation.comment}` }] : []),
                ]}
              />
            </CardContent>
          </Card>
        }
      />
    </>
  )
}
