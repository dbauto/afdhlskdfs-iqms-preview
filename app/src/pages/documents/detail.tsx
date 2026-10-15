import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ExternalLinkIcon, LockIcon, PencilIcon, Share2Icon } from "lucide-react"
import { toast } from "sonner"

import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { DOC_STAGES, isLocked } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/input"
import { KeyFacts, LifecycleTrack, MetaLine, PageHeader, RecordLayout, YourStep } from "@/components/app/page"
import { ClassificationTag, docStep, docTone } from "@/components/app/status"
import { ConfirmRemove } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"
import NotFound from "@/pages/not-found"
import { LinkedEvidence } from "@/components/app/linked-evidence"
import { DocSheet } from "./doc-sheet"
import { RevisionSheet } from "./revision-sheet"
import { ShareDialog } from "./share-dialog"
import { removeKindFor } from "./register"

const WHEN: Record<string, string[]> = {
  "OPS-WI-014": ["12 Sep", "Done 3 Oct", "Due 15 Oct", "", ""],
}

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, user, update, remove, can, canSee: classificationAllows, notify } = useStore()
  const doc = state.documents.find((d) => d.id === id)
  const [edit, setEdit] = React.useState(false)
  const [revising, setRevising] = React.useState(false)
  const [share, setShare] = React.useState(false)
  const [changes, setChanges] = React.useState(false)
  const [changeNote, setChangeNote] = React.useState("")
  const [confirm, setConfirm] = React.useState(false)
  const [comment, setComment] = React.useState("")
  const [comments, setComments] = React.useState(() =>
    id === "OPS-WI-014"
      ? [
          { who: "Nina Flores", when: "3 Oct", text: "Numbering, references to OPS-PRO-001 and the form numbers are all correct. Passed to Maria for approval." },
          { who: "Carlos Mendoza", when: "3 Oct", text: "Thanks. Supervisors on line 2 have already trialled the new sign-off for two weeks." },
        ]
      : []
  )

  if (!doc || !classificationAllows(doc.classification, doc.viewers)) return <NotFound />

  const locked = isLocked(doc.classification)
  const canSee = !locked || doc.viewers.includes(user.name) || doc.owner === user.name
  const step = docStep(doc)
  const when = WHEN[doc.id] ?? []
  const isApprover = doc.approvers.includes(user.name) && doc.stage === "Approval"
  const canPublish = doc.stage === "Ready to publish" && can("Documents", "Manage")
  const canEdit = can("Documents", "Add and edit")

  const crumbs = [{ label: "Documents", to: "/documents" }, { label: doc.id }]

  if (!canSee) {
    return (
      <>
        <PageHeader breadcrumbs={crumbs} title={doc.id} meta={<MetaLine parts={[doc.type, doc.process, `Owner ${doc.owner}`]} />} badge={<Badge tone="solid"><LockIcon /> {doc.classification}</Badge>} />
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-[0.9375rem] font-semibold">This record is {doc.classification.toLowerCase()}</p>
            <p className="max-w-xl text-sm leading-normal text-muted-foreground">
              Only named people can see its title, description and link. Ask {doc.owner} if you need it for your work. They can share it with you for a set time.
            </p>
            <Button variant="outline" onClick={() => toast(`Request sent to ${doc.owner}`)}>
              Ask {doc.owner.split(" ")[0]} for access
            </Button>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={crumbs}
        title={doc.title}
        badge={<Badge tone={docTone(doc)}>{isApprover ? "Waiting on your approval" : doc.stage}</Badge>}
        meta={<MetaLine parts={[doc.id, doc.type, `Revision ${doc.rev}`, <ClassificationTag key="c" value={doc.classification} />]} />}
        actions={
          <>
            <Button variant="outline" onClick={() => setShare(true)}>
              <Share2Icon /> Share
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => setEdit(true)}>
                <PencilIcon /> Edit
              </Button>
            )}
            {canEdit && doc.stage === "Published" && <Button onClick={() => setRevising(true)}>Start new revision</Button>}
            {isApprover && (
              <>
                <Button variant="outline" onClick={() => setChanges(true)}>
                  Request changes
                </Button>
                <Button
                  onClick={() => {
                    update("documents", doc.id, { stage: "Ready to publish" })
                    notify(["Nina Flores"], { kind: "Waiting on you", title: `Publish ${doc.id} revision ${doc.rev}`, body: `${doc.title}. Approved by ${user.name}.`, href: `/documents/${doc.id}` })
                    notify([doc.owner], { kind: "Comment", title: `${doc.id} revision ${doc.rev} approved`, body: `${user.name} approved it. It’s ready to publish.`, href: `/documents/${doc.id}` })
                    toast(`Revision ${doc.rev} approved`, { description: "Nina Flores will publish it." })
                  }}
                >
                  Approve revision
                </Button>
              </>
            )}
            {canPublish && (
              <Button
                onClick={() => {
                  update("documents", doc.id, { stage: "Published", lateBy: undefined })
                  notify([doc.owner, ...(doc.reviewers ?? []), ...(doc.approvers ?? [])], { kind: "Comment", title: `${doc.id} revision ${doc.rev} is published`, body: `${doc.title} is now the controlled version.`, href: `/documents/${doc.id}` })
                  toast(`${doc.id} revision ${doc.rev} published`, { description: "It is now the controlled version." })
                }}
              >
                Publish
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="py-5">
          <LifecycleTrack steps={DOC_STAGES.map((s, i) => ({ label: s === "Approval" && doc.stage === "Changes requested" ? "Changes requested" : s, when: when[i] }))} current={step} late={!!doc.lateBy} />
        </CardContent>
      </Card>

      {isApprover && (
        <YourStep title="Your step: approve or ask for changes" due="Due 15 Oct, 2 days from now" tone="soon">
          {doc.reviewers.join(", ")} finished the technical review with no issues. Open the file, check the changes below, then approve. Revision {String(parseInt(doc.rev, 10) - 1).padStart(2, "0")} stays the controlled version until revision {doc.rev} is published.
        </YourStep>
      )}

      <RemarkBanner kind={"Document"} id={doc.id} />
      <RecordLayout
        main={
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <span className="flex size-11 items-center justify-center rounded-md bg-background text-xs font-semibold">{locked ? <LockIcon className="size-4" /> : "DOCX"}</span>
                <span className="flex min-w-[220px] flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">{locked ? "Link only. ThryveMS does not open this file." : `${doc.title}.docx, revision ${doc.rev}`}</span>
                  <span className="truncate text-[0.8125rem] text-muted-foreground">{doc.link}</span>
                </span>
                <Button variant="outline" asChild>
                  <a href={doc.link} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon /> Open in SharePoint
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About this document</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
                <p>{doc.description}</p>
                {locked && <Alert tone="warning">The description must not include anything from inside the file. Keep the file’s SharePoint sharing limited to the named people.</Alert>}
              </CardContent>
            </Card>

            {doc.id === "OPS-WI-014" && (
              <Card>
                <CardHeader>
                  <CardTitle>What changed</CardTitle>
                  <span className="text-[0.8125rem] text-muted-foreground">Carlos Mendoza, 12 Sep</span>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
                  <ul className="list-disc pl-5">
                    <li>Added a second-person sign-off before the first part of a new batch is run.</li>
                    <li>Labels from the previous batch must be counted back to stores, not binned.</li>
                    <li>New photo guide showing a cleared line, attached as appendix A.</li>
                  </ul>
                  <p className="text-muted-foreground">
                    Reason: corrective action{" "}
                    <Link to="/corrective-action" className="text-primary">
                      CA-2026-03
                    </Link>{" "}
                    after mixed labels were found on line 2.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <ul>
                {comments.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No comments yet.</li>}
                {comments.map((c, i) => (
                  <li key={i} className={cn("flex gap-3 px-5 py-4", i > 0 && "border-t border-rule-soft")}>
                    <Avatar name={c.who} size={30} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm">
                        <span className="font-semibold">{c.who}</span> <span className="text-muted-foreground">{c.when}</span>
                      </span>
                      <p className="text-sm leading-relaxed">{c.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                className="flex flex-col gap-2 border-t px-5 py-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!comment.trim()) return
                  setComments((c) => [...c, { who: user.name, when: "Just now", text: comment.trim() }])
                  setComment("")
                }}
              >
                <label htmlFor="doc-comment" className="sr-only">
                  Add a comment
                </label>
                <Textarea id="doc-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" className="min-h-20" />
                <Button type="submit" variant="outline" size="sm" className="self-end">
                  Add comment
                </Button>
              </form>
            </Card>
            <RemarksPanel target={{ kind: "Document", id: doc.id, label: `${doc.id} ${doc.title}`, to: `/documents/${doc.id}`, area: "Documents" }} />
          </>
        }
        side={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="py-1">
                <KeyFacts
                  facts={[
                    { k: "Process", v: <Link to="/qms/processes" className="text-primary">{doc.process}</Link> },
                    { k: "Clauses", v: doc.clauses.join(", ") || "Not set" },
                    { k: "Owner", v: doc.owner },
                    { k: "Technical review", v: doc.reviewers.join(", ") },
                    { k: "Approval", v: `${doc.approvers.join(", ")}${doc.approvers.length > 1 ? `, ${doc.approvalMode.toLowerCase()}` : ""}` },
                    ...(locked ? [{ k: "Can see it", v: doc.viewers.join(", ") }] : []),
                    { k: "Next review", v: <span className={doc.reviewOverdue ? "font-semibold text-overdue" : undefined}>{doc.nextReview}</span> },
                  ]}
                />
              </CardContent>
            </Card>

            <LinkedEvidence recordId={doc.id} process={doc.process} label={doc.title} clauses={doc.clauses} />

            <Card>
              <CardHeader>
                <CardTitle>Revisions</CardTitle>
              </CardHeader>
              <ul>
                {[
                  { no: doc.rev, state: doc.stage === "Published" ? "Published, in force" : `In ${doc.stage.toLowerCase()}`, tone: doc.stage === "Published" ? ("done" as const) : ("progress" as const), meta: doc.stage === "Published" ? "Current controlled version" : doc.changeNote ? `Started by ${doc.startedBy}: ${doc.changeNote}` : "Started 12 Sep 2026" },
                  ...(parseInt(doc.rev, 10) > 1
                    ? [{ no: String(parseInt(doc.rev, 10) - 1).padStart(2, "0"), state: doc.stage === "Published" ? "Superseded" : "Published, in force", tone: doc.stage === "Published" ? ("draft" as const) : ("done" as const), meta: "22 Apr 2026, approved by Maria Santos" }]
                    : []),
                ].map((r, i) => (
                  <li key={r.no} className={cn("flex items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    <span className="w-8 text-sm font-semibold">{r.no}</span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <Badge tone={r.tone} className="self-start">
                        {r.state}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{r.meta}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {canEdit && (
              <Button variant="destructive" className="self-start" onClick={() => setConfirm(true)}>
                {removeKindFor(doc) === "delete" ? "Delete draft" : removeKindFor(doc) === "archive" ? "Move to archive" : "Withdraw revision"}
              </Button>
            )}
          </>
        }
      />

      <DocSheet open={edit} onOpenChange={setEdit} doc={doc} />
      <RevisionSheet doc={revising ? doc : undefined} onClose={() => setRevising(false)} />
      <ShareDialog open={share} onOpenChange={setShare} doc={doc} />
      <ConfirmRemove
        open={confirm}
        onOpenChange={setConfirm}
        kind={removeKindFor(doc)}
        name={doc.id}
        onConfirm={() => {
          if (removeKindFor(doc) === "delete") remove("documents", doc.id)
          else update("documents", doc.id, { stage: "Archived" })
          navigate("/documents")
        }}
      />

      <Dialog open={changes} onOpenChange={setChanges}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes to {doc.id}</DialogTitle>
            <DialogDescription>{doc.owner} gets your note and the revision goes back to them. The current revision stays in force.</DialogDescription>
          </DialogHeader>
          <Field label="What needs to change" htmlFor="chg">
            <Textarea id="chg" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChanges(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!changeNote.trim()) return
                update("documents", doc.id, { stage: "Changes requested" })
                notify([doc.owner], { kind: "Waiting on you", title: `Changes requested on ${doc.id}`, body: changeNote.trim(), href: `/documents/${doc.id}` })
                setComments((c) => [...c, { who: user.name, when: "Just now", text: `Changes requested: ${changeNote.trim()}` }])
                setChanges(false)
                setChangeNote("")
                toast(`Changes requested from ${doc.owner}`)
              }}
            >
              Send to {doc.owner.split(" ")[0]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

