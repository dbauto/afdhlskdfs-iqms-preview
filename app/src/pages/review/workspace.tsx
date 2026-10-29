/**
 * The input workspace: everything about one management review input in six sections,
 * from what it means to the decisions it led to (plan v3 §22).
 */
import * as React from "react"
import { CheckIcon, ChevronDownIcon, CircleAlertIcon, MessageSquareIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { formatDate, formatPeriod, nowIso } from "@/lib/periods"
import { FIGURE_STATUS_LABEL, type InputFigure } from "@/lib/review-figures"
import { ISO_EDITION } from "@/data/iso"
import { emptyAnalysis, hasAnalysis, REVIEW_CLAUSE, REVIEW_GUIDE } from "@/data/reviews"
import { EVALUATION_STATUSES, type EvaluationStatus, type ManagementReviewRecord, type ProposedDecision, type ReviewActionType, type ReviewAnalysis, type ReviewEvaluation, type ReviewInput, type ReviewRecordCheck } from "@/data/types"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { KeyFacts } from "@/components/app/page"
import { Field, PeopleOptions } from "@/components/app/form"
import { useAuthorName } from "@/components/app/remarks"
import { RecordLink } from "@/components/app/record-link"
import { SupportingRecords, type NewReference, type SupportingRow } from "@/components/app/supporting-records"
import { inputState, isLate, periodOf, reviewPeople, shownFigure, useResolve, useReviewRights, useSupportingRows } from "./shared"
import { allows, peopleAllowed, personAllowed } from "@/lib/permissions"

const LABEL_TONE: Record<string, BadgeTone> = { Live: "progress", Prepared: "soon", Finalized: "done" }
const EVAL_TONE: Record<EvaluationStatus, BadgeTone> = { Satisfactory: "done", "Needs improvement": "soon", "Requires management action": "overdue" }
const ANALYSIS_FIELDS: [keyof ReviewAnalysis, string, string][] = [
  ["summary", "Performance summary", "What the figures and records show, in a sentence or two."],
  ["observations", "Important observations", "Patterns, changes or anything unusual."],
  ["attention", "Issues needing management attention", "What top management needs to decide or know."],
  ["recommendations", "Proposed recommendations", "What you suggest. Top management decides."],
]
const stamp = (iso?: string) => (iso ? `${formatDate(iso.slice(0, 10))}${iso.length > 10 ? `, ${iso.slice(11, 16)}` : ""}` : "")

function Section({ title, aside, children, id }: { title: string; aside?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {aside}
      </CardHeader>
      {children}
    </Card>
  )
}

/* 1. About this input */
function About({ input }: { input: ReviewInput }) {
  const g = REVIEW_GUIDE[input.ref]
  const [open, setOpen] = React.useState(false)
  if (!g) return null
  return (
    <div className="rounded-md border bg-card">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full cursor-pointer items-start gap-3 px-5 py-3.5 text-left">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[0.8125rem] font-semibold">About this input</span>
          <span className="text-sm leading-snug text-muted-foreground">{g.what}</span>
        </span>
        <ChevronDownIcon className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <dl className="grid gap-3 border-t border-rule-soft px-5 py-3.5 text-sm leading-snug sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[0.8125rem] font-semibold">Why management reviews it</dt>
            <dd className="text-muted-foreground">{g.why}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[0.8125rem] font-semibold">Where the data comes from</dt>
            <dd className="text-muted-foreground">{g.from}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

/* 2. Performance summary */
function Summary({ review, input, live }: { review: ManagementReviewRecord; input: ReviewInput; live?: InputFigure }) {
  const { seesSummary } = useReviewRights(review)
  const fig = shownFigure(review, input, live)
  const period = input.frozen?.period ?? periodOf(review)
  // topics added by hand have no worked-out figure; their record or link is shown above
  if (!fig || input.item) return null
  if (!seesSummary)
    return (
      <Section title="Performance summary" aside={<Badge tone={LABEL_TONE[fig.label]}>{fig.label}</Badge>}>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>The quality manager prepares the summary figure.</p>
          <p className="text-[0.8125rem] text-muted-foreground">It counts records from every process. Below are the supporting records you have access to, for {formatPeriod(period)}.</p>
        </CardContent>
      </Section>
    )
  const changed = fig.label === "Prepared" && live && (live.value !== fig.value || live.detail !== fig.detail)
  return (
    <Section title="Performance summary" aside={<Badge tone={LABEL_TONE[fig.label]}>{fig.label}</Badge>}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn("text-[1.75rem] font-semibold leading-none tracking-[-0.02em]", fig.status === "no-source" || fig.status === "not-collected" ? "text-muted-foreground" : fig.warn && "text-overdue")}>{fig.status === "not-collected" ? "No data" : fig.value || "No figure"}</span>
          <span className="text-sm text-muted-foreground">{fig.detail}</span>
        </div>
        {fig.label === "Finalized" && <p className="text-[0.8125rem] text-muted-foreground">As sent to top management and frozen when the review was locked. Later changes in ThryveMS don’t change it.{input.frozen?.liveAtLock ? ` When it was locked, the live figure was ${input.frozen.liveAtLock.value}, ${input.frozen.liveAtLock.detail}.` : ""}</p>}
        {fig.label === "Prepared" && <p className="text-[0.8125rem] text-muted-foreground">As sent in the review pack{review.packSnapshot ? ` on ${formatDate(review.packSnapshot.sentAt)}` : ""}.{changed ? ` The live figure is now ${live!.value}, ${live!.detail}.` : " The live figure hasn’t changed since."}</p>}
        <KeyFacts
          className="[&>div]:grid-cols-[150px_minmax(0,1fr)]"
          facts={[
            { k: "ISO clause", v: `${REVIEW_CLAUSE[input.ref] ?? "9.3.2"}, ${ISO_EDITION}` },
            { k: "Reporting period", v: formatPeriod(period) },
            ...(fig.label !== "Finalized" && live?.target ? [{ k: "Target", v: live.target }] : []),
            ...(fig.label !== "Finalized" && live?.previous ? [{ k: "Previous period", v: live.previous.status === "not-collected" ? "No data" : live.previous.status === "no-source" ? "No figure" : `${live.previous.value}, ${live.previous.detail}` }] : []),
            ...(fig.label !== "Finalized" && live ? [{ k: "Trend", v: live.trend ?? "Not enough history to compare" }] : []),
            { k: "How it’s worked out", v: fig.method ?? "Not recorded" },
            ...(live && fig.label !== "Finalized" ? [{ k: "Data source", v: live.dataSource }] : []),
            { k: "Last updated", v: fig.computedAt ? stamp(fig.computedAt) : "Not recorded" },
            { k: "Data availability", v: FIGURE_STATUS_LABEL[fig.status] },
          ]}
        />
        {fig.label !== "Finalized" && live && live.attention.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-md border border-soon-border bg-soon-tint px-4 py-3">
            <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold">
              <CircleAlertIcon className="size-3.5" /> From the records
            </span>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-[0.8125rem] leading-snug">
              {live.attention.slice(0, 8).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <span className="text-xs text-muted-foreground">These are facts from the records, not conclusions. The analysis and evaluation decide what they mean.</span>
          </div>
        )}
      </CardContent>
    </Section>
  )
}

/* 3. Supporting records */
function Supporting({ review, input, live, locked }: { review: ManagementReviewRecord; input: ReviewInput; live?: InputFigure; locked: boolean }) {
  const { state, add, update, remove, user } = useStore()
  const { canDraft, isReviewer } = useReviewRights(review)
  const rows = useSupportingRows(review, input, live)
  const resolve = useResolve()
  const who = useAuthorName()
  const canCheck = !locked && (canDraft || isReviewer || input.handedTo === user.name)

  function onCheck(row: SupportingRow, patch: { status: ReviewRecordCheck["status"]; notes?: string; evidenceRef?: string }) {
    const existing = state.reviewRecordChecks.find((c) => c.reviewId === review.id && c.ref === input.ref && (row.addedBy === "auto" ? c.kind === row.kind && c.recordId === row.id : c.id === row.key))
    const fields = { ...patch, by: user.name, at: nowIso() }
    if (existing) update("reviewRecordChecks", existing.id, fields)
    else add("reviewRecordChecks", { id: nextId(state.reviewRecordChecks.map((c) => c.id), "RC-"), reviewId: review.id, ref: input.ref, kind: row.kind, recordId: row.id, url: row.url, title: row.title, addedBy: "auto", ...fields })
    toast(`${row.id ?? row.title}: ${patch.status}`)
  }
  function onAdd(r: NewReference) {
    add("reviewRecordChecks", { id: nextId(state.reviewRecordChecks.map((c) => c.id), "RC-"), reviewId: review.id, ref: input.ref, kind: r.kind, recordId: r.recordId, url: r.url, title: r.title, addedBy: user.name, status: "Not reviewed" })
    toast("Reference added", { description: r.title })
  }

  return (
    <Section title="Supporting records" aside={<span className="text-[0.8125rem] text-muted-foreground">Open in a new tab</span>}>
      <SupportingRecords
        rows={rows}
        missing={input.frozen ? [] : (live?.missing ?? [])}
        canCheck={canCheck}
        canAddReference={canCheck}
        onCheck={onCheck}
        onAddReference={onAdd}
        onRemoveReference={(row) => { remove("reviewRecordChecks", row.key); toast("Reference removed") }}
        resolve={(k, id) => resolve(k, id)}
        who={who}
        emptyText={input.frozen ? "No source records were kept with this figure." : "No records were found for this input in the reporting period. Add a reference if the information is kept elsewhere."}
      />
    </Section>
  )
}

/* 4. Analysis for top management */
function Analysis({ review, input, locked, onDirty }: { review: ManagementReviewRecord; input: ReviewInput; locked: boolean; onDirty: (dirty: boolean) => void }) {
  const { update, user, role, notify } = useStore()
  const { canManage, canDraft } = useReviewRights(review)
  const who = useAuthorName()
  const saved = input.analysis ?? emptyAnalysis()
  const [form, setForm] = React.useState<ReviewAnalysis>(saved)
  const mayWrite = !locked && !input.notApplicable && (canDraft || input.handedTo === user.name)
  const [editing, setEditing] = React.useState(mayWrite && !hasAnalysis(input))
  const [hand, setHand] = React.useState(false)
  const { state } = useStore()
  const allowed = reviewPeople(state)
  const [handTo, setHandTo] = React.useState(input.handedTo ?? allowed.find((n) => n !== review.preparedBy) ?? "")
  const [na, setNa] = React.useState(false)
  const [naWhy, setNaWhy] = React.useState("")
  const dirty = editing && ANALYSIS_FIELDS.some(([k]) => (form[k] ?? "").trim() !== (saved[k] ?? "").trim())
  React.useEffect(() => onDirty(dirty), [dirty])
  React.useEffect(() => {
    setForm(input.analysis ?? emptyAnalysis())
    setEditing(mayWrite && !hasAnalysis(input))
  }, [input.ref, review.id])

  // after the pack is sent, a change is flagged and top management is told, so evaluations aren't of text that has gone
  const afterPack = !!review.packSentOn && review.stage === "Preparing"
  const setInput = (patch: Partial<ReviewInput>) => {
    const flagged = afterPack && ("analysis" in patch || "notApplicable" in patch) ? { changedAfterPack: nowIso() } : {}
    update("reviews", review.id, { ...(review.stage === "Planned" ? { stage: "Preparing" as const } : {}), inputs: review.inputs.map((x) => (x.ref === input.ref ? { ...x, ...patch, ...flagged } : x)) })
    if (afterPack && ("analysis" in patch || "notApplicable" in patch)) notify(review.reviewers, { kind: "Comment", title: `${input.ref} ${input.name} changed after the pack was sent`, body: `${user.name} updated it in ${review.id}. Read it again before you evaluate or sign off.`, href: `/management-review/${review.id}` })
  }
  const st = inputState(input)

  function save() {
    const draft = allows(role, "remarks.consultant")
    const clean = Object.fromEntries(ANALYSIS_FIELDS.map(([k]) => [k, (form[k] ?? "").trim()])) as unknown as ReviewAnalysis
    setInput({ analysis: clean, preparedBy: user.name, updatedAt: nowIso(), draft, confirmedBy: undefined })
    const href = `/management-review/${review.id}`
    if (draft) notify([review.preparedBy], { kind: "Waiting on you", title: `Confirm the consultant’s analysis of ${input.ref} ${input.name}`, body: review.id, href })
    else if (input.handedTo === user.name) notify([review.preparedBy], { kind: "Comment", title: `${user.name} prepared ${input.ref} ${input.name}`, body: review.id, href })
    setEditing(false)
    toast(draft ? "Draft saved. The quality manager confirms it." : "Analysis saved")
  }

  return (
    <Section title="Analysis for top management" aside={<Badge tone={st.tone}>{st.label}</Badge>}>
      <CardContent className="flex flex-col gap-4">
        <KeyFacts
          className="[&>div]:grid-cols-[150px_minmax(0,1fr)]"
          facts={[
            { k: "Prepared by", v: input.preparedBy ? who(input.preparedBy) : "Not yet" },
            { k: "Last updated", v: input.updatedAt ? stamp(input.updatedAt) : "Not yet" },
            ...(input.handedTo ? [{ k: "Handed to", v: input.handedTo }] : []),
            { k: "Confirmed", v: input.draft ? "Waiting for the quality manager" : input.confirmedBy ? `By ${input.confirmedBy}` : hasAnalysis(input) ? "Not needed" : "Not yet" },
          ]}
        />
        {input.notApplicable ? (
          <p className="text-sm">Not applicable: {input.notApplicable}</p>
        ) : editing && mayWrite ? (
          <div className="grid gap-4 md:grid-cols-2">
            {ANALYSIS_FIELDS.map(([k, label, help]) => (
              <Field key={k} label={label} htmlFor={`an-${k}`} help={help} optional={k !== "summary"}>
                <Textarea id={`an-${k}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="min-h-20" />
              </Field>
            ))}
          </div>
        ) : hasAnalysis(input) ? (
          <dl className="grid gap-3 md:grid-cols-2">
            {ANALYSIS_FIELDS.filter(([k]) => input.analysis?.[k]?.trim()).map(([k, label]) => (
              <div key={k} className="flex flex-col gap-1 rounded-md bg-background px-3.5 py-3">
                <dt className="text-[0.8125rem] font-semibold">{label}</dt>
                <dd className="text-sm leading-relaxed">{input.analysis![k]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No analysis yet.{input.handedTo ? ` ${input.handedTo} is preparing it.` : ""}</p>
        )}
        {!locked && (
          <div className="flex flex-wrap gap-2">
            {mayWrite && editing && (
              <>
                <Button size="sm" disabled={!form.summary.trim()} onClick={save}>
                  Save analysis
                </Button>
                {hasAnalysis(input) && (
                  <Button size="sm" variant="ghost" onClick={() => { setForm(saved); setEditing(false) }}>
                    Cancel
                  </Button>
                )}
              </>
            )}
            {mayWrite && !editing && (
              <>
                {input.draft && canManage && (
                  <Button size="sm" onClick={() => { setInput({ draft: false, confirmedBy: user.name }); toast("Analysis confirmed") }}>
                    <CheckIcon /> Confirm analysis
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Edit analysis
                </Button>
              </>
            )}
            {canManage && !input.notApplicable && !hasAnalysis(input) && (
              <Button size="sm" variant="outline" onClick={() => setHand(true)}>
                {input.handedTo ? "Hand to someone else" : "Hand to someone"}
              </Button>
            )}
            {canManage && !input.notApplicable && (
              <Button size="sm" variant="ghost" onClick={() => setNa(true)}>
                Not applicable
              </Button>
            )}
            {canManage && input.notApplicable && (
              <Button size="sm" variant="ghost" onClick={() => setInput({ notApplicable: undefined })}>
                It applies after all
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={hand} onOpenChange={setHand}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hand {input.ref} to someone</DialogTitle>
            <DialogDescription>They get a notification and can write the analysis and check its supporting records. You stay responsible for the review. Only people with access to Management Review are listed.</DialogDescription>
          </DialogHeader>
          <Field label="Person" htmlFor="hand-to">
            <NativeSelect id="hand-to" value={handTo} onChange={(e) => setHandTo(e.target.value)}>
              <PeopleOptions names={allowed} />
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHand(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                update("reviews", review.id, { ...(review.stage === "Planned" ? { stage: "Preparing" as const } : {}), inputs: review.inputs.map((x) => (x.ref === input.ref ? { ...x, handedTo: handTo } : x)), contributors: [...new Set([...(review.contributors ?? []), handTo])] })
                notify([handTo], { kind: "Assigned", title: `Prepare input ${input.ref} ${input.name} for ${review.id}`, body: `Check its supporting records and write a short analysis before ${review.date}.`, href: `/management-review/${review.id}` })
                setHand(false)
                toast(`Handed to ${handTo}`)
              }}
            >
              Hand over
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={na} onOpenChange={setNa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{input.ref} not applicable this time</DialogTitle>
            <DialogDescription>Say why. The certification auditor will check every input was considered.</DialogDescription>
          </DialogHeader>
          <Field label="Reason" htmlFor="na-why">
            <Textarea id="na-why" value={naWhy} onChange={(e) => setNaWhy(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNa(false)}>
              Cancel
            </Button>
            <Button disabled={!naWhy.trim()} onClick={() => { setInput({ notApplicable: naWhy.trim() }); setNa(false) }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}

/* 5. Evaluation by top management */
export function Evaluations({ review, refKey, label, locked, onPropose }: { review: ManagementReviewRecord; refKey: string; label: string; locked: boolean; onPropose?: (e: ReviewEvaluation) => void }) {
  const { state, add, update, user, notify } = useStore()
  const { canEvaluate, canManage, isInvolved } = useReviewRights(review)
  const who = useAuthorName()
  const list = state.reviewEvaluations.filter((e) => e.reviewId === review.id && e.ref === refKey)
  const comments = review.comments.filter((c) => c.ref === refKey)
  const [status, setStatus] = React.useState<EvaluationStatus | "">("")
  const [comment, setComment] = React.useState("")
  const [ask, setAsk] = React.useState(false)
  const [question, setQuestion] = React.useState("")
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [note, setNote] = React.useState("")
  React.useEffect(() => { setStatus(""); setComment(""); setAsk(false); setQuestion(""); setNote("") }, [refKey])
  const open = !locked && review.stage === "Preparing" && !!review.packSentOn
  const input = review.inputs.find((i) => i.ref === refKey)
  const preparer = [review.preparedBy, ...(input?.handedTo ? [input.handedTo] : [])]
  const href = `/management-review/${review.id}`
  const mayAnswer = (canManage || input?.handedTo === user.name) && open

  function submit() {
    const id = nextId(state.reviewEvaluations.map((e) => e.id), "EVL-")
    add("reviewEvaluations", { id, reviewId: review.id, ref: refKey, by: user.name, status: status || undefined, comment: comment.trim(), clarification: ask && question.trim() ? { question: question.trim() } : undefined, at: nowIso() })
    update("reviews", review.id, { status: { ...review.status, [user.name]: review.status[user.name] === "Signed off" ? "Signed off" : "Commented" } })
    if (ask && question.trim()) notify(preparer, { kind: "Waiting on you", title: `${user.name} asks for clarification on ${label}`, body: `“${question.trim()}”`, href })
    else notify(preparer, { kind: "Comment", title: `${user.name} evaluated ${label}`, body: status ? `${status}. ${comment.trim()}` : comment.trim(), href })
    setStatus(""); setComment(""); setAsk(false); setQuestion("")
    toast(ask ? "Evaluation saved, clarification requested" : "Evaluation saved")
  }

  if (!review.packSentOn && !list.length && !comments.length) return null
  return (
    <Section title={refKey === "overall" ? "Overall evaluation" : "Evaluation by top management"} aside={<span className="text-[0.8125rem] text-muted-foreground">{refKey === "overall" ? "Across all inputs" : "After the pack is sent"}</span>}>
      <ul>
        {list.length === 0 && comments.length === 0 && <li className="px-5 py-3 text-sm text-muted-foreground">No evaluation yet.</li>}
        {list.map((e) => (
          <li key={e.id} className="flex flex-col gap-1.5 border-b border-rule-soft px-5 py-3 last:border-b-0">
            <span className="flex flex-wrap items-center gap-2">
              <b className="text-[0.8125rem]">{who(e.by)}</b>
              {e.status && <Badge tone={EVAL_TONE[e.status]}>{e.status}</Badge>}
              <span className="text-xs text-muted-foreground">{stamp(e.at)}</span>
            </span>
            {e.comment && <span className="text-sm leading-relaxed">{e.comment}</span>}
            {e.clarification && (
              <div className="flex flex-col gap-1 rounded-sm border-l-2 border-soon-bar bg-background px-3 py-2 text-[0.8125rem]">
                <span><b>Clarification asked:</b> {e.clarification.question}</span>
                {e.clarification.answer ? (
                  <span><b>Answer from {who(e.clarification.answeredBy ?? "")}:</b> {e.clarification.answer} <span className="text-xs text-muted-foreground">{stamp(e.clarification.answeredAt)}</span></span>
                ) : mayAnswer ? (
                  <span className="flex flex-col gap-2 pt-1">
                    <Textarea value={answers[e.id] ?? ""} onChange={(x) => setAnswers({ ...answers, [e.id]: x.target.value })} aria-label={`Answer ${who(e.by)}`} className="min-h-14" />
                    <Button size="sm" variant="outline" className="self-start" disabled={!(answers[e.id] ?? "").trim()} onClick={() => {
                      update("reviewEvaluations", e.id, { clarification: { ...e.clarification!, answer: answers[e.id].trim(), answeredBy: user.name, answeredAt: nowIso() } })
                      notify([e.by], { kind: "Comment", title: `${user.name} answered your question on ${label}`, body: `“${answers[e.id].trim()}”`, href })
                      toast("Answer sent")
                    }}>Send answer</Button>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Waiting for an answer from {review.preparedBy}.</span>
                )}
              </div>
            )}
            {onPropose && canManage && open && (
              <button type="button" onClick={() => onPropose(e)} className="cursor-pointer self-start text-xs font-medium text-primary hover:underline">
                Propose a decision from this
              </button>
            )}
          </li>
        ))}
        {comments.map((c, i) => (
          <li key={`c${i}`} className="flex flex-col gap-0.5 border-b border-rule-soft px-5 py-3 last:border-b-0">
            <span className="flex items-center gap-2 text-[0.8125rem]"><MessageSquareIcon className="size-3.5 text-muted-foreground" /><b>{who(c.author)}</b><span className="text-xs text-muted-foreground">{c.when}</span></span>
            <span className="text-sm">{c.text}</span>
          </li>
        ))}
      </ul>
      {open && canEvaluate && (
        <div className="flex flex-col gap-3 border-t px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
            <Field label="Status" htmlFor={`ev-st-${refKey}`} optional help="A workflow aid, not an ISO 9001 term.">
              <NativeSelect id={`ev-st-${refKey}`} value={status} onChange={(e) => setStatus(e.target.value as EvaluationStatus | "")}>
                <option value="">No status</option>
                {EVALUATION_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Your evaluation" htmlFor={`ev-c-${refKey}`}>
              <Textarea id={`ev-c-${refKey}`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={refKey === "overall" ? "How the QMS is doing overall, and what should change" : "What you conclude from the figures and records"} className="min-h-16" aria-label={`Evaluation of ${label}`} />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem]">
            <Checkbox checked={ask} onCheckedChange={(v) => setAsk(!!v)} /> Ask the preparer to clarify something
          </label>
          {ask && <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What do you need to know?" aria-label="Question for the preparer" />}
          <Button size="sm" className="self-start" disabled={!comment.trim() && !(ask && question.trim())} onClick={submit}>
            Save evaluation
          </Button>
        </div>
      )}
      {open && !canEvaluate && isInvolved && !canManage && (
        <div className="flex flex-col gap-2 border-t px-5 py-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a comment" aria-label="Comment on this input" className="min-h-14" />
          <Button size="sm" variant="outline" className="self-start" disabled={!note.trim()} onClick={() => {
            update("reviews", review.id, { comments: [...review.comments, { ref: refKey, author: user.name, when: "Today", text: note.trim() }], status: { ...review.status, [user.name]: "Commented" } })
            notify([review.preparedBy], { kind: "Comment", title: `${user.name} commented on ${label}`, body: `“${note.trim()}”`, href })
            setNote("")
            toast("Comment added")
          }}>Add comment</Button>
        </div>
      )}
    </Section>
  )
}

/* 6. Decisions */
export function ProposeDecision({ review, inputRef, rows, evaluation, open, onOpenChange }: { review: ManagementReviewRecord; inputRef?: string; rows: SupportingRow[]; evaluation?: ReviewEvaluation; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { update, user } = useStore()
  const [text, setText] = React.useState("")
  const [type, setType] = React.useState<ReviewActionType>("Improvement")
  const [picked, setPicked] = React.useState<string[]>([])
  React.useEffect(() => {
    if (!open) return
    setText("")
    setType("Improvement")
    setPicked(rows.filter((r) => r.attention && r.available && r.id && r.kind !== "link").slice(0, 3).map((r) => r.key))
  }, [open])
  const choices = rows.filter((r) => r.available && r.id && r.kind !== "link")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Propose a decision</DialogTitle>
          <DialogDescription>It goes on the Finish and lock page, where top management’s decisions are agreed, merged and given an owner and due date.{evaluation ? ` From ${evaluation.by}’s evaluation.` : ""}</DialogDescription>
        </DialogHeader>
        <Field label="Decision" htmlFor="pd-text">
          <Input id="pd-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Supplier plan for on-time delivery, with dates" />
        </Field>
        <Field label="Type" htmlFor="pd-type">
          <NativeSelect id="pd-type" value={type} onChange={(e) => setType(e.target.value as ReviewActionType)}>
            {(["Improvement", "Change to the QMS", "Resource need"] as ReviewActionType[]).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        </Field>
        {choices.length > 0 && (
          <Field label="Based on these records" optional>
            <ul className="flex max-h-56 flex-col overflow-y-auto rounded-sm border">
              {choices.map((r, i) => (
                <li key={r.key} className={cn("flex items-center gap-2.5 px-3 py-2 text-[0.8125rem]", i > 0 && "border-t border-rule-soft")}>
                  <Checkbox id={`pd-${r.key}`} checked={picked.includes(r.key)} onCheckedChange={(v) => setPicked(v ? [...picked, r.key] : picked.filter((x) => x !== r.key))} />
                  <label htmlFor={`pd-${r.key}`} className="flex min-w-0 flex-1 cursor-pointer gap-2">
                    <b className="shrink-0 font-medium">{r.id}</b>
                    <span className="truncate">{r.title}</span>
                  </label>
                  {r.attention && <CircleAlertIcon className="size-3.5 shrink-0 text-overdue" aria-label="Needs attention" />}
                </li>
              ))}
            </ul>
          </Field>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!text.trim()}
            onClick={() => {
              const d: ProposedDecision = {
                id: `PD-${Date.now()}`,
                text: text.trim(),
                type,
                inputRef,
                sourceRecords: choices.filter((r) => picked.includes(r.key)).map((r) => ({ kind: r.kind as Exclude<typeof r.kind, "link">, id: r.id! })),
                evaluationId: evaluation?.id,
                proposedBy: user.name,
                at: nowIso(),
              }
              update("reviews", review.id, { proposedDecisions: [...(review.proposedDecisions ?? []), d] })
              toast("Decision proposed", { description: "Agree it on the Finish and lock page." })
              onOpenChange(false)
            }}
          >
            Propose decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Decisions({ review, input, rows, locked }: { review: ManagementReviewRecord; input: ReviewInput; rows: SupportingRow[]; locked: boolean }) {
  const { state, update } = useStore()
  const { canManage, canEvaluate } = useReviewRights(review)
  const who = useAuthorName()
  const [proposing, setProposing] = React.useState(false)
  const proposed = (review.proposedDecisions ?? []).filter((d) => d.inputRef === input.ref)
  const actions = state.reviewActions.filter((a) => a.reviewId === review.id && a.inputRef === input.ref)
  const mayPropose = !locked && review.stage === "Preparing" && (canManage || canEvaluate)
  if (!proposed.length && !actions.length && !mayPropose) return null
  return (
    <Section title="Decisions" aside={<span className="text-[0.8125rem] text-muted-foreground">Clause 9.3.3</span>}>
      <ul>
        {!proposed.length && !actions.length && <li className="px-5 py-3 text-sm text-muted-foreground">No decisions for this input yet. Not every input needs one.</li>}
        {proposed.map((d) => (
          <li key={d.id} className="flex flex-col gap-1 border-b border-rule-soft px-5 py-3 last:border-b-0">
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone="draft">Proposed</Badge>
              <span className="text-sm font-medium">{d.text}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {d.type}. Proposed by {who(d.proposedBy)}.{d.sourceRecords?.length ? ` Based on ${d.sourceRecords.map((s) => s.id).join(", ")}.` : ""}
            </span>
            {mayPropose && canManage && (
              <button type="button" onClick={() => update("reviews", review.id, { proposedDecisions: (review.proposedDecisions ?? []).filter((x) => x.id !== d.id) })} className="cursor-pointer self-start text-xs text-muted-foreground hover:text-overdue">
                Withdraw
              </button>
            )}
          </li>
        ))}
        {actions.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-rule-soft px-5 py-3 last:border-b-0">
            <span className="flex min-w-0 flex-col">
              <RecordLink kind="review-action" id={a.id} label={a.text} className="self-start text-[0.8125rem]" />
              <span className="text-sm">{a.text}</span>
              <span className="text-xs text-muted-foreground">{a.owner}, due {a.due}</span>
            </span>
            <Badge tone={a.state === "Done" ? "done" : isLate(a) ? "overdue" : "progress"}>{a.state === "Done" ? "Done" : isLate(a) ? "Overdue" : "Open"}</Badge>
          </li>
        ))}
      </ul>
      {mayPropose && (
        <div className="border-t px-5 py-3">
          <Button size="sm" variant="outline" onClick={() => setProposing(true)}>
            Propose a decision
          </Button>
        </div>
      )}
      <ProposeDecision review={review} inputRef={input.ref} rows={rows} open={proposing} onOpenChange={setProposing} />
    </Section>
  )
}

/** All six sections for the selected input. */
export function InputWorkspace({ review, input, live, onDirty }: { review: ManagementReviewRecord; input: ReviewInput; live?: InputFigure; onDirty: (d: boolean) => void }) {
  const locked = review.stage === "Reviewed" || review.stage === "Closed"
  const rows = useSupportingRows(review, input, live)
  const [proposeFrom, setProposeFrom] = React.useState<ReviewEvaluation | undefined>()
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-label={`Input ${input.ref} ${input.name}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.125rem] font-semibold">
          {!input.item && <span className="mr-2 text-muted-foreground">{input.ref}</span>}
          {input.name}
        </h2>
        {input.coveredIn && <span className="text-[0.8125rem] text-muted-foreground">Covered in {input.coveredIn}</span>}
        {input.changedAfterPack && !input.frozen && <Badge tone="soon">Changed after the pack was sent, {stamp(input.changedAfterPack)}</Badge>}
      </div>
      <About input={input} />
      <Summary review={review} input={input} live={live} />
      <Supporting review={review} input={input} live={live} locked={locked} />
      <Analysis key={`${review.id}-${input.ref}`} review={review} input={input} locked={locked} onDirty={onDirty} />
      <Evaluations review={review} refKey={input.ref} label={`${input.ref} ${input.name}`} locked={locked} onPropose={setProposeFrom} />
      <Decisions review={review} input={input} rows={rows} locked={locked} />
      <ProposeDecision review={review} inputRef={input.ref} rows={rows} evaluation={proposeFrom} open={!!proposeFrom} onOpenChange={(o) => !o && setProposeFrom(undefined)} />
    </div>
  )
}
