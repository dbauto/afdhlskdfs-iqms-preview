import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { CheckIcon, DownloadIcon, FileTextIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { liveFigure } from "@/lib/review-figures"
import type { ManagementReviewRecord, ReviewInput, Verdict } from "@/data/types"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NativeSelect, Textarea } from "@/components/ui/input"
import { KeyFacts, LifecycleTrack, MetaLine, PageHeader, RecordLayout } from "@/components/app/page"
import { Field, PeopleOptions } from "@/components/app/form"
import { RemarkBanner, RemarksPanel, useAuthorName } from "@/components/app/remarks"
import NotFound from "@/pages/not-found"
import { ActionsTable } from "./list"
import { actionsFor, formatLabel, stageTone, useReviewRights } from "./shared"

const VERDICT_TONE: Record<Verdict, BadgeTone> = { Yes: "done", Partly: "soon", No: "overdue" }

/** Status of one input while preparing. */
export function inputState(i: ReviewInput): { label: string; tone: BadgeTone } {
  if (i.notApplicable) return { label: "Not applicable", tone: "draft" }
  if (i.draft) return { label: "Consultant draft", tone: "soon" }
  if (i.note) return { label: "Note added", tone: "done" }
  if (i.handedTo) return { label: `With ${i.handedTo.split(" ")[0]}`, tone: "draft" }
  return { label: "Needs a note", tone: "draft" }
}

