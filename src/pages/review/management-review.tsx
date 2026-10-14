import * as React from "react"
import { DownloadIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { MR_ACTIONS, MR_ATTENDEES, MR_INPUTS } from "@/data/records"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { KeyFacts, LifecycleTrack, MetaLine, PageHeader, RecordLayout } from "@/components/app/page"
import { StateBadge } from "@/components/app/status"
import { Field, PeopleOptions } from "@/components/app/form"
import { useStore } from "@/lib/store"

export default function ManagementReview() {
  const { can } = useStore()
  const [inputs, setInputs] = React.useState(() => MR_INPUTS.map((x) => ({ ...x }) as { ref: string; name: string; source: string; state: string }))
  const [decisions, setDecisions] = React.useState<{ text: string; owner: string; due: string }[]>([])
  const [open, setOpen] = React.useState(false)
  const [d, setD] = React.useState({ text: "", owner: "Eric Navarro", due: "" })
  const ready = inputs.filter((i) => i.state === "Ready").length
  const missing = inputs.filter((i) => i.state === "Missing").length
  const canManage = can("Management Review", "Add and edit")

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Management Review", to: "/management-review" }, { label: "MR-2026-02" }]}
        title="November 2026 management review"
        badge={missing ? <Badge tone="overdue">{missing} inputs missing</Badge> : <Badge tone="done">Inputs ready</Badge>}
        meta={<MetaLine parts={["MR-2026-02", "4 Nov 2026, 09:00", "Chaired by Eric Navarro"]} />}
        actions={
          <>
            <Button variant="outline" onClick={() => toast("Review pack is being prepared", { description: "You’ll get a PDF by email in a few minutes." })}>
              <DownloadIcon /> Export pack
            </Button>
            {canManage && <Button onClick={() => toast("Agenda sent to 6 attendees")}>Send agenda</Button>}
          </>
        }
      />

      <Card>
        <CardContent className="py-5">
          <LifecycleTrack
            steps={[
              { label: "Planned", when: "22 Apr" },
              { label: "Inputs gathered", when: "Due 28 Oct" },
              { label: "Meeting held", when: "4 Nov" },
              { label: "Decisions recorded" },
              { label: "Actions closed" },
            ]}
            current={1}
          />
        </CardContent>
      </Card>

      <RecordLayout
        main={
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Inputs</CardTitle>
                  <span className="text-[13px] text-muted-foreground">
                    ISO 9001 clause 9.3.2, {ready} of {inputs.length} ready
                  </span>
                </div>
              </CardHeader>
              <ul>
                {inputs.map((x, i) => (
                  <li key={x.ref} className={cn("grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    <span className="text-[13px] font-semibold text-muted-foreground">{x.ref}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{x.name}</span>
                      <span className="truncate text-[13px] text-muted-foreground">{x.source}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {x.state !== "Ready" && canManage && (
                        <Button variant="quiet" size="sm" onClick={() => setInputs((all) => all.map((y) => (y.ref === x.ref ? { ...y, state: "Ready" } : y)))}>
                          Mark ready
                        </Button>
                      )}
                      <StateBadge value={x.state} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Decisions and actions</CardTitle>
                  <span className="text-[13px] text-muted-foreground">Outputs, clause 9.3.3. Recorded during the meeting.</span>
                </div>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                    <PlusIcon /> Add decision
                  </Button>
                )}
              </CardHeader>
              <ul>
                {decisions.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">Nothing recorded yet. Add decisions during the meeting on 4 Nov.</li>}
                {decisions.map((x, i) => (
                  <li key={i} className={cn("flex items-center justify-between gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{x.text}</span>
                      <span className="text-[13px] text-muted-foreground">
                        {x.owner}
                        {x.due ? `, due ${x.due}` : ""}
                      </span>
                    </span>
                    <button type="button" className="cursor-pointer text-[13px] text-destructive" onClick={() => setDecisions((all) => all.filter((_, k) => k !== i))}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Actions from the last review</CardTitle>
                  <span className="text-[13px] text-muted-foreground">MR-2026-01, 22 Apr</span>
                </div>
              </CardHeader>
              <ul>
                {MR_ACTIONS.map((a, i) => (
                  <li key={a.name} className={cn("flex items-center justify-between gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{a.name}</span>
                      <span className="text-[13px] text-muted-foreground">{a.who}</span>
                    </span>
                    <StateBadge value={a.state} />
                  </li>
                ))}
              </ul>
            </Card>
          </>
        }
        side={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Meeting</CardTitle>
              </CardHeader>
              <CardContent className="py-1">
                <KeyFacts
                  facts={[
                    { k: "Date", v: "Wednesday 4 Nov 2026, 09:00 to 12:00" },
                    { k: "Place", v: "Boardroom and online" },
                    { k: "Chair", v: "Eric Navarro, Managing Director" },
                    { k: "Secretary", v: "Maria Santos" },
                    { k: "Frequency", v: "Twice a year" },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Attendees</CardTitle>
              </CardHeader>
              <ul>
                {MR_ATTENDEES.map((p, i) => (
                  <li key={p.name} className={cn("flex items-center gap-3 px-5 py-2.5", i > 0 && "border-t border-rule-soft")}>
                    <Avatar name={p.name} size={28} />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add decision or action</DialogTitle>
            <DialogDescription>Each decision gets an owner. Actions are followed up at the next review.</DialogDescription>
          </DialogHeader>
          <Field label="Decision" htmlFor="mr-d">
            <Textarea id="mr-d" value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} className="min-h-20" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner" htmlFor="mr-o">
              <NativeSelect id="mr-o" value={d.owner} onChange={(e) => setD({ ...d, owner: e.target.value })}>
                <PeopleOptions />
              </NativeSelect>
            </Field>
            <Field label="Due" htmlFor="mr-due" optional>
              <Input id="mr-due" type="date" value={d.due} onChange={(e) => setD({ ...d, due: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!d.text.trim()) return
                setDecisions((all) => [...all, { ...d, text: d.text.trim() }])
                setD({ text: "", owner: "Eric Navarro", due: "" })
                setOpen(false)
              }}
            >
              Add decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
