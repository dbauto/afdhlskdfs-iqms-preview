import { useParams } from "react-router-dom"

import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/periods"
import { kindOfId } from "@/lib/record-links"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyFacts, MetaLine, PageHeader, RecordLayout } from "@/components/app/page"
import { RecordLink } from "@/components/app/record-link"
import NotFound from "@/pages/not-found"
import { ActionState } from "./list"

/** One action decided at a management review (clause 9.3.3), tracked until it's done. */
export default function ReviewActionDetail() {
  const { id } = useParams()
  const { state, can } = useStore()
  const a = state.reviewActions.find((x) => x.id === id)
  if (!a || !can("Management Review")) return <NotFound />
  const review = state.reviews.find((r) => r.id === a.reviewId)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Management Review", to: "/management-review" }, ...(review ? [{ label: review.id, to: `/management-review/${review.id}` }] : []), { label: a.id }]}
        title={a.text}
        badge={<ActionState a={a} />}
        meta={<MetaLine parts={[a.id, a.type, `From ${a.reviewId}`]} />}
      />
      <RecordLayout
        main={
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
                  { k: "Linked record", v: a.linked ? <RecordLink kind={kindOfId(a.linked)} id={a.linked} newTab={false} /> : "None" },
                ]}
              />
            </CardContent>
          </Card>
        }
        side={
          <Card>
            <CardHeader>
              <CardTitle>From the review</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "Review", v: review ? <RecordLink kind="review" id={review.id} newTab={false} /> : `${a.reviewId}, not available` },
                  ...(review ? [{ k: "Title", v: review.title }, { k: "Date", v: review.date }] : []),
                ]}
              />
            </CardContent>
          </Card>
        }
      />
    </>
  )
}
