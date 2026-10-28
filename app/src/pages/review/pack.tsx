import { useParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { PrinterIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { formatDate, formatPeriod, nowIso } from "@/lib/periods"
import { FIGURE_STATUS_LABEL, type InputFigure } from "@/lib/review-figures"
import { ORG } from "@/data/org"
import { ISO_EDITION } from "@/data/iso"
import { REVIEW_CLAUSE } from "@/data/reviews"
import type { ManagementReviewRecord, ReviewInput } from "@/data/types"
import { Button } from "@/components/ui/button"
import { useAuthorName } from "@/components/app/remarks"
import NotFound from "@/pages/not-found"
import { formatLabel, inputState, topicLabel, periodOf, shownFigure, useInputFigures, useReviewRights, useSupportingRows } from "./shared"

const ANALYSIS: [keyof NonNullable<ReviewInput["analysis"]>, string][] = [
  ["summary", "Performance summary"],
  ["observations", "Important observations"],
  ["attention", "Issues needing management attention"],
  ["recommendations", "Proposed recommendations"],
]

function PackInput({ review, input, live }: { review: ManagementReviewRecord; input: ReviewInput; live?: InputFigure }) {
  const { state } = useStore()
  const { seesSummary } = useReviewRights(review)
  const who = useAuthorName()
  const rows = useSupportingRows(review, input, live)
  const fig = shownFigure(review, input, live)
  const evals = state.reviewEvaluations.filter((e) => e.reviewId === review.id && e.ref === input.ref)
  return (
    <section className="flex break-inside-avoid-page flex-col gap-3 border-t border-foreground/20 pt-5" aria-label={`${input.ref} ${input.name}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.0625rem] font-semibold">
          {!input.item && <span className="mr-2 text-muted-foreground">{input.ref}</span>}
          {input.name}
        </h2>
        <span className="text-[0.8125rem] text-muted-foreground">
          {input.item ? topicLabel(input) : `Clause ${REVIEW_CLAUSE[input.ref]}`}, {inputState(input).label.toLowerCase()}
        </span>
      </div>
      {fig && !input.item &&
        (seesSummary ? (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <b className="text-base">{fig.status === "not-collected" ? "No data" : fig.value || "No figure"}</b> {fig.detail}
              <span className="text-muted-foreground"> ({fig.label.toLowerCase()} figure, {FIGURE_STATUS_LABEL[fig.status].toLowerCase()})</span>
            </p>
            {fig.method && <p className="text-[0.8125rem] text-muted-foreground">How it’s worked out: {fig.method}</p>}
          </div>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">The quality manager prepares the summary figure.</p>
        ))}
      {input.notApplicable ? (
        <p className="text-sm">Not applicable: {input.notApplicable}</p>
      ) : input.analysis && ANALYSIS.some(([k]) => input.analysis![k]?.trim()) ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2 print:grid-cols-2">
          {ANALYSIS.filter(([k]) => input.analysis![k]?.trim()).map(([k, label]) => (
            <div key={k}>
              <dt className="text-[0.8125rem] font-semibold">{label}</dt>
              <dd className="leading-relaxed">{input.analysis![k]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No analysis yet.</p>
      )}
      {input.preparedBy && (
        <p className="text-xs text-muted-foreground">
          Prepared by {who(input.preparedBy)}
          {input.draft ? ", draft waiting for the quality manager" : input.confirmedBy ? `, confirmed by ${input.confirmedBy}` : ""}
          {input.updatedAt ? `, ${formatDate(input.updatedAt.slice(0, 10))}` : ""}
        </p>
      )}
      {input.changedAfterPack && review.packSentOn && (
        <p className="text-xs font-medium text-soon">Changed after the pack was sent, on {formatDate(input.changedAfterPack.slice(0, 10))}.</p>
      )}
      {!input.frozen && live && live.missing.length > 0 && <p className="text-[0.8125rem] text-muted-foreground">No source in ThryveMS: {live.missing.join(" ")}</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[34rem] border-collapse text-left text-[0.8125rem] print:min-w-0">
          <caption className="pb-1 text-left text-[0.8125rem] font-semibold">Supporting records ({rows.length})</caption>
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Record</th>
              <th className="py-1.5 pr-3 font-medium">Status</th>
              <th className="py-1.5 pr-3 font-medium">Date</th>
              <th className="py-1.5 font-medium">Review status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={cn("border-b border-rule-soft align-top", r.attention && r.available && "font-medium")}>
                <td className="py-1.5 pr-3">
                  {r.available ? (
                    <>
                      <span className="mr-1.5 text-muted-foreground">{r.kind === "link" ? "Link" : r.id}</span>
                      {r.title}
                      {r.kind === "link" && <span className="block break-all text-xs text-muted-foreground">{r.url}</span>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">{r.id}, not available</span>
                  )}
                </td>
                <td className="py-1.5 pr-3">{r.available ? (r.status ?? "") : ""}</td>
                <td className="whitespace-nowrap py-1.5 pr-3">{r.date ? formatDate(r.date) : ""}</td>
                <td className="py-1.5">{r.check?.status ?? "Not reviewed"}{r.check?.notes ? `. ${r.check.notes}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {evals.length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-[0.8125rem] font-semibold">Evaluation by top management</span>
          {evals.map((e) => (
            <p key={e.id}>
              {who(e.by)}
              {e.status ? `, ${e.status.toLowerCase()}` : ""}: {e.comment}
              {e.clarification ? ` Asked: ${e.clarification.question}${e.clarification.answer ? ` Answer: ${e.clarification.answer}` : ""}` : ""}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * The review pack, built from the review's own data and laid out for printing. Saving it as a PDF
 * is done with the browser's print; ThryveMS doesn't generate or store a PDF.
 */
export default function ReviewPack() {
  const { id } = useParams()
  const { state, can, user } = useStore()
  const review = state.reviews.find((r) => r.id === id)
  const figures = useInputFigures(review)
  const { seesSummary } = useReviewRights(review)
  if (!review || !can("Management Review")) return <div className="mx-auto max-w-3xl p-6"><NotFound /></div>
  const period = periodOf(review)
  const status = review.lockedAt || review.recordedOn ? `Locked ${review.recordedOn ?? ""}: finalized figures` : review.packSentOn ? `Sent ${review.packSentOn}: figures as sent, records live` : "Not sent yet: live figures"
  const attention = review.inputs.flatMap((i) => (i.frozen ? [] : (figures[i.ref]?.attention ?? []).map((a) => `${i.ref}: ${a}`)))
  const now = new Date()

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-3 print:hidden">
        <Link to={`/management-review/${review.id}`} className="text-[0.8125rem] font-medium text-primary">
          Back to {review.id}
        </Link>
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">Your browser makes the PDF. ThryveMS doesn’t store one.</span>
          <Button onClick={() => window.print()}>
            <PrinterIcon /> Print or save as PDF
          </Button>
        </span>
      </div>
      <article className="mx-auto flex max-w-[880px] flex-col gap-6 bg-card px-4 py-8 sm:px-8 sm:py-10 print:max-w-none print:px-0 print:py-0">
        <header className="flex flex-col gap-2">
          <span className="text-[0.8125rem] text-muted-foreground">
            {ORG.name}, management review pack, clause 9.3 of {ISO_EDITION}
          </span>
          <h1 className="text-[1.75rem] font-semibold leading-tight">{review.title}</h1>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 print:grid-cols-2">
            {[
              ["Review", `${review.id}, ${review.kind === "Internal" ? "internal review" : formatLabel(review.format).toLowerCase()}`],
              [review.format === "Meeting" ? "Meeting" : "Review by", `${review.date}${review.place ? `, ${review.place}` : ""}`],
              ["Reporting period", formatPeriod(period)],
              ["Top management", review.reviewers.join(", ")],
              ["Also involved", [...review.others, ...(review.contributors ?? []).filter((c) => !review.others.includes(c))].join(", ") || "None"],
              ["Prepared by", review.preparedBy],
              ["Pack", status],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-32 shrink-0 text-muted-foreground sm:w-36">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </header>
        {attention.length > 0 && (
          <section className="flex flex-col gap-2 rounded-md border px-5 py-4 print:border-foreground/30" aria-label="Items requiring management attention">
            <h2 className="text-[0.9375rem] font-semibold">Items requiring management attention</h2>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm">
              {attention.slice(0, 30).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Facts from the records. The analysis and top management’s evaluation decide what they mean.</p>
          </section>
        )}
        {review.inputs.map((i) => (
          <PackInput key={i.ref} review={review} input={i} live={figures[i.ref]} />
        ))}
        <footer className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
          Made from ThryveMS on {formatDate(nowIso().slice(0, 10))} at {now.toTimeString().slice(0, 5)} for {user.name}. {seesSummary ? "" : "Summary figures are left out because your access doesn’t cover every process. "}Records you don’t have access to are left out. In this preview, figures and access checks are worked out in the browser; the real service works them out on the server.
        </footer>
      </article>
    </div>
  )
}
