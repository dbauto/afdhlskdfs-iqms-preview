import * as React from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { sharedRecords } from "@/lib/access-requests"
import { formatDate } from "@/lib/periods"
import { cn } from "@/lib/utils"
import type { AccessRequest } from "@/data/types"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { EmptyLine, KeyFacts, MetaLine, PageHeader, RecordLayout, YourStep } from "@/components/app/page"
import { RecordLink } from "@/components/app/record-link"
import NotFound from "@/pages/not-found"

const TONE: Record<AccessRequest["status"], BadgeTone> = { Waiting: "soon", Granted: "done", Declined: "draft" }

/**
 * One access request. The owner it was sent to decides here: a record request opens that record;
 * a process request lists the process's shared records to tick, with Select all.
 * The person who asked sees the decision and links to what was opened.
 */
export default function AccessRequestPage() {
  const { id } = useParams()
  const { state, user, decideAccess } = useStore()
  // state only holds requests this person made or was asked to decide
  const q = state.accessRequests.find((x) => x.id === id)
  const options = React.useMemo(() => (q ? (q.scope === "Process" ? sharedRecords(state, q.process) : sharedRecords(state, q.process).filter((r) => r.id === q.targetId)) : []), [q, state])
  const [picked, setPicked] = React.useState<string[]>(() => (q?.scope === "Record" ? [q.targetId] : q ? [q.targetId] : []))
  const [declining, setDeclining] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState("")
  const acting = React.useRef(false)

  if (!q) return <NotFound />
  const deciding = q.decider === user.name && q.status === "Waiting"
  const allPicked = options.length > 0 && options.every((o) => picked.includes(o.id))
  const what = q.scope === "Process" ? `Shared records in ${q.process}` : q.targetId
  const kindOf = (k: "Document" | "Evidence") => (k === "Document" ? "document" : "evidence") as "document" | "evidence"

  function decide(decision: { grant: string[] } | { decline: string }) {
    if (acting.current) return
    acting.current = true
    try {
      decideAccess(q!.id, decision)
      toast("grant" in decision ? "Access given" : "Request declined", { description: `${q!.person} will get a notification.` })
      setDeclining(false)
    } catch (e) {
      setError((e as Error).message)
    }
    acting.current = false
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My tasks", to: "/my-tasks" }, { label: "Access request" }]}
        title={`Access to ${what}`}
        badge={<Badge tone={TONE[q.status]}>{q.status}</Badge>}
        meta={<MetaLine parts={[`Asked by ${q.person}`, formatDate(q.requestedOn)]} />}
      />
      <RecordLayout
        main={
          <>
            {deciding && (
              <YourStep title={q.scope === "Process" ? "Your step: choose what to share" : "Your step: share it or decline"}>
                <p className="text-sm">
                  {q.scope === "Process"
                    ? `${q.person} asked for the shared records of ${q.process}. Tick what they need. Their role stays the same, and they get view access to the ticked records only.`
                    : `${q.person} asked to view ${q.targetId}. Their role stays the same.`}
                </p>
              </YourStep>
            )}
            <Card>
              <CardHeader>
                <CardTitle>{q.status === "Granted" ? "Shared" : q.scope === "Process" ? "Shared records in this process" : "Record"}</CardTitle>
                {deciding && q.scope === "Process" && options.length > 0 && (
                  <label className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                    <Checkbox checked={allPicked} onCheckedChange={(v) => setPicked(v ? options.map((o) => o.id) : [])} aria-label="Select all" />
                    Select all
                  </label>
                )}
              </CardHeader>
              <ul>
                {(q.status === "Granted" ? options.filter((o) => q.granted?.includes(o.id)) : options).map((o, i) => (
                  <li key={o.id} className={cn("flex items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    {deciding && q.scope === "Process" && (
                      <Checkbox
                        checked={picked.includes(o.id)}
                        onCheckedChange={(v) => setPicked(v ? [...picked, o.id] : picked.filter((x) => x !== o.id))}
                        aria-label={`Share ${o.id}`}
                      />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <RecordLink kind={kindOf(o.kind)} id={o.id} className="self-start text-[0.8125rem]" />
                      {(deciding || q.status === "Granted") && <span className="truncate text-sm">{o.title}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{o.meta}</span>
                  </li>
                ))}
                {options.length === 0 && <EmptyLine title="Nothing to share" body="This process has no Public or Internal records now. Confidential records are shared by naming people on them." />}
              </ul>
            </Card>
            {deciding && declining && (
              <Card>
                <CardContent className="py-4">
                  <Field label="Why you’re declining" htmlFor="ar-reason" optional>
                    <Textarea id="ar-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ask Carlos, who owns that work instruction." />
                  </Field>
                </CardContent>
              </Card>
            )}
            {error && <p className="text-[0.8125rem] text-overdue">{error}</p>}
            {deciding && (
              <div className="flex flex-wrap justify-end gap-2">
                {declining ? (
                  <>
                    <Button variant="ghost" onClick={() => setDeclining(false)}>Cancel</Button>
                    <Button variant="outline" onClick={() => decide({ decline: reason })}>Decline request</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setDeclining(true)}>Decline</Button>
                    <Button disabled={q.scope === "Process" && picked.length === 0} onClick={() => decide({ grant: q.scope === "Process" ? picked : [q.targetId] })}>
                      {q.scope === "Process" ? `Share ${picked.length === 1 ? "1 record" : `${picked.length} records`}` : `Share ${q.targetId}`}
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        }
        side={
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "Asked by", v: q.person },
                  { k: "Asked for", v: q.scope === "Process" ? `Shared records in ${q.process}` : `${q.targetId} only` },
                  { k: "Decides", v: q.decider },
                  { k: "Why", v: q.note ?? "No reason given" },
                  ...(q.decidedOn ? [{ k: q.status === "Granted" ? "Shared on" : "Declined on", v: formatDate(q.decidedOn) }] : []),
                  ...(q.reason ? [{ k: "Reason", v: q.reason }] : []),
                ]}
              />
            </CardContent>
          </Card>
        }
      />
    </>
  )
}
