import * as React from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { PlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { liveFigure } from "@/lib/review-figures"
import type { ManagementReviewRecord, Nonconformity, ReviewAction, ReviewActionType, ReviewFormat, Verdict } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { PageHeader } from "@/components/app/page"
import { Field, PeopleOptions } from "@/components/app/form"
import { useAuthorName } from "@/components/app/remarks"
import NotFound from "@/pages/not-found"
import { FormatChoice } from "./list"
import { useReviewRights } from "./shared"

type Key = "suitable" | "adequate" | "effective" | "aligned"
const QUESTIONS: [Key, string][] = [
  ["suitable", "Is the QMS still suitable?"],
  ["adequate", "Is it adequate?"],
  ["effective", "Is it effective?"],
  ["aligned", "Is it in line with the company’s direction?"],
]
const TYPES: ReviewActionType[] = ["Improvement", "Change to the QMS", "Resource need"]

interface Decision {
  key: string
  text: string
  type: ReviewActionType
  owner: string
  due: string
  linked: string
  /** also raise a corrective action for it */
  openCa: boolean
}

function Segmented({ value, onChange, label }: { value?: Verdict; onChange: (v: Verdict) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 overflow-hidden rounded-sm border">
      {(["Yes", "Partly", "No"] as Verdict[]).map((v, i) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={cn("h-9 cursor-pointer text-[0.8125rem]", i > 0 && "border-l", value === v ? "bg-accent font-semibold text-primary" : "text-muted-foreground hover:bg-background")}>
          {v}
        </button>
      ))}
    </div>
  )
}

