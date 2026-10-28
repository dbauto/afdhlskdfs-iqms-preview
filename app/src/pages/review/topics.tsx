import * as React from "react"
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { InputFigure } from "@/lib/review-figures"
import { hasAnalysis } from "@/data/reviews"
import type { ManagementReviewRecord, ReviewInput } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { inputState, periodOf, shownFigure, topicLabel, useReviewRights } from "./shared"
import { TopicSource } from "./items"
import { formatDate, inPeriod } from "@/lib/periods"
import { RecordLink } from "@/components/app/record-link"
import { InputWorkspace } from "./workspace"

/**
 * The review's inputs as topic cards: target, where it stands, the trend, and whether it is evaluated. A card
 * opens the topic in a centred pop-up: the checks already done, what is left to judge, then the full workspace
 * (figures, records, analysis, evaluation, decisions). Previous and Next move through the topics without closing.
 */

const DEFAULT_QUESTIONS = ["Is this a one-off, or the start of a trend?", "Does anything here need a decision, money or people from you?", "Is the target still the right one?"]

function decidedBy(state: ReturnType<typeof useStore>["state"], review: ManagementReviewRecord, ref: string) {
  return state.reviewEvaluations.filter((e) => e.reviewId === review.id && e.ref === ref)
}

export function TopicCards({ review, figures, selected, onOpen }: { review: ManagementReviewRecord; figures: Record<string, InputFigure | undefined>; selected?: string; onOpen: (ref: string) => void }) {
  const { state } = useStore()
  const { seesSummary } = useReviewRights(review)
  const decided = review.inputs.filter((i) => i.notApplicable || decidedBy(state, review, i.ref).length > 0).length
  return (
    <section className="flex flex-col gap-3" aria-labelledby="topics-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="topics-title" className="text-lg font-semibold">Topics for this review</h2>
        <span className="text-[0.8125rem] text-muted-foreground">Open a topic to prepare or evaluate it · {decided} of {review.inputs.length} evaluated</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {review.inputs.map((i) => {
          const live = figures[i.ref]
          const fig = shownFigure(review, i, live)
          const done = !!i.notApplicable || decidedBy(state, review, i.ref).length > 0
          const prep = inputState(i)
          const nowTone = !fig || fig.status === "not-collected" ? "" : fig.warn ? "text-overdue" : "text-done"
          return (
            <button key={i.ref} type="button" aria-pressed={selected === i.ref} onClick={() => onOpen(i.ref)} className="flex cursor-pointer flex-col gap-2 rounded-md border bg-card p-4 text-left hover:border-primary">
              <span className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[0.6875rem] font-medium text-muted-foreground">{topicLabel(i)}</span>
                  <span className="text-sm font-semibold leading-snug">{i.name}</span>
                </span>
                <Badge tone={done ? "done" : "draft"}>{i.notApplicable ? "Not applicable" : done ? "Evaluated" : "To decide"}</Badge>
              </span>
              {i.item && (
                <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[0.8125rem]">
                  <span className="text-muted-foreground">Added by</span>
                  <span>{i.item.addedBy}</span>
                  {i.item.why && (
                    <>
                      <span className="text-muted-foreground">Why</span>
                      <span className="line-clamp-2">{i.item.why}</span>
                    </>
                  )}
                </span>
              )}
              {!i.item && seesSummary && (
                <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[0.8125rem]">
                  <span className="text-muted-foreground">Target</span>
                  <span>{live?.target ?? "No target set"}</span>
                  <span className="text-muted-foreground">Now</span>
                  <span className={cn("font-semibold", nowTone)}>{!fig || fig.status === "not-collected" ? "No data" : `${fig.value} ${fig.detail}`}</span>
                  <span className="text-muted-foreground">Trend</span>
                  <span>{live?.trend ?? (live?.previous ? `Before: ${live.previous.value}` : "No earlier figure")}</span>
                </span>
              )}
              <span className="mt-auto flex items-center justify-between gap-2 border-t border-rule-soft pt-2 text-xs text-muted-foreground">
                <span>Preparation: {prep.label}</span>
                <span className="font-medium text-primary">Open</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** The topic as a centred pop-up: checks done for you, what's left to judge, then the full workspace. */
export function TopicDialog({ review, input, figures, onMove, onClose, onDirty }: { review: ManagementReviewRecord; input: ReviewInput; figures: Record<string, InputFigure | undefined>; onMove: (ref: string) => void; onClose: () => void; onDirty: (d: boolean) => void }) {
  const { state, settings } = useStore()
  const live = figures[input.ref]
  const fig = shownFigure(review, input, live)
  const evals = decidedBy(state, review, input.ref)
  const questions = settings.briefs["review-topic"]?.questions.filter(Boolean) ?? DEFAULT_QUESTIONS
  const k = review.inputs.findIndex((i) => i.ref === input.ref)
  const prev = review.inputs[k - 1]
  const next = review.inputs[k + 1]
  const checks = input.item ? [
    { text: input.item.type === "Link" ? "The link opens a full https:// address" : input.item.type === "Own topic" ? "The topic is described" : "The record is linked", ok: input.item.type === "Own topic" ? !!(input.item.why || hasAnalysis(input)) : !!(input.item.url || input.item.recordId), note: input.item.type === "Own topic" ? (input.item.why ? "Described" : "Add why top management wants to look at it") : (input.item.recordId ?? "Link") },
    { text: "The preparer has prepared the analysis", ok: hasAnalysis(input) || !!input.notApplicable, note: inputState(input).label },
  ] : [
    { text: "Figures worked out for the review period", ok: !!fig && fig.status !== "not-collected", note: fig ? `${fig.label} figure` : "No figure yet" },
    { text: "Every source the topic needs is connected", ok: !!live && live.missing.length === 0, note: live?.missing.length ? `No source yet: ${live.missing.join(", ")}` : "All connected" },
    { text: "The quality manager has prepared the analysis", ok: hasAnalysis(input) || !!input.notApplicable, note: inputState(input).label },
    { text: "Nothing in the records needs management’s attention", ok: !live?.attention.length, note: live?.attention.length ? `${live.attention.length} item${live.attention.length === 1 ? "" : "s"} flagged` : "Nothing flagged" },
  ]
  const missing = checks.filter((c) => !c.ok).length
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1000px] gap-4 bg-background">
        <DialogHeader>
          <span className="flex flex-wrap items-center gap-2 pr-8">
            <span className="text-xs font-medium text-muted-foreground">Topic {k + 1} of {review.inputs.length} · {topicLabel(input)}</span>
            <Badge tone={missing ? "soon" : "done"}>{missing ? `${missing} thing${missing === 1 ? "" : "s"} to look at` : "Ready"}</Badge>
            <Badge tone={input.notApplicable || evals.length ? "done" : "draft"}>{input.notApplicable ? "Not applicable" : evals.length ? "Evaluated" : "To decide"}</Badge>
          </span>
          <DialogTitle>{input.name}</DialogTitle>
          <DialogDescription>Read what’s already checked, judge what’s left, then add your evaluation or a decision below.</DialogDescription>
        </DialogHeader>
        {input.item && (
          <section className="flex flex-col gap-1.5 rounded-md border bg-card p-4 text-sm">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">What top management asked</h3>
              <TopicSource input={input} className="text-[0.8125rem]" />
            </span>
            <p className="leading-relaxed">{input.item.why || review.question || "No reason given."}</p>
            <span className="text-xs text-muted-foreground">Added by {input.item.addedBy} · {formatDate(input.item.addedOn)}</span>
          </section>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <section className="flex flex-col gap-2 rounded-md border bg-card p-4">
            <h3 className="text-sm font-semibold">Already checked for you</h3>
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li key={c.text} className="flex gap-2 text-[0.8125rem]">
                  <span className={cn("mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full", c.ok ? "bg-done-tint text-done" : "bg-soon-tint text-soon")} aria-hidden="true">
                    {c.ok ? <CheckIcon className="size-3" /> : <XIcon className="size-3" />}
                  </span>
                  <span className="flex flex-col gap-0.5"><span>{c.text}<span className="sr-only">{c.ok ? ", passes" : ", not yet"}</span></span><span className="text-xs text-muted-foreground">{c.note}</span></span>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2 rounded-md border bg-card p-4">
            <h3 className="text-sm font-semibold">Still for you to judge</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[0.8125rem] text-muted-foreground">{questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </section>
        </div>
        {input.ref === "b" && <DocumentChanges review={review} />}
        <div className="min-w-0">
          <InputWorkspace review={review} input={input} live={live} onDirty={onDirty} />
        </div>
        <div className="sticky -bottom-6 -mx-6 -mb-6 flex items-center justify-between gap-2 border-t bg-card px-6 py-3">
          <Button variant="outline" size="sm" className="min-w-0 max-w-[42%]" disabled={!prev} onClick={() => prev && onMove(prev.ref)}><ChevronLeftIcon /> <span className="truncate sm:hidden">Previous</span><span className="hidden truncate sm:inline">{prev ? prev.name : "Previous"}</span></Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          <Button variant="outline" size="sm" className="min-w-0 max-w-[42%]" disabled={!next} onClick={() => next && onMove(next.ref)}><span className="truncate sm:hidden">Next</span><span className="hidden truncate sm:inline">{next ? next.name : "Next"}</span> <ChevronRightIcon /></Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Documents released or being revised in the review period, so changes to the QMS are seen without anyone listing them. */
function DocumentChanges({ review }: { review: ManagementReviewRecord }) {
  const { state } = useStore()
  const period = periodOf(review)
  const released = state.documents.filter((d) => inPeriod(d.publishedOn, period) || (d.events ?? []).some((e) => e.kind === "Published" && inPeriod(e.on, period)))
  const revising = state.documents.filter((d) => !["Published", "Archived"].includes(d.stage))
  const rows = [...released.map((d) => ({ d, what: "Released in the period" })), ...revising.filter((d) => !released.includes(d)).map((d) => ({ d, what: `Being revised · ${d.stage.toLowerCase()}` }))]
  return (
    <section className="flex flex-col gap-2 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Documents released or being revised</h3>
        <span className="text-xs text-muted-foreground">{released.length} released in the period · {revising.length} being revised now · found by ThryveMS</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[0.8125rem] text-muted-foreground">No document changes in the period.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.slice(0, 8).map(({ d, what }) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-[0.8125rem]">
              <span className="min-w-0"><RecordLink kind="document" id={d.id} className="text-[0.8125rem]" /> {d.title} <span className="text-muted-foreground">· {d.type}, revision {d.rev}</span></span>
              <span className="text-xs text-muted-foreground">{what}</span>
            </li>
          ))}
          {rows.length > 8 && <li className="text-xs text-muted-foreground">And {rows.length - 8} more in Documents.</li>}
        </ul>
      )}
    </section>
  )
}
