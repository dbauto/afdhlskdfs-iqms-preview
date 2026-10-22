import * as React from "react"
import { useHref, useParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { ExternalLinkIcon, FileTextIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { formatDate, formatPeriod, nowIso, todayIso } from "@/lib/periods"
import { freezeFigure } from "@/lib/review-figures"
import type { ManagementReviewRecord, Verdict } from "@/data/types"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { KeyFacts, LifecycleTrack, MetaLine, PageHeader } from "@/components/app/page"
import { Field, PeopleOptions } from "@/components/app/form"
import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import { OutsideLink, RecordLink } from "@/components/app/record-link"
import NotFound from "@/pages/not-found"
import { ActionsTable } from "./list"
import { actionsFor, carriedForward, formatLabel, guidedStep, inputState, openChangeRequests, periodOf, reviewPeople, shownFigure, signOffLabel, signState, stageTone, useActionReminders, useInputFigures, useReviewRights } from "./shared"
import { Evaluations, InputWorkspace } from "./workspace"
import { TopicCards } from "./topics"

const VERDICT_TONE: Record<Verdict, BadgeTone> = { Yes: "done", Partly: "soon", No: "overdue" }
export { inputState }

/** Seven guided steps worked out from the four stored stages, with the next thing to do. */
export function GuidedSteps({ review, openActions, onRecordPage }: { review: ManagementReviewRecord; openActions: number; onRecordPage?: boolean }) {
  const g = guidedStep(review, openActions, onRecordPage)
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <LifecycleTrack steps={g.steps} current={g.current} />
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-rule-soft pt-3 text-sm">
          <p>
            <span className="font-semibold">{g.current < 7 ? `Next: ` : ""}</span>
            {g.next}
          </p>
          <p className="text-[0.8125rem] text-muted-foreground">Reporting period {formatPeriod(periodOf(review))}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ManagementReviewDetail() {
  const { id } = useParams()
  const { state, update, user, notify, can } = useStore()
  const review = state.reviews.find((r) => r.id === id)
  const { canManage, isReviewer, seesSummary } = useReviewRights(review)
  const figures = useInputFigures(review)
  const packHref = useHref(`/management-review/${id}/pack`)
  const [selected, setSelected] = React.useState("a")
  const [dirty, setDirty] = React.useState(false)
  const [signing, setSigning] = React.useState(false)
  const [amending, setAmending] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [change, setChange] = React.useState("")
  const [amendKind, setAmendKind] = React.useState<"note" | "action" | "summary">("note")
  const [amendAction, setAmendAction] = React.useState("")
  const [actionFields, setActionFields] = React.useState({ text: "", owner: "", due: "" })
  const [newSummary, setNewSummary] = React.useState("")
  const [answers, setAnswers] = React.useState("")
  const [requesting, setRequesting] = React.useState(false)
  const [requestReason, setRequestReason] = React.useState("")
  useActionReminders()

  // opening the review after the pack is sent counts as opening the pack (not as reading or accepting it)
  React.useEffect(() => {
    if (review && review.packSentOn && review.stage === "Preparing" && review.status[user.name] === "Not opened") update("reviews", review.id, { status: { ...review.status, [user.name]: "Read" } })
  }, [review?.id, review?.packSentOn, user.name])

  // warn before leaving with analysis that isn't saved
  React.useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  if (!review || !can("Management Review")) return <NotFound />
  const { acts, open } = actionsFor(state, review.id)
  const st = stageTone(review, open.length)
  const preparing = review.stage === "Planned" || review.stage === "Preparing"
  const input = review.inputs.find((i) => i.ref === selected) ?? review.inputs[0]
  const everyone = [...review.reviewers, ...review.others]
  const signs = signState(review)
  const requests = openChangeRequests(review)
  const iSigned = signs.signed.includes(user.name)
  const mayClose = canManage && review.stage === "Reviewed" && signs.complete && !requests.length && (open.length === 0 || carriedForward(state, review))
  const allowed = reviewPeople(state)

  function pick(ref: string) {
    if (ref === selected) return
    if (dirty && !window.confirm("Your analysis isn’t saved. Leave this input without saving?")) return
    setDirty(false)
    setSelected(ref)
    // on narrow screens the workspace is below the list, so bring it into view
    try {
      if (window.matchMedia("(max-width: 1279px)").matches) requestAnimationFrame(() => document.getElementById("mr-workspace")?.scrollIntoView({ block: "start" }))
    } catch {
      /* matchMedia can be missing in old browsers */
    }
  }

  function sendPack() {
    const checks = state.reviewRecordChecks.filter((c) => c.reviewId === review!.id)
    const sentAt = todayIso()
    const snapshot = Object.fromEntries(review!.inputs.map((i) => [i.ref, freezeFigure(figures[i.ref], (s) => checks.find((c) => c.ref === i.ref && c.kind === s.kind && c.recordId === s.id)?.status)]))
    update("reviews", review!.id, { stage: "Preparing", packSentOn: "Today", packSnapshot: { sentAt, figures: snapshot } })
    notify([...everyone, ...(review!.contributors ?? [])], { kind: "Waiting on you", title: `Review pack for ${review!.id}`, body: review!.format === "Meeting" ? `Read it before the meeting on ${review!.date}.` : `Read the inputs, evaluate them and sign off by ${review!.date}.`, href: `/management-review/${review!.id}` })
    toast("Review pack sent", { description: `${everyone.length} people can open it in ThryveMS. Figures are kept as sent.` })
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Management Review", to: "/management-review" }, { label: review.id }]}
        title={review.title}
        badge={<Badge tone={st.tone}>{st.label}</Badge>}
        meta={<MetaLine parts={[review.id, formatLabel(review.format), `${review.format === "Meeting" ? "" : "By "}${review.date}${review.place ? `, ${review.place}` : ""}`, `Top management: ${review.reviewers.join(", ")}`, `Prepared by ${review.preparedBy}`]} />}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={packHref} target="_blank" rel="noopener noreferrer" aria-label={`Open the review pack for ${review.id} in a new tab`}>
                <FileTextIcon /> Open review pack <ExternalLinkIcon className="size-3.5" />
              </a>
            </Button>
            {canManage && preparing && !review.packSentOn && (
              <Button variant="outline" onClick={sendPack}>
                <SendIcon /> Send review pack
              </Button>
            )}
            {canManage && preparing && review.packSentOn && <Button asChild><Link to={`/management-review/${review.id}/record`}>Record the review</Link></Button>}
            {isReviewer && review.stage === "Reviewed" && !iSigned && !requests.length && <Button onClick={() => setSigning(true)}>Sign off</Button>}
            {isReviewer && review.stage === "Reviewed" && !iSigned && (
              <Button variant="outline" onClick={() => { setRequestReason(""); setRequesting(true) }}>
                Request changes
              </Button>
            )}
            {mayClose && (
              <Button onClick={() => { update("reviews", review.id, { stage: "Closed" }); toast(`${review.id} closed`, { description: open.length ? `${open.length} open action${open.length === 1 ? "" : "s"} carried into the next review.` : undefined }) }}>Close review</Button>
            )}
            {canManage && !preparing && review.stage !== "Closed" && (
              <Button variant={requests.length ? "default" : "ghost"} onClick={() => { setReason(""); setChange(""); setAmendKind("note"); setAmendAction(""); setNewSummary(review.conclusion?.summary ?? ""); setAnswers(requests[0]?.id ?? ""); setAmending(true) }}>
                Amend record
              </Button>
            )}
          </>
        }
      />
      <RemarkBanner kind="Management review" id={review.id} />
      <GuidedSteps review={review} openActions={open.length} />

      {preparing && !review.packSentOn && canManage && (
        <div className="rounded-md border border-info-border bg-highlight px-4 py-3 text-sm">
          Prepare every input, then send the review pack. You can record the review once top management has the pack.
        </div>
      )}
      {review.stage === "Reviewed" && requests.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-md border border-overdue-border bg-overdue-tint px-4 py-3 text-sm">
          {requests.map((c) => (
            <p key={c.id}>
              <b>{c.by} asked for changes</b> on {formatDate(c.at.slice(0, 10))}: {c.reason}
            </p>
          ))}
          <p className="text-[0.8125rem] text-muted-foreground">{canManage ? "Amend the record to answer. Sign-off waits until it’s answered." : "The preparer has been notified."}</p>
        </div>
      )}
      {review.stage === "Reviewed" && !requests.length && !signs.complete && (
        <div className="rounded-md border border-soon-border bg-soon-tint px-4 py-3 text-sm">
          Locked. Waiting for {signs.missing.join(" and ")} to sign off in ThryveMS{signs.signed.length ? `; ${signs.signed.join(" and ")} signed` : ""}. {isReviewer && !iSigned ? "Read the conclusion and decisions, then sign off or request changes." : "They’ve been notified."}
        </div>
      )}

      {!preparing && review.conclusion && (
        <Card>
          <CardHeader>
            <CardTitle>Conclusion of top management</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Clause 9.3</span>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
            {(
              [
                ["suitable", "Suitable"],
                ["adequate", "Adequate"],
                ["effective", "Effective"],
                ["aligned", "In line with the company’s direction"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="flex flex-col gap-1.5 rounded-md border p-3">
                <span className="text-[0.8125rem] text-muted-foreground">{label}</span>
                <Badge tone={VERDICT_TONE[review.conclusion![k]]} className="self-start">
                  {review.conclusion![k]}
                </Badge>
                {review.conclusion!.reasons[k] && <span className="text-xs text-muted-foreground">{review.conclusion!.reasons[k]}</span>}
              </div>
            ))}
          </div>
          <div className="border-t px-5 py-4 text-sm leading-relaxed">{review.conclusion.summary}</div>
        </Card>
      )}
      {!preparing && (
        <section className="flex flex-col gap-3" aria-label="Results of the review">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[0.9375rem] font-semibold">Results of the review</h2>
            <span className="text-[0.8125rem] text-muted-foreground">Decisions and actions, clause 9.3.3</span>
          </div>
          <ActionsTable label={`Actions from ${review.id}`} rows={acts} showFrom={false} minWidth={600} />
        </section>
      )}

      <TopicCards review={review} figures={figures} onOpenWorkspace={(ref) => { pick(ref); requestAnimationFrame(() => document.getElementById("mr-workspace")?.scrollIntoView({ block: "start", behavior: "smooth" })) }} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <Card className="xl:sticky xl:top-4">
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Clause 9.3.2</span>
          </CardHeader>
          <ul aria-label="Review inputs">
            {review.inputs.map((i, k) => {
              const fig = shownFigure(review, i, figures[i.ref])
              const s = inputState(i)
              return (
                <li key={i.ref} className={cn(k > 0 && "border-t border-rule-soft")}>
                  <button type="button" onClick={() => pick(i.ref)} aria-pressed={selected === i.ref} className={cn("grid w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 px-4 py-2.5 text-left hover:bg-hover", selected === i.ref && "bg-highlight")}>
                    <span className="pt-px text-xs font-semibold text-muted-foreground">{i.ref}</span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-[0.8125rem] font-medium leading-snug">{i.name}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge tone={s.tone}>{s.label}</Badge>
                        {seesSummary && fig && (
                          <span className="truncate text-xs text-muted-foreground">
                            <b className={cn("font-semibold text-foreground", fig.warn && "text-overdue")}>{fig.status === "not-collected" ? "No data" : fig.value}</b>
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
        <div id="mr-workspace" className="min-w-0 scroll-mt-20">
          <InputWorkspace review={review} input={input} live={figures[input.ref]} onDirty={setDirty} />
        </div>
      </div>

      <Evaluations review={review} refKey="overall" label={`${review.id} overall`} locked={!preparing} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{review.format === "Meeting" ? "Attendance" : "Who reviewed it"}</CardTitle>
            {review.packSentOn && <span className="text-[0.8125rem] text-muted-foreground">Pack sent {review.packSentOn}</span>}
          </CardHeader>
          <ul>
            {everyone.map((n, i) => {
              const s = review.status[n] ?? "Not opened"
              const tone: BadgeTone = s === "Signed off" || s === "Present" ? "done" : s === "Commented" ? "progress" : "draft"
              return (
                <li key={n} className={cn("flex items-center justify-between gap-3 px-5 py-2.5 text-sm", i > 0 && "border-t border-rule-soft")}>
                  <span className="flex flex-col">
                    <span>{n}</span>
                    <span className="text-xs text-muted-foreground">{review.reviewers.includes(n) ? "Top management" : review.contributors?.includes(n) ? "Contributor" : "Gets the pack"}</span>
                  </span>
                  {review.packSentOn || !preparing ? <Badge tone={tone}>{s === "Read" ? "Opened" : s}</Badge> : <span className="text-xs text-muted-foreground">Pack not sent</span>}
                </li>
              )
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Record</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <KeyFacts
              facts={[
                { k: "Reporting period", v: formatPeriod(periodOf(review)) },
                { k: "Recorded", v: review.recordedOn ?? "Not yet" },
                { k: "Sign-off", v: review.signOffs?.length ? review.signOffs.map((s) => `${s.by}, ${s.when}, ${signOffLabel(s.how)}`).join("; ") : review.signOff ? `${review.signOff.by}, ${review.signOff.when}, ${signOffLabel(review.signOff.how)}` : "Waiting" },
                ...(review.stage === "Reviewed" && !signs.complete ? [{ k: "Still to sign", v: signs.missing.join(", ") }] : []),
                ...(review.evidenceId ? [{ k: "Evidence", v: <RecordLink kind="evidence" id={review.evidenceId} /> }] : []),
              ]}
            />
            {([["Signed record", review.signOff?.file], ["Notes or minutes", review.notesFile]] as const)
              .filter(([, u]) => !!u)
              .map(([label, u]) => (
                <span key={label} className="flex items-center gap-2 rounded-sm border px-3 py-2 text-[0.8125rem]">
                  <FileTextIcon className="size-3.5 text-muted-foreground" />
                  <span className="flex-1">{label}</span>
                  <OutsideLink url={u} label={label} className="text-xs" />
                </span>
              ))}
            {!preparing && <span className="text-xs text-muted-foreground">The record is locked. Changes are made as amendments, each with a reason.</span>}
            {(review.amendments ?? []).length > 0 && (
              <ul className="flex flex-col gap-1.5 border-t border-rule-soft pt-3">
                {review.amendments!.map((a, i) => (
                  <li key={i} className="text-[0.8125rem]">
                    <b>Amended by {a.by}, {a.at.slice(0, 10)}.</b> {a.change} <span className="text-muted-foreground">Reason: {a.reason}</span>
                    {a.action && <span className="block text-xs text-muted-foreground">Before: {a.action.before.text}, {a.action.before.owner}, due {a.action.before.due}.</span>}
                    {a.summary && <span className="block text-xs text-muted-foreground">Summary before: {a.summary.before}</span>}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/management-review" className="text-[0.8125rem] font-medium text-primary">
              Open the actions tracker
            </Link>
          </CardContent>
        </Card>
      </div>
      <RemarksPanel target={{ kind: "Management review", id: review.id, label: `${review.id} ${review.title}`, to: `/management-review/${review.id}`, area: "Management Review" }} />

      <Dialog open={signing} onOpenChange={setSigning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign off {review.id}</DialogTitle>
            <DialogDescription>You confirm you’ve reviewed the inputs and agree with the conclusion and decisions. Your sign-off is added to the record’s sign-off history; it doesn’t change the locked content. {signs.missing.length > 1 ? `The record is final when ${signs.missing.filter((n) => n !== user.name).join(" and ")} also sign.` : "Yours is the last sign-off needed."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSigning(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const s = { how: "In iQMS" as const, by: user.name, when: "Today", at: nowIso() }
                const last = signs.missing.length === 1 && signs.missing[0] === user.name
                update("reviews", review.id, { signOff: review.signOff ?? s, signOffs: [...(review.signOffs ?? []), s], status: { ...review.status, [user.name]: "Signed off" } })
                notify([review.preparedBy, ...review.others], { kind: "Comment", title: `${user.name} signed off ${review.id}`, body: last ? "Every member of top management has signed. The management review record is final." : `Still waiting for ${signs.missing.filter((n) => n !== user.name).join(" and ")}.`, href: `/management-review/${review.id}` })
                setSigning(false)
                toast(`${review.id} signed off`)
              }}
            >
              Sign off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requesting} onOpenChange={setRequesting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes to {review.id}</DialogTitle>
            <DialogDescription>Say what’s wrong with the conclusion or decisions. {review.preparedBy} is told and amends the record; then you sign off.</DialogDescription>
          </DialogHeader>
          <Field label="What needs to change" htmlFor="cr-reason">
            <Textarea id="cr-reason" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="The supplier decision needs a date and an owner in Purchasing." />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRequesting(false)}>
              Cancel
            </Button>
            <Button
              disabled={!requestReason.trim()}
              onClick={() => {
                const id = `CR-${(review.changeRequests?.length ?? 0) + 1}`
                update("reviews", review.id, { changeRequests: [...(review.changeRequests ?? []), { id, by: user.name, at: nowIso(), reason: requestReason.trim() }] })
                notify([review.preparedBy], { kind: "Waiting on you", title: `${user.name} asked for changes to ${review.id}`, body: requestReason.trim(), href: `/management-review/${review.id}` })
                setRequesting(false)
                toast("Change request sent")
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={amending} onOpenChange={setAmending}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Amend {review.id}</DialogTitle>
            <DialogDescription>The locked figures and supporting records stay as they are. The change is applied and kept with its before and after, your name, the date and the reason. Top management is told; changing the conclusion asks them to sign again.</DialogDescription>
          </DialogHeader>
          {requests.length > 0 && (
            <Field label="Answers the request from" htmlFor="am-request">
              <NativeSelect id="am-request" value={answers} onChange={(e) => setAnswers(e.target.value)}>
                <option value="">Not answering a request</option>
                {requests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.by}: {c.reason.slice(0, 60)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field label="What changes" htmlFor="am-kind">
            <NativeSelect id="am-kind" value={amendKind} onChange={(e) => setAmendKind(e.target.value as typeof amendKind)}>
              <option value="note">A note only</option>
              <option value="action">An action’s wording, owner or due date</option>
              <option value="summary">The conclusion summary</option>
            </NativeSelect>
          </Field>
          {amendKind === "action" && (
            <>
              <Field label="Action" htmlFor="am-action">
                <NativeSelect
                  id="am-action"
                  value={amendAction}
                  onChange={(e) => {
                    const x = acts.find((y) => y.id === e.target.value)
                    setAmendAction(e.target.value)
                    setActionFields({ text: x?.text ?? "", owner: x?.owner ?? "", due: x?.dueDate ?? "" })
                  }}
                >
                  <option value="">Choose an action</option>
                  {acts.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.id} {x.text}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {amendAction && (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_10rem]">
                  <Field label="Wording" htmlFor="am-text">
                    <Input id="am-text" value={actionFields.text} onChange={(e) => setActionFields({ ...actionFields, text: e.target.value })} />
                  </Field>
                  <Field label="Owner" htmlFor="am-owner">
                    <NativeSelect id="am-owner" value={actionFields.owner} onChange={(e) => setActionFields({ ...actionFields, owner: e.target.value })}>
                      <PeopleOptions names={allowed} />
                    </NativeSelect>
                  </Field>
                  <Field label="Due" htmlFor="am-due">
                    <Input id="am-due" type="date" value={actionFields.due} onChange={(e) => setActionFields({ ...actionFields, due: e.target.value })} />
                  </Field>
                </div>
              )}
            </>
          )}
          {amendKind === "summary" && (
            <Field label="Conclusion summary" htmlFor="am-summary">
              <Textarea id="am-summary" value={newSummary} onChange={(e) => setNewSummary(e.target.value)} />
            </Field>
          )}
          {amendKind === "note" && (
            <Field label="What changes" htmlFor="am-change">
              <Textarea id="am-change" value={change} onChange={(e) => setChange(e.target.value)} placeholder="The minutes link pointed to the wrong file." />
            </Field>
          )}
          <Field label="Reason" htmlFor="am-reason">
            <Textarea id="am-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Typing mistake in the minutes." />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAmending(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !reason.trim() ||
                (amendKind === "note" && !change.trim()) ||
                (amendKind === "action" && (!amendAction || !actionFields.text.trim() || !actionFields.owner || !actionFields.due)) ||
                (amendKind === "summary" && (!newSummary.trim() || newSummary.trim() === review.conclusion?.summary))
              }
              onClick={() => {
                const at = nowIso()
                const x = acts.find((y) => y.id === amendAction)
                let amendment: NonNullable<ManagementReviewRecord["amendments"]>[number]
                const patch: Partial<ManagementReviewRecord> = {}
                if (amendKind === "action" && x) {
                  const before = { text: x.text, owner: x.owner, due: x.dueDate ?? x.due }
                  const after = { text: actionFields.text.trim(), owner: actionFields.owner, due: actionFields.due }
                  update("reviewActions", x.id, { text: after.text, owner: after.owner, dueDate: after.due, due: formatDate(after.due), reminded: [] })
                  amendment = { by: user.name, at, reason: reason.trim(), change: `Changed ${x.id} to “${after.text}”, ${after.owner}, due ${formatDate(after.due)}.`, action: { id: x.id, before, after } }
                  if (after.owner !== before.owner) notify([after.owner], { kind: "Assigned", title: `Action from ${review.id}: ${after.text}`, body: `Due ${formatDate(after.due)}.`, href: `/management-review/actions/${x.id}` })
                } else if (amendKind === "summary" && review.conclusion) {
                  amendment = { by: user.name, at, reason: reason.trim(), change: "Changed the conclusion summary.", summary: { before: review.conclusion.summary, after: newSummary.trim() } }
                  patch.conclusion = { ...review.conclusion, summary: newSummary.trim() }
                  patch.conclusionChangedAt = at
                } else {
                  amendment = { by: user.name, at, reason: reason.trim(), change: change.trim() }
                }
                if (answers) {
                  amendment.requestId = answers
                  patch.changeRequests = (review.changeRequests ?? []).map((c) => (c.id === answers ? { ...c, resolvedAt: at, resolvedBy: user.name } : c))
                }
                update("reviews", review.id, { ...patch, amendments: [...(review.amendments ?? []), amendment] })
                notify(review.reviewers, { kind: amendKind === "summary" ? "Waiting on you" : "Comment", title: `${user.name} amended ${review.id}`, body: amendKind === "summary" ? "The conclusion changed. Read it and sign off again." : amendment.change, href: `/management-review/${review.id}` })
                setAmending(false)
                toast("Amendment added to the record")
              }}
            >
              Add amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
