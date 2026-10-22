import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CheckIcon, XIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { recordHref } from "@/lib/record-links"
import type { InputFigure } from "@/lib/review-figures"
import { REVIEW_CLAUSE, REVIEW_GUIDE, hasAnalysis } from "@/data/reviews"
import type { ManagementReviewRecord, ReviewInput } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { inputState, shownFigure, useReviewRights } from "./shared"

/**
 * The review's inputs as topic cards for top management: target, where it stands, the trend, and whether it is
 * decided. A card opens a brief in the same format as Needs you. Everything comes from the review's own figures,
 * the input guide and the evaluations; nothing is generated.
 */

const DEFAULT_QUESTIONS = ["Is this a one-off, or the start of a trend?", "Does anything here need a decision, money or people from you?", "Is the target still the right one?"]

function decidedBy(state: ReturnType<typeof useStore>["state"], review: ManagementReviewRecord, ref: string) {
  return state.reviewEvaluations.filter((e) => e.reviewId === review.id && e.ref === ref)
}

export function TopicCards({ review, figures, onOpenWorkspace }: { review: ManagementReviewRecord; figures: Record<string, InputFigure | undefined>; onOpenWorkspace: (ref: string) => void }) {
  const { state } = useStore()
  const { seesSummary } = useReviewRights(review)
  const [open, setOpen] = React.useState<string | undefined>()
  const decided = review.inputs.filter((i) => i.notApplicable || decidedBy(state, review, i.ref).length > 0).length
  const current = review.inputs.find((i) => i.ref === open)
  return (
    <section className="flex flex-col gap-3" aria-labelledby="topics-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="topics-title" className="text-lg font-semibold">Topics for this review</h2>
        <span className="text-[0.8125rem] text-muted-foreground">The inputs ISO 9001 clause 9.3.2 asks for · {decided} of {review.inputs.length} evaluated</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {review.inputs.map((i) => {
          const live = figures[i.ref]
          const fig = shownFigure(review, i, live)
          const evals = decidedBy(state, review, i.ref)
          const done = !!i.notApplicable || evals.length > 0
          const nowTone = !fig || fig.status === "not-collected" ? "" : fig.warn ? "text-overdue" : "text-done"
          return (
            <button key={i.ref} type="button" onClick={() => setOpen(i.ref)} className="flex cursor-pointer flex-col gap-2 rounded-md border bg-card p-4 text-left hover:border-primary">
              <span className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[0.6875rem] font-medium text-muted-foreground">{REVIEW_CLAUSE[i.ref] ?? `9.3.2 ${i.ref}`}</span>
                  <span className="text-sm font-semibold leading-snug">{i.name}</span>
                </span>
                <Badge tone={done ? "done" : "draft"}>{i.notApplicable ? "Not applicable" : done ? "Evaluated" : "To decide"}</Badge>
              </span>
              {seesSummary && (
                <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[0.8125rem]">
                  <span className="text-muted-foreground">Target</span>
                  <span>{live?.target ?? "No target set"}</span>
                  <span className="text-muted-foreground">Now</span>
                  <span className={cn("font-semibold", nowTone)}>{!fig || fig.status === "not-collected" ? "No data" : `${fig.value} ${fig.detail}`}</span>
                  <span className="text-muted-foreground">Trend</span>
                  <span>{live?.trend ?? (live?.previous ? `Before: ${live.previous.value}` : "No earlier figure")}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      {current && <TopicBrief review={review} input={current} live={figures[current.ref]} onClose={() => setOpen(undefined)} onOpenWorkspace={(ref) => { setOpen(undefined); onOpenWorkspace(ref) }} />}
    </section>
  )
}

function TopicBrief({ review, input, live, onClose, onOpenWorkspace }: { review: ManagementReviewRecord; input: ReviewInput; live?: InputFigure; onClose: () => void; onOpenWorkspace: (ref: string) => void }) {
  const { state, settings } = useStore()
  const { seesSummary, canEvaluate } = useReviewRights(review)
  const guide = REVIEW_GUIDE[input.ref]
  const fig = shownFigure(review, input, live)
  const evals = decidedBy(state, review, input.ref)
  const questions = settings.briefs["review-topic"]?.questions.filter(Boolean) ?? DEFAULT_QUESTIONS
  const checks = [
    { text: "Figures worked out for the review period", ok: !!fig && fig.status !== "not-collected", note: fig ? `${fig.label} figure` : "No figure yet" },
    { text: "Every source the topic needs is connected", ok: !!live && live.missing.length === 0, note: live?.missing.length ? `No source yet: ${live.missing.join(", ")}` : "All connected" },
    { text: "The quality manager has prepared the analysis", ok: hasAnalysis(input) || !!input.notApplicable, note: inputState(input).label },
    { text: "Nothing in the records needs management’s attention", ok: !live?.attention.length, note: live?.attention.length ? `${live.attention.length} item${live.attention.length === 1 ? "" : "s"} below` : "Nothing flagged" },
  ]
  const missing = checks.filter((c) => !c.ok).length
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-[560px]">
        <SheetHeader>
          <Badge tone={missing ? "soon" : "done"} className="self-start">{missing ? `${missing} thing${missing === 1 ? "" : "s"} to look at` : "Ready"}</Badge>
          <SheetTitle>{input.name}</SheetTitle>
          <SheetDescription>{REVIEW_CLAUSE[input.ref] ?? `9.3.2 ${input.ref}`} · {guide?.what}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="flex flex-col gap-1 rounded-md bg-background p-3">
              <h3 className="text-[0.8125rem] font-semibold">Why this matters</h3>
              <p className="text-[0.8125rem] text-muted-foreground">{guide?.why}</p>
            </section>
            <section className="flex flex-col gap-1 rounded-md bg-background p-3">
              <h3 className="text-[0.8125rem] font-semibold">What good looks like</h3>
              <p className="text-[0.8125rem] text-muted-foreground">{live?.target ? `Target: ${live.target}.` : "No target is set for this topic."} {guide?.from}</p>
            </section>
          </div>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Where it stands</h3>
            {seesSummary && fig ? (
              <p className="text-sm">
                <b className={cn("text-base", fig.warn && "text-overdue")}>{fig.status === "not-collected" ? "No data" : fig.value}</b> {fig.detail}
                {live?.trend && <span className="block text-[0.8125rem] text-muted-foreground">{live.trend}</span>}
              </p>
            ) : (
              <p className="text-[0.8125rem] text-muted-foreground">The quality manager prepares the summary figure.</p>
            )}
            {live?.attention.length ? (
              <ul className="flex list-disc flex-col gap-0.5 pl-5 text-[0.8125rem]">
                {live.attention.slice(0, 6).map((a) => <li key={a}>{a}</li>)}
              </ul>
            ) : null}
            {live?.sources.length ? (
              <ul className="flex flex-col gap-1.5">
                {live.sources.slice(0, 5).map((s) => (
                  <li key={`${s.kind}-${s.id}`} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-[0.8125rem]">
                    <Link to={recordHref(s.kind, s.id)} className="min-w-0 truncate font-medium text-primary hover:underline">{s.id} {s.title}</Link>
                    <Badge tone={s.tone}>{s.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
            {input.analysis?.summary && <p className="rounded-md bg-background p-3 text-[0.8125rem]"><b>Quality manager’s summary.</b> {input.analysis.summary}</p>}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Already checked for you</h3>
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li key={c.text} className="flex gap-2 text-sm">
                  <span className={cn("mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full", c.ok ? "bg-done-tint text-done" : "bg-soon-tint text-soon")} aria-hidden="true">
                    {c.ok ? <CheckIcon className="size-3" /> : <XIcon className="size-3" />}
                  </span>
                  <span className="flex flex-col gap-0.5"><span>{c.text}<span className="sr-only">{c.ok ? ", passes" : ", not yet"}</span></span><span className="text-xs text-muted-foreground">{c.note}</span></span>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Still for you to judge</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">{questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </section>
          {evals.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold">Evaluations so far</h3>
              <ul className="flex flex-col gap-1 text-[0.8125rem]">
                {evals.map((e) => <li key={e.id}><b>{e.by}</b>{e.status ? ` · ${e.status}` : ""}: {e.comment}</li>)}
              </ul>
            </section>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={() => onOpenWorkspace(input.ref)}>{canEvaluate ? "Evaluate in the workspace" : "Open in the workspace"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
