import * as React from "react"
import { useParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { FileTextIcon, PencilIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import { addDays, formatDate, todayIso } from "@/lib/periods"
import { RULES } from "@/lib/rules"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { NC_STAGES, type TaskItem } from "@/data/types"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { KeyFacts, LifecycleTrack, MetaLine, PageHeader, RecordLayout, YourStep } from "@/components/app/page"
import { SeverityBadge, ncTone } from "@/components/app/status"
import { Field, PeopleOptions, PeoplePicker } from "@/components/app/form"
import NotFound from "@/pages/not-found"
import { LinkedEvidence } from "@/components/app/linked-evidence"
import { NcSheet } from "./nc-sheet"
import { NcRisks } from "./nc-risks"

const WHEN_005 = ["18 Jun", "20 Jun", "2 Jul", "2 Sep", "Due 17 Oct", "From 15 Jan", ""]

/** What the next step asks for, by current stage */
const NEXT: Record<number, { title: string; button: string; field?: string; help: string }> = {
  0: { title: "Next step: contain the problem", button: "Record containment", field: "What was done straight away", help: "Stop it getting worse or reaching a customer. Say what was checked and what was found." },
  1: { title: "Next step: find the root cause and plan the action", button: "Record root cause", field: "Root cause", help: "Ask why until you reach something you can fix. Then add the tasks that remove the cause." },
  2: { title: "Next step: carry out the action", button: "Mark action done", help: "Tick each task as it is done. When all are done, ask for verification." },
  3: { title: "Next step: ask for verification", button: "Ask for verification", help: "The verifier checks the action was carried out as planned." },
  4: { title: "Your step: check the action was carried out", button: "Record verification", field: "What you checked", help: "Confirm the tasks are done and the evidence shows it. Effectiveness is checked separately, after the wait set in Settings › QMS rules." },
  5: { title: "Next step: check the action worked", button: "Close as effective", field: "How you know it worked", help: "Look for repeats since the action. If it happened again, reopen and find a better fix." },
}

export default function NonconformityDetail() {
  const { id } = useParams()
  const { state, update, user, notify } = useStore()
  const nc = state.ncs.find((n) => n.id === id)
  const [edit, setEdit] = React.useState(false)
  const [stepOpen, setStepOpen] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [taskOpen, setTaskOpen] = React.useState(false)
  const [task, setTask] = React.useState<{ name: string; accountable: string; helpers: string[]; due: string }>({ name: "", accountable: "Paolo Ramos", helpers: [], due: "" })
  const [activity, setActivity] = React.useState(() =>
    id === "NC-2026-005"
      ? [
          { who: "Paolo Ramos", what: "marked the corrective action done and asked for verification", when: "2 Sep, 16:20" },
          { who: "Carlos Mendoza", what: "completed “Name an equipment owner for each area”", when: "20 Aug, 09:05" },
          { who: "Maria Santos", what: "accepted the root cause and action plan", when: "4 Jul, 11:40" },
          { who: "Paolo Ramos", what: "recorded containment", when: "20 Jun, 14:10" },
          { who: "Maria Santos", what: "raised this nonconformity from audit IA-2026-02", when: "18 Jun, 15:10" },
        ]
      : [{ who: "Maria Santos", what: "raised this nonconformity", when: "Earlier" }]
  )

  if (!nc) return <NotFound />

  const closed = nc.stage === 6
  const next = NEXT[nc.stage]
  const isVerifier = nc.verifier === user.name
  const yourTurn = (nc.stage === 4 && isVerifier) || (nc.stage !== 4 && nc.owner === user.name)
  const tasksDone = nc.tasks.filter((t) => t.done).length
  // effectiveness can only be judged once the action has had time to work
  const effectiveFrom = nc.stage === 5 && nc.verifiedDate ? addDays(nc.verifiedDate, RULES.effectiveAfter) : undefined
  const waitUntil = effectiveFrom && effectiveFrom > todayIso() ? effectiveFrom : undefined

  function log(what: string) {
    setActivity((a) => [{ who: user.name, what, when: "Just now" }, ...a])
  }

  function advance() {
    if (next.field && !note.trim()) return
    const patch: Partial<typeof nc> = { stage: Math.min(6, nc!.stage + 1) }
    if (nc!.stage === 0) patch.containment = note.trim()
    if (nc!.stage === 1) patch.rootCause = note.trim()
    if (nc!.stage === 2) patch.tasks = nc!.tasks.map((t) => ({ ...t, done: true }))
    if (nc!.stage === 4) patch.verifiedDate = todayIso()
    if (nc!.stage === 5) {
      patch.due = "Closed today"
      patch.closedDate = todayIso()
    }
    update("ncs", nc!.id, patch)
    const href = `/corrective-action/${nc!.id}`
    if (nc!.stage === 3) notify([nc!.verifier], { kind: "Waiting on you", title: `Verify ${nc!.id} ${nc!.title}`, body: `${user.name} says the action is done. Check it was carried out.`, href })
    if (nc!.stage === 4) notify([nc!.owner], { kind: "Comment", title: `${nc!.id} verified`, body: `Check it worked from ${formatDate(addDays(todayIso(), RULES.effectiveAfter))}.`, href })
    if (nc!.stage === 5) notify([nc!.owner, nc!.verifier], { kind: "Comment", title: `${nc!.id} closed as effective`, href })
    log(next.button.toLowerCase())
    toast(`${nc!.id}: ${NC_STAGES[Math.min(6, nc!.stage + 1)]}`)
    setNote("")
    setStepOpen(false)
  }

  const sections = [
    { title: "What was found", by: nc.raised ? `Raised ${nc.raised}` : "", body: nc.details || "No details recorded yet. Edit the nonconformity to add them." },
    ...(nc.containment || nc.stage >= 1 ? [{ title: "Containment", by: "", body: nc.containment || "Not recorded." }] : []),
    ...(nc.rootCause || nc.stage >= 2 ? [{ title: "Root cause", by: "", body: nc.rootCause || "Not recorded." }] : []),
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Corrective Action", to: "/corrective-action" }, { label: "Nonconformities", to: "/corrective-action" }, { label: nc.id }]}
        title={nc.title}
        badge={<Badge tone={ncTone(nc)}>{closed ? "Closed" : nc.stage === 4 && isVerifier ? "Waiting on your verification" : NC_STAGES[nc.stage]}</Badge>}
        meta={<MetaLine parts={[nc.id, <SeverityBadge key="s" value={nc.severity} />, `Clause ${nc.clause}`, nc.process]} />}
        actions={
          !closed && (
            <>
              <Button variant="outline" onClick={() => setEdit(true)}>
                <PencilIcon /> Edit
              </Button>
              {yourTurn && next && (
                <Button disabled={!!waitUntil} title={waitUntil ? `You can check effectiveness from ${formatDate(waitUntil)}` : undefined} onClick={() => (next.field ? setStepOpen(true) : advance())}>
                  {next.button}
                </Button>
              )}
            </>
          )
        }
      />

      <Card>
        <CardContent className="py-5">
          <LifecycleTrack steps={NC_STAGES.map((label, i) => ({ label, when: nc.id === "NC-2026-005" ? WHEN_005[i] : i === nc.stage && !closed ? `Due ${nc.due}` : undefined }))} current={closed ? 7 : nc.stage} late={nc.late} />
        </CardContent>
      </Card>

      {!closed && next && (
        <YourStep title={next.title} due={`Due ${nc.due}`} tone={nc.late ? "overdue" : yourTurn ? "soon" : "progress"}>
          {nc.id === "NC-2026-005" && nc.stage === 4
            ? "Paolo Ramos submitted the corrective action on 2 Sep. Confirm the three tasks below are done and the equipment register now shows reminders. Effectiveness is checked separately, after the wait set in Settings › QMS rules."
            : next.help}
          {waitUntil && <span className="mt-1 block font-medium">You can check effectiveness from {formatDate(waitUntil)}, {RULES.effectiveAfter} days after verification (Settings › QMS rules).</span>}
          {!yourTurn && <span className="mt-1 block text-muted-foreground">This step is with {nc.stage === 4 ? nc.verifier : nc.owner}.</span>}
        </YourStep>
      )}

      <RemarkBanner kind={"Nonconformity"} id={nc.id} />
      <RecordLayout
        main={
          <>
            {sections.map((s) => (
              <Card key={s.title}>
                <CardHeader>
                  <CardTitle>{s.title}</CardTitle>
                  {s.by && <span className="text-[0.8125rem] text-muted-foreground">{s.by}</span>}
                </CardHeader>
                <CardContent className="text-sm leading-relaxed">{s.body}</CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Corrective action</CardTitle>
                  <span className="text-[0.8125rem] text-muted-foreground">
                    {nc.tasks.length ? `${tasksDone} of ${nc.tasks.length} tasks done. A task can have one accountable person and helpers.` : "No tasks yet."}
                  </span>
                </div>
                {!closed && (
                  <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}>
                    <PlusIcon /> Add task
                  </Button>
                )}
              </CardHeader>
              <ul>
                {nc.tasks.map((t, i) => (
                  <li key={t.id} className={cn("flex items-start gap-3 px-5 py-3.5", i > 0 && "border-t border-rule-soft")}>
                    <Checkbox
                      checked={t.done}
                      disabled={closed}
                      aria-label={`Done: ${t.name}`}
                      className="mt-0.5"
                      onCheckedChange={(v) => {
                        update("ncs", nc.id, { tasks: nc.tasks.map((x) => (x.id === t.id ? { ...x, done: !!v } : x)) })
                        if (v) log(`completed “${t.name}”`)
                      }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className={cn("text-sm font-medium", t.done && "text-muted-foreground line-through")}>{t.name}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Avatar name={t.accountable} size={20} /> {t.accountable}, accountable
                        </span>
                        {t.helpers.length > 0 && <span>With {t.helpers.join(", ")}</span>}
                        <span>Due {t.due}</span>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <ol className="flex flex-col px-5 py-3">
                {activity.map((a, i) => (
                  <li key={i} className="flex gap-3 py-2">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", i === 0 ? "bg-primary" : "bg-input")} />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm">
                        <span className="font-semibold">{a.who}</span> {a.what}
                      </span>
                      <span className="text-xs text-muted-foreground">{a.when}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
            <RemarksPanel target={{ kind: "Nonconformity", id: nc.id, label: `${nc.id} ${nc.title}`, to: `/corrective-action/${nc.id}`, area: "Corrective Action" }} />
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
                    { k: "Severity", v: nc.severity },
                    { k: "Found by", v: nc.source },
                    { k: "Process", v: nc.process },
                    { k: "Clause", v: nc.clause },
                    { k: "Owner", v: nc.owner },
                    { k: "Verifier", v: nc.verifier === user.name ? `${nc.verifier} (you)` : nc.verifier },
                    { k: "Due", v: <span className={nc.late ? "font-semibold text-overdue" : "font-semibold text-soon"}>{nc.due}</span> },
                    ...(nc.id === "NC-2026-005" ? [{ k: "Document", v: <Link to="/documents/EQP-PRO-001" className="text-primary">EQP-PRO-001</Link> }] : []),
                  ]}
                />
              </CardContent>
            </Card>
            <NcRisks nc={nc} onLog={log} />
            <LinkedEvidence recordId={nc.id} process={nc.process} label={nc.title} clauses={[nc.clause]} />
          </>
        }
      />

      <NcSheet open={edit} onOpenChange={setEdit} nc={nc} />

      <Dialog open={stepOpen} onOpenChange={setStepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{next?.button}</DialogTitle>
            <DialogDescription>{next?.help}</DialogDescription>
          </DialogHeader>
          {next?.field && (
            <Field label={next.field} htmlFor="step-note">
              <Textarea id="step-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          )}
          {(nc.stage === 1 || nc.stage === 5) && !nc.risks?.length && !nc.riskCheck && (
            <p className="rounded-sm border border-soon-border bg-soon-tint px-3 py-2 text-[0.8125rem] leading-normal">
              The risk register hasn’t been checked for this nonconformity yet. Use Risks and opportunities on this page to link or add a risk, or record that no change is needed. ISO 9001 clause 10.2.1 e).
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStepOpen(false)}>
              Cancel
            </Button>
            {nc.stage === 5 && (
              <Button
                variant="outline"
                onClick={() => {
                  update("ncs", nc.id, { stage: 2 })
                  log("found the action did not work and reopened it")
                  setStepOpen(false)
                }}
              >
                Not effective, reopen
              </Button>
            )}
            <Button onClick={advance} disabled={!!next?.field && !note.trim()}>
              {next?.button}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
            <DialogDescription>One person is accountable and closes the task. Helpers each get their own reminders.</DialogDescription>
          </DialogHeader>
          <Field label="Task" htmlFor="task-name">
            <Input id="task-name" value={task.name} onChange={(e) => setTask({ ...task, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accountable" htmlFor="task-acc">
              <NativeSelect id="task-acc" value={task.accountable} onChange={(e) => setTask({ ...task, accountable: e.target.value })}>
                <PeopleOptions />
              </NativeSelect>
            </Field>
            <Field label="Due" htmlFor="task-due">
              <Input id="task-due" type="date" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} />
            </Field>
          </div>
          <Field label="Helpers" optional>
            <PeoplePicker label="Helpers" value={task.helpers} onChange={(v) => setTask({ ...task, helpers: v })} exclude={[task.accountable]} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!task.name.trim()) return
                const t: TaskItem = { id: `t${Date.now()}`, name: task.name.trim(), accountable: task.accountable, helpers: task.helpers, due: task.due || "Not set", done: false }
                update("ncs", nc.id, { tasks: [...nc.tasks, t] })
                notify([t.accountable, ...t.helpers], { kind: "Assigned", title: `Task on ${nc.id}: ${t.name}`, body: `${t.accountable} is accountable. ${t.due === "Not set" ? "No due date yet." : `Due ${t.due}.`}`, href: `/corrective-action/${nc.id}` })
                log(`added the task “${t.name}”`)
                setTask({ name: "", accountable: "Paolo Ramos", helpers: [], due: "" })
                setTaskOpen(false)
              }}
            >
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