function InputPanel({ review, input, editable }: { review: ManagementReviewRecord; input: ReviewInput; editable: boolean }) {
  const { state, update, user, role, notify } = useStore()
  const { canManage, canDraft, isReviewer, isInvolved } = useReviewRights(review)
  const who = useAuthorName()
  // clients don't see the consultant's name
  const noteBy = (input.noteBy ?? "").split(", confirmed by ").map(who).join(", confirmed by ").replace(/^Your consultant/, "your consultant")
  const [note, setNote] = React.useState(input.note ?? "")
  const [editing, setEditing] = React.useState(!input.note)
  const [comment, setComment] = React.useState("")
  const [hand, setHand] = React.useState(false)
  const [handTo, setHandTo] = React.useState(input.handedTo ?? "Joy Aquino")
  const [na, setNa] = React.useState(false)
  const [naWhy, setNaWhy] = React.useState("")
  React.useEffect(() => {
    setNote(input.note ?? "")
    setEditing(!input.note)
    setComment("")
  }, [input.ref, input.note])

  const fig = input.frozen ? (input.frozen.value ? input.frozen : undefined) : liveFigure(input.ref, state, review)
  const mayWrite = editable && (canDraft || input.handedTo === user.name)
  const comments = review.comments.filter((c) => c.ref === input.ref)
  const setInput = (patch: Partial<ReviewInput>) => update("reviews", review.id, { inputs: review.inputs.map((x) => (x.ref === input.ref ? { ...x, ...patch } : x)) })
  const mayComment = review.stage === "Preparing" && !!review.packSentOn && (isInvolved || canManage)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {input.ref} {input.name}
        </CardTitle>
        <Badge tone={inputState(input).tone}>{inputState(input).label}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <KeyFacts
          facts={[
            { k: input.frozen ? "Figures, frozen" : "From iQMS", v: fig ? <span><b>{fig.value}</b> {fig.detail}</span> : "No figure. Write a note." },
            { k: "Source", v: input.source },
            ...(input.handedTo ? [{ k: "Prepared by", v: input.handedTo }] : []),
            ...(input.coveredIn ? [{ k: "Covered in", v: input.coveredIn }] : []),
          ]}
        />
        {input.notApplicable ? (
          <p className="text-sm">Not applicable: {input.notApplicable}</p>
        ) : editing && mayWrite ? (
          <Field label="Note for top management" htmlFor="in-note" help="What the figures mean and what you propose. Two or three sentences is enough.">
            <Textarea id="in-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-24" />
          </Field>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[0.8125rem] font-semibold">Note</span>
            <p className="text-sm leading-relaxed">{input.note || "No note yet."}</p>
            {input.noteBy && <span className="text-xs text-muted-foreground">{input.draft ? `Drafted by ${noteBy}, ${role.id === "consultant" ? "waiting for the quality manager" : "confirm or edit it"}` : `By ${noteBy}`}</span>}
          </div>
        )}
        {mayWrite && !input.notApplicable && (
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <Button
                size="sm"
                disabled={!note.trim()}
                onClick={() => {
                  const draft = role.id === "consultant"
                  setInput({ note: note.trim(), noteBy: user.name, draft })
                  if (draft) notify([review.preparedBy], { kind: "Waiting on you", title: `Confirm the consultant’s note on ${input.ref} ${input.name}`, body: review.id, href: `/management-review/${review.id}` })
                  if (input.handedTo === user.name) notify([review.preparedBy], { kind: "Comment", title: `${user.name} added the note on ${input.ref} ${input.name}`, body: review.id, href: `/management-review/${review.id}` })
                  setEditing(false)
                  toast(draft ? "Draft saved. The quality manager confirms it." : "Note saved")
                }}
              >
                Save note
              </Button>
            ) : (
              <>
                {input.draft && canManage && (
                  <Button size="sm" onClick={() => { setInput({ draft: false, noteBy: `${input.noteBy}, confirmed by ${user.name}` }); toast("Note confirmed") }}>
                    <CheckIcon /> Confirm note
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Edit note
                </Button>
              </>
            )}
            {canManage && !input.note && (
              <Button size="sm" variant="outline" onClick={() => setHand(true)}>
                {input.handedTo ? "Hand to someone else" : "Hand to someone"}
              </Button>
            )}
            {canManage && (
              <Button size="sm" variant="ghost" onClick={() => setNa(true)}>
                Not applicable
              </Button>
            )}
          </div>
        )}
        {(comments.length > 0 || mayComment) && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <span className="text-[0.8125rem] font-semibold">Comments from reviewers</span>
            {comments.length === 0 && <span className="text-[0.8125rem] text-muted-foreground">No comments yet.</span>}
            {comments.map((c, i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded-sm bg-background px-3 py-2">
                <span className="text-sm">{c.text}</span>
                <span className="text-xs text-muted-foreground">
                  {who(c.author)}, {c.when}
                </span>
              </div>
            ))}
            {mayComment && (
              <>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={isReviewer ? "Your view, or a decision you want" : "Add a comment"} aria-label="Comment on this input" className="min-h-16" />
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  disabled={!comment.trim()}
                  onClick={() => {
                    update("reviews", review.id, {
                      comments: [...review.comments, { ref: input.ref, author: user.name, when: "Today", text: comment.trim() }],
                      status: { ...review.status, [user.name]: review.status[user.name] === "Signed off" ? "Signed off" : "Commented" },
                    })
                    notify([review.preparedBy], { kind: "Comment", title: `${user.name} commented on ${input.ref} ${input.name}`, body: `“${comment.trim()}”`, href: `/management-review/${review.id}` })
                    setComment("")
                    toast("Comment added")
                  }}
                >
                  Add comment
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={hand} onOpenChange={setHand}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hand {input.ref} to someone</DialogTitle>
            <DialogDescription>They get a notification and can write the note. You stay responsible for the review.</DialogDescription>
          </DialogHeader>
          <Field label="Person" htmlFor="hand-to">
            <NativeSelect id="hand-to" value={handTo} onChange={(e) => setHandTo(e.target.value)}>
              <PeopleOptions />
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHand(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setInput({ handedTo: handTo })
                notify([handTo], { kind: "Assigned", title: `Prepare input ${input.ref} ${input.name} for ${review.id}`, body: `Write a short note before ${review.date}.`, href: `/management-review/${review.id}` })
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
    </Card>
  )
}

export default function ManagementReviewDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, update, user, notify } = useStore()
  const review = state.reviews.find((r) => r.id === id)
  const { canManage, isReviewer } = useReviewRights(review)
  const [selected, setSelected] = React.useState("a")
  const [signing, setSigning] = React.useState(false)

  // opening the pack counts as reading it
  React.useEffect(() => {
    if (review && review.packSentOn && review.stage === "Preparing" && review.status[user.name] === "Not opened") update("reviews", review.id, { status: { ...review.status, [user.name]: "Read" } })
  }, [review?.id, review?.packSentOn, user.name])

  if (!review) return <NotFound />
  const { acts, open } = actionsFor(state, review.id)
  const st = stageTone(review, open.length)
  const preparing = review.stage === "Planned" || review.stage === "Preparing"
  const ready = review.inputs.filter((i) => (i.note && !i.draft) || i.notApplicable).length
  const input = review.inputs.find((i) => i.ref === selected) ?? review.inputs[0]
  const stepIndex = { Planned: 0, Preparing: 1, Reviewed: 2, Closed: 3 }[review.stage]
  const everyone = [...review.reviewers, ...review.others]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Management Review", to: "/management-review" }, { label: review.id }]}
        title={review.title}
        badge={<Badge tone={st.tone}>{st.label}</Badge>}
        meta={<MetaLine parts={[review.id, formatLabel(review.format), `${review.format === "Meeting" ? "" : "By "}${review.date}${review.place ? `, ${review.place}` : ""}`, `Top management: ${review.reviewers.join(", ")}`, `Prepared by ${review.preparedBy}`]} />}
        actions={
          <>
            <Button variant="outline" onClick={() => toast("Review pack is being prepared", { description: "A PDF with every input, figure and note. You’ll get it by email in a minute." })}>
              <DownloadIcon /> Review pack
            </Button>
            {canManage && preparing && !review.packSentOn && (
              <Button
                variant="outline"
                onClick={() => {
                  update("reviews", review.id, { packSentOn: "Today" })
                  notify(everyone, { kind: "Waiting on you", title: `Review pack for ${review.id}`, body: review.format === "Meeting" ? `Read it before the meeting on ${review.date}.` : `Read the inputs, comment, and sign off by ${review.date}.`, href: `/management-review/${review.id}` })
                  toast("Review pack sent", { description: `${everyone.length} people can read it in iQMS and comment.` })
                }}
              >
                <SendIcon /> Send review pack
              </Button>
            )}
            {canManage && preparing && <Button onClick={() => navigate(`/management-review/${review.id}/record`)}>Record the review</Button>}
            {isReviewer && review.stage === "Reviewed" && !review.signOff && <Button onClick={() => setSigning(true)}>Sign off</Button>}
            {canManage && review.stage === "Reviewed" && review.signOff && open.length === 0 && (
              <Button onClick={() => { update("reviews", review.id, { stage: "Closed" }); toast(`${review.id} closed`) }}>Close review</Button>
            )}
          </>
        }
      />
      <RemarkBanner kind="Management review" id={review.id} />

      <Card>
        <CardContent className="py-5">
          <LifecycleTrack
            steps={[
              { label: "Planned" },
              { label: "Preparing", when: preparing ? `${ready} of ${review.inputs.length} inputs ready` : review.packSentOn ? `Pack sent ${review.packSentOn}` : undefined },
              { label: "Reviewed", when: review.recordedOn ?? (review.format === "Meeting" ? review.date : `By ${review.date}`) },
              { label: "Closed", when: review.stage === "Closed" ? "All actions done" : acts.length ? `${acts.length - open.length} of ${acts.length} actions done` : "When actions are done" },
            ]}
            current={stepIndex}
          />
        </CardContent>
      </Card>

      {review.stage === "Reviewed" && !review.signOff && (
        <div className="rounded-md border border-soon-border bg-soon-tint px-4 py-3 text-sm">
          Recorded and waiting for {review.reviewers.join(" and ")} to sign off in iQMS. {isReviewer ? "Read the conclusion and decisions, then sign off." : "They’ve been notified."}
        </div>
      )}

      <RecordLayout
        main={
          <>
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
            <Card>
              <CardHeader>
                <CardTitle>Inputs</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">{preparing ? "Figures come from iQMS and freeze when the review is recorded." : "Figures as they were when the review was recorded."} Clause 9.3.2</span>
              </CardHeader>
              <ul>
                {review.inputs.map((i, k) => {
                  const fig: { value: string; detail: string; warn?: boolean } | undefined = i.frozen ? (i.frozen.value ? i.frozen : undefined) : liveFigure(i.ref, state, review)
                  const s = inputState(i)
                  return (
                    <li key={i.ref} className={cn(k > 0 && "border-t border-rule-soft")}>
                      <button type="button" onClick={() => setSelected(i.ref)} aria-pressed={selected === i.ref} className={cn("grid w-full cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-3 text-left hover:bg-hover md:grid-cols-[2rem_minmax(0,1fr)_13rem_8.5rem]", selected === i.ref && "bg-highlight")}>
                        <span className="text-xs font-semibold text-muted-foreground">{i.ref}</span>
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium">{i.name}</span>
                          <span className="truncate text-xs text-muted-foreground">{i.coveredIn ? `Covered in ${i.coveredIn}` : i.handedTo && !i.note ? `Handed to ${i.handedTo}` : i.source}</span>
                        </span>
                        <span className="text-[0.8125rem] max-md:col-start-2 max-md:row-start-2">
                          {fig ? (
                            <>
                              <b className={cn("text-[0.9375rem]", fig.warn && "text-overdue")}>{fig.value}</b> <span className="text-muted-foreground">{fig.detail}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Note only</span>
                          )}
                        </span>
                        <Badge tone={s.tone} className="justify-self-start max-md:col-start-3 max-md:row-start-1">
                          {s.label}
                        </Badge>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
            <RemarksPanel target={{ kind: "Management review", id: review.id, label: `${review.id} ${review.title}`, to: `/management-review/${review.id}`, area: "Management Review" }} />
          </>
        }
        side={
          <>
            <InputPanel review={review} input={input} editable={preparing} />
            <Card>
              <CardHeader>
                <CardTitle>{review.format === "Meeting" ? "Attendance" : "Who reviewed it"}</CardTitle>
                {review.packSentOn && <span className="text-[0.8125rem] text-muted-foreground">Pack sent {review.packSentOn}</span>}
              </CardHeader>
              <ul>
                {everyone.map((n, i) => {
                  const s = review.status[n] ?? "Not opened"
                  const tone: BadgeTone = s === "Signed off" || s === "Present" ? "done" : s === "Commented" ? "progress" : s === "Apologies" ? "draft" : "draft"
                  return (
                    <li key={n} className={cn("flex items-center justify-between gap-3 px-5 py-2.5 text-sm", i > 0 && "border-t border-rule-soft")}>
                      <span className="flex flex-col">
                        <span>{n}</span>
                        {review.reviewers.includes(n) && <span className="text-xs text-muted-foreground">Top management</span>}
                      </span>
                      {review.packSentOn || !preparing ? <Badge tone={tone}>{s}</Badge> : <span className="text-xs text-muted-foreground">Pack not sent</span>}
                    </li>
                  )
                })}
              </ul>
            </Card>
            {!preparing && (
              <Card>
                <CardHeader>
                  <CardTitle>Record</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <KeyFacts
                    facts={[
                      { k: "Recorded", v: review.recordedOn ?? "Not yet" },
                      { k: "Sign-off", v: review.signOff ? `${review.signOff.by}, ${review.signOff.when}${review.signOff.how === "Signed scan" ? ", signed scan" : ", in iQMS"}` : "Waiting" },
                      ...(review.evidenceId ? [{ k: "Evidence", v: <Link to="/evidence" className="text-primary">{review.evidenceId}, clause 9.3</Link> }] : []),
                    ]}
                  />
                  {([["Signed record", review.signOff?.file], ["Notes or minutes", review.notesFile]] as const)
                    .filter(([, u]) => !!u)
                    .map(([label, u]) => (
                      <a key={label} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-sm border px-3 py-2 text-[0.8125rem] hover:border-input">
                        <FileTextIcon className="size-3.5 text-muted-foreground" />
                        <span className="flex-1">{label}</span>
                        <span className="text-xs text-primary">Open in SharePoint</span>
                      </a>
                    ))}
                  {review.signOff && <span className="text-xs text-muted-foreground">The record is locked. Changes need a new version with a reason.</span>}
                </CardContent>
              </Card>
            )}
          </>
        }
      />

      <Dialog open={signing} onOpenChange={setSigning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign off {review.id}</DialogTitle>
            <DialogDescription>You confirm you’ve reviewed the inputs and agree with the conclusion and decisions. The record then locks.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSigning(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                update("reviews", review.id, { signOff: { how: "In iQMS", by: user.name, when: "Today" }, status: { ...review.status, [user.name]: "Signed off" } })
                notify([review.preparedBy, ...review.others], { kind: "Comment", title: `${user.name} signed off ${review.id}`, body: "The management review record is final.", href: `/management-review/${review.id}` })
                setSigning(false)
                toast(`${review.id} signed off`)
              }}
            >
              Sign off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