export default function RecordReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, update, add, user, notify, takenIds } = useStore()
  const review = state.reviews.find((r) => r.id === id)
  const { canManage } = useReviewRights(review)
  const who = useAuthorName()

  const [format, setFormat] = React.useState<ReviewFormat>(review?.format ?? "Meeting")
  const people = review ? [...review.reviewers, ...review.others] : []
  const [took, setTook] = React.useState<Record<string, boolean>>(() => Object.fromEntries(people.map((n) => [n, review?.status[n] !== "Apologies" && (review?.format === "Meeting" || review?.status[n] !== "Not opened")])))
  const [covered, setCovered] = React.useState<Record<string, string>>(() => Object.fromEntries((review?.inputs ?? []).map((i) => [i.ref, i.coveredIn ?? ""])))
  const [verdict, setVerdict] = React.useState<Partial<Record<Key, Verdict>>>({ ...(review?.conclusion ?? {}) } as Partial<Record<Key, Verdict>>)
  const [reasons, setReasons] = React.useState<Partial<Record<Key, string>>>(review?.conclusion?.reasons ?? {})
  const [summary, setSummary] = React.useState(review?.conclusion?.summary ?? "")
  const blank = (): Decision => ({ key: String(Math.random()), text: "", type: "Improvement", owner: review?.preparedBy ?? user.name, due: "", linked: "", openCa: false })
  const [decisions, setDecisions] = React.useState<Decision[]>([])
  const [signHow, setSignHow] = React.useState<"In iQMS" | "Signed scan">("In iQMS")
  const [scan, setScan] = React.useState("")
  const [notesFile, setNotesFile] = React.useState("")
  const [problems, setProblems] = React.useState<string[]>([])

  if (!review) return <NotFound />
  if (!canManage || review.stage === "Reviewed" || review.stage === "Closed") return <Navigate to={`/management-review/${review.id}`} replace />

  const alreadySigned = review.reviewers.find((n) => review.status[n] === "Signed off")
  const setDecision = (k: string, patch: Partial<Decision>) => setDecisions((d) => d.map((x) => (x.key === k ? { ...x, ...patch } : x)))
  const linkOptions = [...state.ncs.filter((n) => n.stage < 6).map((n) => ({ id: n.id, t: n.title })), ...state.risks.filter((r) => r.treatment !== "Closed").map((r) => ({ id: r.id, t: r.title })), ...state.documents.filter((d) => d.stage === "Published").map((d) => ({ id: d.id, t: d.title }))]

  function finish() {
    const p: string[] = []
    if (!review!.reviewers.some((n) => took[n])) p.push(format === "Meeting" ? "Top management must attend. Tick who was there." : "Top management must review it. Tick who reviewed it.")
    if (QUESTIONS.some(([k]) => !verdict[k])) p.push("Answer the four conclusion questions.")
    if (QUESTIONS.some(([k]) => verdict[k] && verdict[k] !== "Yes" && !reasons[k]?.trim())) p.push("Give a short reason for each Partly or No.")
    if (!summary.trim()) p.push("Write a short summary of the review.")
    if (format === "Several meetings" && review!.inputs.some((i) => !i.notApplicable && !covered[i.ref]?.trim())) p.push("Say which meeting covered each input.")
    const missing = review!.inputs.filter((i) => !i.notApplicable && (!i.note || i.draft))
    if (missing.length) p.push(`${missing.map((i) => i.ref).join(", ")} ${missing.length === 1 ? "has" : "have"} no confirmed note. Every input needs a note or “not applicable”, so the record shows each one was considered.`)
    if (decisions.some((d) => !d.text.trim())) p.push("Describe each decision, or remove the empty one.")
    const badLink = (u: string) => !!u.trim() && !/^https:\/\/\S+$/.test(u.trim())
    if (badLink(scan) || badLink(notesFile)) p.push("Links must be full https:// addresses, for example from SharePoint’s Copy link.")
    if (signHow === "Signed scan" && !scan) p.push("Paste the link to the signed record, or ask top management to sign off in iQMS.")
    setProblems(p)
    if (p.length) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    // decisions become tracked actions; some also raise a corrective action
    let ncIds = takenIds("ncs")
    let raIds = state.reviewActions.map((a) => a.id)
    for (const d of decisions) {
      let linked = d.linked || undefined
      if (d.openCa) {
        const ncId = nextId(ncIds, "NC-2026-")
        ncIds = [...ncIds, ncId]
        const nc: Nonconformity = { id: ncId, title: d.text.trim(), process: "Leadership & planning", clause: "9.3", source: `Management review ${review!.id}`, severity: "Minor", stage: 0, owner: d.owner, verifier: review!.preparedBy, due: d.due || "In 60 days", details: `Decision from management review ${review!.id}.`, containment: "", rootCause: "", tasks: [], raised: "Today" }
        add("ncs", nc)
        linked = ncId
      }
      const raId = nextId(raIds, "RA-", 2)
      raIds = [...raIds, raId]
      const a: ReviewAction = { id: raId, reviewId: review!.id, text: d.text.trim(), type: d.type, owner: d.owner, due: d.due || "Not set", linked, state: "Open" }
      add("reviewActions", a)
    }

    // the locked record is kept as evidence for clause 9.3
    const evId = nextId(takenIds("evidence"), "EV-", 4)
    add("evidence", { id: evId, clauses: ["9.3"], title: `Management review record ${review!.id}`, kind: "Record", processes: ["Leadership & planning"], addedBy: user.name, added: "Today", classification: "Internal", files: [{ name: `${review!.id} review record`, kind: "Link", url: `/management-review/${review!.id}` }, ...(scan ? [{ name: "Signed record", kind: "File" as const, url: scan.trim() }] : []), ...(notesFile ? [{ name: "Notes or minutes", kind: "Link" as const, url: notesFile.trim() }] : [])], usedIn: [review!.id] })

    const status = { ...review!.status }
    for (const n of people) status[n] = format === "Meeting" ? (took[n] ? "Present" : "Apologies") : status[n] === "Signed off" ? "Signed off" : took[n] ? (status[n] === "Not opened" ? "Read" : status[n]) : "Not opened"
    const signOff: ManagementReviewRecord["signOff"] = signHow === "Signed scan" ? { how: "Signed scan", by: review!.reviewers[0], when: "Today", file: scan } : alreadySigned ? { how: "In iQMS", by: alreadySigned, when: "Today" } : undefined
    if (signOff) status[signOff.by] = format === "Meeting" ? status[signOff.by] : "Signed off"

    update("reviews", review!.id, {
      format,
      stage: "Reviewed",
      recordedOn: "Today",
      status,
      signOff,
      notesFile: notesFile || undefined,
      evidenceId: evId,
      conclusion: { suitable: verdict.suitable!, adequate: verdict.adequate!, effective: verdict.effective!, aligned: verdict.aligned!, reasons, summary: summary.trim() },
      inputs: review!.inputs.map((i) => {
        const f = liveFigure(i.ref, state, review!)
        return { ...i, coveredIn: format === "Several meetings" ? covered[i.ref]?.trim() || undefined : i.coveredIn, frozen: f ? { value: f.value, detail: f.detail } : { value: "", detail: "No figure" } }
      }),
    })

    for (const d of decisions) notify([d.owner], { kind: "Assigned", title: `Action from ${review!.id}: ${d.text.trim()}`, body: d.due ? `Due ${d.due}.` : undefined, href: "/management-review" })
    if (!signOff) notify(review!.reviewers, { kind: "Waiting on you", title: `Sign off ${review!.id}`, body: "Read the conclusion and decisions, then sign off.", href: `/management-review/${review!.id}` })
    notify(people, { kind: "Comment", title: `${review!.id} has been recorded`, body: `${decisions.length} decision${decisions.length === 1 ? "" : "s"}.`, href: `/management-review/${review!.id}` })
    toast(`${review!.id} recorded`, { description: signOff ? `Locked and saved to Evidence as ${evId}.` : `Waiting for ${review!.reviewers.join(" and ")} to sign off.` })
    navigate(`/management-review/${review!.id}`)
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Management Review", to: "/management-review" }, { label: review.id, to: `/management-review/${review.id}` }, { label: "Record the review" }]}
        title="Record the review"
        description="Fill this in after the review, from your notes. It doesn’t have to be a meeting. Figures are frozen when you finish, so the record shows what top management saw."
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate(`/management-review/${review.id}`)}>
              Cancel
            </Button>
            <Button onClick={finish}>Finish and lock</Button>
          </>
        }
      />
      {problems.length > 0 && (
        <Alert tone="danger" title="Before you finish">
          <ul className="flex list-disc flex-col gap-1 pl-4">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How was it held?</CardTitle>
        </CardHeader>
        <CardContent>
          <FormatChoice value={format} onChange={setFormat} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>1. {format === "Meeting" ? "Who attended" : "Who reviewed it"}</CardTitle>
              <span className="text-[0.8125rem] text-muted-foreground">Top management must take part</span>
            </CardHeader>
            <ul>
              {people.map((n, i) => (
                <li key={n} className={cn("flex items-center gap-3 px-5 py-2.5", i > 0 && "border-t border-rule-soft")}>
                  <Checkbox id={`took-${i}`} checked={!!took[n]} onCheckedChange={(v) => setTook({ ...took, [n]: !!v })} />
                  <label htmlFor={`took-${i}`} className="flex flex-1 cursor-pointer flex-col">
                    <span className="text-sm">{n}</span>
                    <span className="text-xs text-muted-foreground">
                      {review.reviewers.includes(n) ? "Top management" : "Also involved"}
                      {format !== "Meeting" && review.status[n] && review.status[n] !== "Not opened" ? `, ${review.status[n]?.toLowerCase()} in iQMS` : ""}
                    </span>
                  </label>
                  {format === "Meeting" && !took[n] && <span className="text-xs text-muted-foreground">Apologies</span>}
                </li>
              ))}
            </ul>
          </Card>

          {format === "Several meetings" && (
            <Card>
              <CardHeader>
                <CardTitle>Where each input was covered</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">The meeting and date</span>
              </CardHeader>
              <ul>
                {review.inputs.map((inp, i) => (
                  <li key={inp.ref} className={cn("grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,16rem)] items-center gap-3 px-5 py-2", i > 0 && "border-t border-rule-soft")}>
                    <span className="text-xs font-semibold text-muted-foreground">{inp.ref}</span>
                    <span className="text-sm">{inp.name}</span>
                    {inp.notApplicable ? <span className="text-xs text-muted-foreground">Not applicable</span> : <Input value={covered[inp.ref] ?? ""} onChange={(e) => setCovered({ ...covered, [inp.ref]: e.target.value })} placeholder="Management meeting 12 Aug" aria-label={`Meeting that covered ${inp.ref}`} className="h-9" />}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {review.comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comments from the reviewers</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">Kept with the record</span>
              </CardHeader>
              <ul>
                {review.comments.map((c, i) => (
                  <li key={i} className={cn("flex flex-col gap-0.5 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    <span className="flex justify-between gap-3 text-[0.8125rem]">
                      <b>{c.ref} {review.inputs.find((x) => x.ref === c.ref)?.name}</b>
                      <span className="text-muted-foreground">{who(c.author)}, {c.when}</span>
                    </span>
                    <span className="text-sm">{c.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>2. Conclusion</CardTitle>
              <span className="text-[0.8125rem] text-muted-foreground">Clause 9.3, decided by top management</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {QUESTIONS.map(([k, q]) => (
                  <div key={k} className="flex flex-col gap-2">
                    <span className="text-[0.8125rem] font-semibold">{q}</span>
                    <Segmented label={q} value={verdict[k]} onChange={(v) => setVerdict({ ...verdict, [k]: v })} />
                    {verdict[k] && verdict[k] !== "Yes" && <Input value={reasons[k] ?? ""} onChange={(e) => setReasons({ ...reasons, [k]: e.target.value })} placeholder="Why, in a few words" aria-label={`Reason, ${q}`} className="h-9" />}
                  </div>
                ))}
              </div>
              <Field label="Summary" htmlFor="mr-sum">
                <Textarea id="mr-sum" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="The QMS works and most objectives are met. Supplier control is the weak point." className="min-h-20" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Decisions</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDecisions([...decisions, blank()])}>
                <PlusIcon /> Add decision
              </Button>
            </CardHeader>
            {decisions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No decisions yet. Add improvements, changes to the QMS and resource needs that top management agreed. Each becomes a tracked action.</p>
            ) : (
              <ul>
                {decisions.map((d, i) => (
                  <li key={d.key} className={cn("flex flex-col gap-3 px-5 py-4", i > 0 && "border-t border-rule-soft")}>
                    <div className="flex items-start gap-2">
                      <Input value={d.text} onChange={(e) => setDecision(d.key, { text: e.target.value })} placeholder="Supplier plan for on-time delivery" aria-label={`Decision ${i + 1}`} />
                      <button type="button" onClick={() => setDecisions(decisions.filter((x) => x.key !== d.key))} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary" aria-label={`Remove decision ${i + 1}`}>
                        <XIcon className="size-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <NativeSelect aria-label="Type" value={d.type} onChange={(e) => setDecision(d.key, { type: e.target.value as ReviewActionType })} className="h-9 text-[0.8125rem]">
                        {TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </NativeSelect>
                      <NativeSelect aria-label="Owner" value={d.owner} onChange={(e) => setDecision(d.key, { owner: e.target.value })} className="h-9 text-[0.8125rem]">
                        <PeopleOptions />
                      </NativeSelect>
                      <Input type="date" aria-label="Due" value={d.due} onChange={(e) => setDecision(d.key, { due: e.target.value })} className="h-9 text-[0.8125rem]" />
                      <NativeSelect aria-label="Linked record" value={d.linked} disabled={d.openCa} onChange={(e) => setDecision(d.key, { linked: e.target.value })} className="h-9 text-[0.8125rem]">
                        <option value="">No linked record</option>
                        {linkOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.id} {o.t}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem]">
                      <Checkbox checked={d.openCa} onCheckedChange={(v) => setDecision(d.key, { openCa: !!v, linked: "" })} />
                      Also raise a corrective action for it
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>4. Sign-off</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {(
                [
                  ["In iQMS", alreadySigned ? `${alreadySigned} signed off in iQMS` : `Ask ${review.reviewers.join(" and ")} to sign off in iQMS`, alreadySigned ? "Already done." : "They get a notification. The record locks when they sign."],
                  ["Signed scan", "Link the signed record", "Printed, signed by hand, scanned and saved in SharePoint."],
                ] as const
              ).map(([v, t, h]) => (
                <button key={v} type="button" role="radio" aria-checked={signHow === v} onClick={() => setSignHow(v)} className={cn("flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-left", signHow === v ? "border-primary bg-highlight" : "hover:border-input")}>
                  <span className={cn("mt-0.5 size-4 shrink-0 rounded-full border-[1.5px]", signHow === v ? "border-[5px] border-primary" : "border-input")} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{t}</span>
                    <span className="text-xs text-muted-foreground">{h}</span>
                  </span>
                </button>
              ))}
              {signHow === "Signed scan" && (
                <Input value={scan} onChange={(e) => setScan(e.target.value)} placeholder="https://yourcompany.sharepoint.com/…/signed-record.pdf" aria-label="Link to the signed record" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <span className="text-[0.8125rem] text-muted-foreground">Optional</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Input value={notesFile} onChange={(e) => setNotesFile(e.target.value)} placeholder="https://yourcompany.sharepoint.com/…" aria-label="Link to notes or minutes" />
              <span className="text-xs text-muted-foreground">Meeting notes, or the emails where top management replied.</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>When you finish</CardTitle>
            </CardHeader>
            <ul className="text-[0.8125rem]">
              {["Figures freeze as they are now", "The record is saved to Evidence under 9.3", "Owners are told about their actions", "Everyone involved gets the record"].map((t, i) => (
                <li key={t} className={cn("px-5 py-2.5", i > 0 && "border-t border-rule-soft")}>
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
