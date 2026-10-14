import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import type { ApprovalMode } from "@/data/types"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Field, PeoplePicker } from "@/components/app/form"
import { useStore } from "@/lib/store"
import { DOC_TYPES } from "@/data/records"
import { APPROVER_JOBS, type RouteDefaults } from "@/lib/routes"
import { SettingsHeader } from "./layout"

const MODES: Record<ApprovalMode, { help: string; people: { name: string; note: string; status: string; tone: "done" | "soon" | "draft" }[]; next: string }> = {
  "Everyone must approve": {
    help: "Both get the task at the same time. The step is done when both have approved.",
    people: [
      { name: "Carlos Mendoza", note: "Approved 12 Oct, “Trialled on line 2, works.”", status: "Approved", tone: "done" },
      { name: "Maria Santos", note: "Due 15 Oct", status: "Their turn", tone: "soon" },
    ],
    next: "Goes to Ready to publish when Maria approves.",
  },
  "Any one of them": {
    help: "Both get the task. The first approval completes the step and the other person’s task closes.",
    people: [
      { name: "Carlos Mendoza", note: "Approved 12 Oct", status: "Approved", tone: "done" },
      { name: "Maria Santos", note: "Not needed, Carlos approved first", status: "Not needed", tone: "draft" },
    ],
    next: "Moved to Ready to publish on 12 Oct.",
  },
  "One after another": {
    help: "Carlos gets it first. Maria gets it only after Carlos approves.",
    people: [
      { name: "Carlos Mendoza", note: "First. Approved 12 Oct", status: "Approved", tone: "done" },
      { name: "Maria Santos", note: "Second. Due 15 Oct", status: "Their turn", tone: "soon" },
    ],
    next: "Maria was asked once Carlos approved.",
  },
}


export default function ReviewApproval() {
  const [mode, setMode] = React.useState<ApprovalMode>("Everyone must approve")
  const [remind, setRemind] = React.useState(true)
  const [keep, setKeep] = React.useState(true)
  const m = MODES[mode]
  const { state, routeDefaults, setRouteDefaults } = useStore()
  const [route, setRoute] = React.useState<RouteDefaults>(routeDefaults)
  const people = state.people.filter((p) => p.status === "Active").map((p) => p.name)

  return (
    <>
      <SettingsHeader title="Review and approval" description="Who checks and approves a document revision before it is published, and how often published documents are reviewed again." />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>Revision workflow</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Draft, technical review, approval, then publish. Each step can have several people.</span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Technical reviewers" help="Check format, numbering and references on every document, unless a process sets its own.">
            <PeoplePicker label="Default technical reviewers" value={route.reviewers} onChange={(v) => setRoute({ ...route, reviewers: v })} />
          </Field>
          <Field label="Days allowed for each step" htmlFor="ra-days" help="After this the step shows as late.">
            <Input id="ra-days" type="number" min={1} defaultValue={5} className="w-28" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>Approver by document type</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">The company default. A process can set its own route on its page, and the person starting a revision can change it for that revision. Only quality managers can remove the approver set here.</span>
          </div>
        </CardHeader>
        <ul>
          {DOC_TYPES.map((t, i) => (
            <li key={t} className={cn("grid grid-cols-[minmax(0,1fr)_15rem] items-center gap-4 px-5 py-2.5", i > 0 && "border-t border-rule-soft")}>
              <span className="text-sm font-medium">{t}</span>
              <NativeSelect aria-label={`Approver for ${t}`} value={route.approverByType[t] ?? "Process owner"} onChange={(e) => setRoute({ ...route, approverByType: { ...route.approverByType, [t]: e.target.value } })} className="h-9 text-[0.8125rem]">
                <optgroup label="By job">
                  {APPROVER_JOBS.map((j) => (
                    <option key={j}>{j}</option>
                  ))}
                </optgroup>
                <optgroup label="A named person">
                  {people.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </optgroup>
              </NativeSelect>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>Several people on one step</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">The default when a step has more than one person. It can be changed per document.</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div role="radiogroup" aria-label="Mode" className="inline-flex self-start overflow-hidden rounded-sm border border-input">
            {(Object.keys(MODES) as ApprovalMode[]).map((k, i) => (
              <button key={k} type="button" role="radio" aria-checked={k === mode} onClick={() => setMode(k)} className={cn("h-9 cursor-pointer px-3.5 text-[0.8125rem] font-medium", i > 0 && "border-l border-input", k === mode ? "bg-foreground text-background" : "bg-card hover:bg-background")}>
                {k}
              </button>
            ))}
          </div>
          <p className="text-sm">{m.help}</p>
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <span className="text-xs text-muted-foreground">Example: approval step of OPS-WI-014, revision 03</span>
            {m.people.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <Avatar name={p.name} size={30} />
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.note}</span>
                </span>
                <Badge tone={p.tone}>{p.status}</Badge>
              </div>
            ))}
            <span className="border-t border-rule-soft pt-3 text-[0.8125rem] text-muted-foreground">{m.next}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Periodic review</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field label="Review published documents every" htmlFor="ra-every">
            <NativeSelect id="ra-every" defaultValue="12" className="w-48">
              <option value="12">12 months</option>
              <option value="24">24 months</option>
            </NativeSelect>
          </Field>
          {[
            { label: "Remind owners 30 days before a review is due", help: "One email to the owner, a second one 7 days before.", v: remind, set: setRemind },
            { label: "Keep the previous revision visible while a new one is in review", help: "The published revision stays the controlled version until the new one is published.", v: keep, set: setKeep },
          ].map((t) => (
            <label key={t.label} className="flex items-start justify-between gap-4">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-[0.8125rem] text-muted-foreground">{t.help}</span>
              </span>
              <Switch checked={t.v} onCheckedChange={t.set} aria-label={t.label} />
            </label>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            setRouteDefaults(route)
            toast("Review and approval saved", { description: "New documents and new revisions use these defaults. Revisions already started keep their route." })
          }}
        >
          Save changes
        </Button>
      </div>
    </>
  )
}
