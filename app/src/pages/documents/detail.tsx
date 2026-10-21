import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { ExternalLinkIcon, LockIcon, PencilIcon, Share2Icon } from "lucide-react"
import { toast } from "sonner"

import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import { useStore } from "@/lib/store"
import { controlledRevision, documentRights, revisionVisible } from "@/lib/document-control"
import { formatDate } from "@/lib/periods"
import { RevisionHistory } from "./revision-history"
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
  const { state, user, role, documentCommand, remove, can, canSee: classificationAllows, notify } = useStore()
  const doc = state.documents.find((d) => d.id === id)
  const [effectivityOpen, setEffectivityOpen] = React.useState(false)
  const [effectivityReason, setEffectivityReason] = React.useState("")
  const [actionError, setActionError] = React.useState("")
  const acting = React.useRef(false)
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

  if (!doc || !can("Documents") || !classificationAllows(doc.classification, doc.viewers, doc.owner, [...doc.reviewers, ...doc.approvers]) || !documentRights(state, user, doc).view) return <NotFound />

  const locked = isLocked(doc.classification)
  const canSee = !locked || doc.viewers.includes(user.name) || doc.owner === user.name
  const step = docStep(doc)
  const when = WHEN[doc.id] ?? []
  const isApprover = doc.approvers.includes(user.name) && doc.stage === "Approval" && !doc.approvedBy?.includes(user.name) && user.name !== doc.startedBy && role.id !== "consultant" && ["Approve", "Manage"].includes(role.access.Documents)
  const rights = documentRights(state, user, doc)
  const recordedControlled = controlledRevision(doc)
  const controlled = recordedControlled && revisionVisible(recordedControlled, user, role) ? recordedControlled : undefined
  const isReviewer = doc.stage === "Technical review" && doc.reviewers.includes(user.name) && !doc.reviewedBy?.includes(user.name) && role.id !== "consultant" && ["Add and edit", "Approve", "Manage"].includes(role.access.Documents)
  const canPublish = doc.stage === "Ready to publish" && rights.manage
  const canEdit = rights.edit
  function command(kind: "review" | "approve" | "publish") {
    if (acting.current) return false
    acting.current = true
    try { documentCommand({ kind, id: doc!.id, expectedRev: doc!.rev }); return true }
    catch (e) { toast.error((e as Error).message); return false }
    finally { queueMicrotask(() => { acting.current = false }) }
  }

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
        badge={<span className="flex flex-wrap gap-2"><Badge tone={docTone(doc)}>{isApprover ? "Waiting on your approval" : doc.stage}</Badge>{controlled?.effectivity === "Suspended" && <Badge tone="soon">Effectivity suspended</Badge>}</span>}
        meta={<MetaLine parts={[doc.id, doc.type, `Revision ${doc.rev}`, <ClassificationTag key="c" value={doc.classification} />]} />}
        actions={
          <>
            <Button variant="outline" onClick={() => setShare(true)}>
              <Share2Icon /> Share
            </Button>
            {rights.draft && (
              <Button variant="outline" onClick={() => setEdit(true)}>
                <PencilIcon /> Edit
              </Button>
            )}
            {canEdit && doc.stage === "Published" && <Button onClick={() => setRevising(true)}>Start new revision</Button>}
            {isReviewer && <Button onClick={() => { if (command("review")) { if (doc.reviewers.every(n => n === user.name || doc.reviewedBy?.includes(n))) notify(doc.approvers, { kind: "Waiting on you", title: `Review completed for ${doc.id} revision ${doc.rev}`, href: `/documents/${doc.id}` }); toast("Technical review recorded") } }}>Complete technical review</Button>}
            {isApprover && (
              <>
                <Button variant="outline" onClick={() => setChanges(true)}>
                  Request changes
                </Button>
                <Button
                  onClick={() => {
                    if (!command("approve")) return
                    const remaining = doc.approvers.filter(n => n !== user.name && !doc.approvedBy?.includes(n))
                    if (doc.approvalMode !== "Any one of them" && remaining.length) {
                      toast("Approval recorded", { description: `Waiting for ${remaining.join(", ")}.` })
                      return
                    }
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
                  if (!command("publish")) return
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

      {controlled?.effectivity === "Suspended" && <Alert tone="warning" title={`Revision ${controlled.rev} is not in force`}>Effectivity is suspended. Read the reason in Revisions → View more before using this document.</Alert>}
      <RemarkBanner kind={"Document"} id={doc.id} />
      <RecordLayout
        main={
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <span className="flex size-11 items-center justify-center rounded-md bg-background text-xs font-semibold">{locked ? <LockIcon className="size-4" /> : "DOCX"}</span>
                <span className="flex min-w-0 basis-48 flex-1 flex-col gap-0.5">
                  <span className="break-words text-sm font-medium">{locked ? "Link only. ThryveMS does not open this file." : `${doc.title}.docx, revision ${doc.rev}`}</span>
                  <span className="truncate text-[0.8125rem] text-muted-foreground">{doc.link}</span>
                </span>
                <Button variant="outline" asChild>
                  <a href={doc.link} target="_blank" rel="noopener noreferrer">
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
                    { k: "Published on", v: formatDate(controlled?.publishedOn) || "No data" },
                    { k: "Effective revision", v: controlled ? `${controlled.rev} · ${controlled.effectivity ?? "Effective"}` : "None recorded" },
                    { k: "Next review", v: <span className={doc.reviewOverdue ? "font-semibold text-overdue" : undefined}>{doc.nextReview}</span> },
                  ]}
                />
              </CardContent>
            </Card>

            {rights.manage && controlled && <div className="flex flex-col gap-2"><Button variant={controlled.effectivity === "Suspended" ? "outline" : "destructive"} className="self-start" onClick={() => { setEffectivityReason(""); setActionError(""); setEffectivityOpen(true) }}>{controlled.effectivity === "Suspended" ? "Resume effectivity" : "Suspend effectivity"}</Button><p className="text-xs text-muted-foreground">Applies to controlled revision {controlled.rev}; its publication date and history are retained.</p></div>}
            <LinkedEvidence recordId={doc.id} process={doc.process} label={doc.title} clauses={doc.clauses} />

            <RevisionHistory doc={doc} />

            {(rights.draft || rights.manage) && doc.stage !== "Archived" && (
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
          else documentCommand({ kind: removeKindFor(doc) === "archive" ? "archive" : "withdraw", id: doc.id, expectedRev: doc.rev })
          navigate("/documents")
        }}
      />

      <Dialog open={effectivityOpen} onOpenChange={setEffectivityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{controlled?.effectivity === "Suspended" ? "Resume effectivity" : "Suspend effectivity"}</DialogTitle><DialogDescription>{doc.id}, controlled revision {controlled?.rev}. This changes whether the revision may be used, preserves its publication date and does not delete or publish content.</DialogDescription></DialogHeader>
          <Field label="Reason" htmlFor="effectivity-reason" error={actionError}><Textarea id="effectivity-reason" value={effectivityReason} onChange={e => setEffectivityReason(e.target.value)} /></Field>
          <DialogFooter><Button variant="ghost" onClick={() => setEffectivityOpen(false)}>Cancel</Button><Button disabled={!effectivityReason.trim()} onClick={() => {
            if (!controlled || acting.current) return
            acting.current = true
            const suspend = controlled.effectivity !== "Suspended"
            try {
              documentCommand({ kind: "effectivity", id: doc.id, expectedRev: doc.rev, revision: controlled.rev, suspend, reason: effectivityReason })
              notify([doc.owner, ...doc.reviewers, ...doc.approvers], { kind: "Comment", title: `${doc.id} revision ${controlled.rev}: effectivity ${suspend ? "suspended" : "resumed"}`, body: effectivityReason.trim(), href: `/documents/${doc.id}` })
              setEffectivityOpen(false)
              toast(suspend ? "Effectivity suspended" : "Effectivity resumed")
            } catch (e) { setActionError((e as Error).message) }
            finally { queueMicrotask(() => { acting.current = false }) }
          }}>{controlled?.effectivity === "Suspended" ? "Resume effectivity" : "Suspend effectivity"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
                try { documentCommand({ kind: "requestChanges", id: doc.id, expectedRev: doc.rev, reason: changeNote }) } catch (e) { toast.error((e as Error).message); return }
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

