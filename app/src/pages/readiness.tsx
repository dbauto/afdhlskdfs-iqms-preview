import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { CalendarCheckIcon, CalendarIcon, ListChecksIcon, MessageSquareTextIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { milestones, whenText } from "@/lib/certification"
import { clauseCoverage, visibleRecords, dueOn } from "@/lib/record-figures"
import { daysBetween, formatDate, todayIso } from "@/lib/periods"
import { ISO_CLAUSES } from "@/data/iso"
import type { Requirement, RequirementStatus } from "@/data/types"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DataTable } from "@/components/app/data-table"
import { Field, PeopleOptions } from "@/components/app/form"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { RowActions } from "@/components/app/record-actions"

const TONE: Record<RequirementStatus, BadgeTone> = { "To do": "draft", "In progress": "progress", "Ready to confirm": "soon", Done: "done", "Not applicable": "draft" }

/** Who can do what: the consultant and quality managers list requirements; owners update their own; only a quality manager confirms done. */
function useRights() {
  const { role, user } = useStore()
  const lister = ["consultant", "quality", "admin"].includes(role.id)
  const confirmer = ["quality", "admin"].includes(role.id)
  return { lister, confirmer, me: user.name }
}

function RequirementSheet({ open, item, onClose }: { open: boolean; item?: Requirement; onClose: () => void }) {
  const { state, add, update, user, notify } = useStore()
  const { lister, confirmer, me } = useRights()
  const blank: Requirement = { id: "", clause: "7.5", title: "", owner: "Maria Santos", due: "", status: "To do", addedBy: user.name }
  const [f, setF] = React.useState<Requirement>(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (open) {
      setF(item ?? { ...blank, id: `rq-${Date.now()}` })
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])
  const set = (p: Partial<Requirement>) => setF((x) => ({ ...x, ...p }))
  const isOwner = item?.owner === me
  const canEditAll = lister
  const statuses: RequirementStatus[] = ["To do", "In progress", "Ready to confirm", ...(confirmer ? (["Done"] as const) : []), ...(lister ? (["Not applicable"] as const) : [])]

  function save() {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = "Say what’s needed."
    if (f.status === "Ready to confirm" && !f.evidence?.trim()) e.evidence = "Link the evidence or document that shows it’s done, so it can be confirmed."
    if (f.status === "Not applicable" && !f.note?.trim()) e.note = "Say why it doesn’t apply. The certification auditor will ask, and it goes in the scope statement."
    setErrors(e)
    if (Object.keys(e).length) return
    if (item) update("requirements", item.id, f)
    else {
      add("requirements", f)
      notify([f.owner], { kind: "Assigned", title: `Certification task: ${f.title}`, body: `Clause ${f.clause}${f.due ? `, due ${f.due}` : ""}.`, href: "/readiness" })
    }
    toast(item ? "Requirement saved" : "Requirement added", { description: item ? undefined : `${f.owner} sees it in Needs your attention.` })
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item ? "Edit requirement" : "Add requirement"}</SheetTitle>
          <SheetDescription>Something that must be in place before the certification audit, with an owner and a due date.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field label="What’s needed" htmlFor="rq-t" error={errors.title}>
            <Textarea id="rq-t" value={f.title} onChange={(e) => set({ title: e.target.value })} disabled={!canEditAll} className="min-h-16" placeholder="Calibration register covers every measuring tool, with due dates" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ISO 9001 clause" htmlFor="rq-c">
              <NativeSelect id="rq-c" value={f.clause} onChange={(e) => set({ clause: e.target.value })} disabled={!canEditAll}>
                {ISO_CLAUSES.map((c) => (
                  <option key={c.no} value={c.no}>
                    {c.no} {c.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Owner" htmlFor="rq-o">
              <NativeSelect id="rq-o" value={f.owner} onChange={(e) => set({ owner: e.target.value })} disabled={!canEditAll}>
                <PeopleOptions />
              </NativeSelect>
            </Field>
            <Field label="Due" htmlFor="rq-d" optional>
              <Input id="rq-d" value={f.due} onChange={(e) => set({ due: e.target.value })} disabled={!canEditAll} placeholder="15 Nov" />
            </Field>
            <Field label="Status" htmlFor="rq-s" help={!confirmer ? "A quality manager confirms it’s done." : undefined}>
              <NativeSelect id="rq-s" value={f.status} onChange={(e) => set({ status: e.target.value as RequirementStatus })} disabled={!canEditAll && !isOwner}>
                {[...new Set([...statuses, f.status])].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Evidence" htmlFor="rq-e" optional error={errors.evidence} help="A document number, evidence item or link that shows it’s done.">
            <Input id="rq-e" value={f.evidence ?? ""} onChange={(e) => set({ evidence: e.target.value })} list="rq-docs" placeholder="EQP-REG-002 Calibration register" />
            <datalist id="rq-docs">
              {state.documents.slice(0, 60).map((d) => (
                <option key={d.id} value={`${d.id} ${d.title}`} />
              ))}
            </datalist>
          </Field>
          {f.status === "Not applicable" && (
            <Field label="Why it doesn’t apply" htmlFor="rq-n" error={errors.note}>
              <Textarea id="rq-n" value={f.note ?? ""} onChange={(e) => set({ note: e.target.value })} className="min-h-16" />
            </Field>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{item ? "Save changes" : "Add requirement"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default function Readiness() {
  const { state: scoped, update, remove, can, canSee, settings } = useStore()
  const state = visibleRecords(scoped, canSee)
  const coverage = clauseCoverage(state, canSee)
  const { lister, confirmer, me } = useRights()
  const [sheet, setSheet] = React.useState<{ open: boolean; item?: Requirement }>({ open: false })
  // a link from My tasks opens that requirement straight away
  const [params, setParams] = useSearchParams()
  React.useEffect(() => {
    const id = params.get("item")
    const item = id ? state.requirements.find((r) => r.id === id) : undefined
    if (item) {
      setSheet({ open: true, item })
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])
  const [view, setView] = React.useState<"open" | "all" | "mine">("open")
  const reqs = state.requirements
  const applicable = reqs.filter((r) => r.status !== "Not applicable")
  const done = applicable.filter((r) => r.status === "Done").length
  const toConfirm = reqs.filter((r) => r.status === "Ready to confirm").length
  const openRemarks = state.remarks.filter((r) => r.status === "Open" && can(r.area)).length
  const rows = reqs.filter((r) => (view === "all" ? true : view === "mine" ? r.owner === me : r.status !== "Done" && r.status !== "Not applicable"))

  const checks = [
    { label: "Internal audit cycle complete", detail: `${new Set(state.audits.filter((a) => a.state === "Report issued").map((a) => a.process)).size} of ${state.processes.length} processes audited with a report issued`, ok: false, to: "/audits" },
    { label: "Management review held this year", detail: `${state.reviews.filter(r => r.stage === "Reviewed" || r.stage === "Closed").length} reviews recorded`, ok: state.reviews.some(r => (r.stage === "Reviewed" || r.stage === "Closed") && r.period?.end.startsWith(String(new Date().getFullYear()))), to: "/management-review" },
    { label: "No overdue major nonconformities", detail: `${state.ncs.filter((n) => n.severity === "Major" && n.late && n.stage < 6).length} overdue`, ok: state.ncs.filter((n) => n.severity === "Major" && n.late && n.stage < 6).length === 0, to: "/corrective-action" },
    { label: "Quality policy and objectives published", detail: `${state.policies.length ? "Quality policy published" : "No quality policy yet"}, ${state.objectives.length} objective${state.objectives.length === 1 ? "" : "s"}`, ok: state.policies.length > 0 && state.objectives.length > 0, to: "/qms/objectives" },
    { label: "Evidence for every requirement", detail: coverage.hasData ? `${coverage.missing} requirements have no evidence yet` : "No data", ok: coverage.hasData && coverage.missing === 0, to: "/evidence" },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Overview", to: "/" }, { label: "Certification readiness" }]}
        title="Certification readiness"
        description={`What’s left before ${settings.certification.body.trim() || "the certification body"} audits the QMS. The consultant lists what’s needed; each owner gets it done and links the evidence; the quality manager confirms it.`}
        actions={
          lister && (
            <Button onClick={() => setSheet({ open: true })}>
              <PlusIcon /> Add requirement
            </Button>
          )
        }
      />
      <FigureGrid
        figures={[
          // the next two dates in the certification cycle (Settings › Certification)
          ...[0, 1].map((i) => {
            const m = milestones(settings.certification).filter((x) => x.date >= todayIso())[i]
            return m
              ? { value: formatDate(m.date), label: m.label, badge: whenText(m.date), tone: (i === 0 ? "soon" : "draft") as "soon" | "draft", icon: i === 0 ? CalendarIcon : CalendarCheckIcon, to: "/settings/certification" }
              : { value: "Not booked", label: i === 0 ? "Next certification audit" : "Following audit", badge: "Set the date", tone: "draft" as const, icon: i === 0 ? CalendarIcon : CalendarCheckIcon, to: "/settings/certification" }
          }),
          { value: `${done} of ${applicable.length}`, label: "Requirements done", badge: toConfirm ? `${toConfirm} to confirm` : "On track", tone: toConfirm ? "soon" : "done", icon: ListChecksIcon },
          { value: openRemarks, label: "Open consultant remarks", badge: openRemarks ? "Reply" : "None", tone: openRemarks ? "soon" : "done", icon: MessageSquareTextIcon, to: "/remarks" },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Readiness by clause</CardTitle>
            <Link to="/evidence" className="text-[0.8125rem] font-medium text-primary">
              Evidence by clause
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {coverage.groups.map((g) => {
              const open = reqs.filter((r) => r.clause.split(".")[0] === g.no && r.status !== "Done" && r.status !== "Not applicable").length
              return (
                <div key={g.no} className="grid grid-cols-[1.75rem_minmax(0,12rem)_minmax(0,1fr)_6.5rem] items-center gap-3 text-sm max-sm:grid-cols-[1.75rem_minmax(0,1fr)_6.5rem]">
                  <span className="font-semibold">{g.no}</span>
                  <span className="truncate max-sm:hidden">{g.name}</span>
                  <span className="flex h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={`${g.name}: ${g.ok}% ready`}>
                    <span className="bg-done" style={{ width: `${g.ok}%` }} />
                    <span className="bg-soon-bar" style={{ width: `${g.part}%` }} />
                  </span>
                  <span className={cn("text-right text-[0.8125rem]", open ? "font-medium text-soon" : "text-muted-foreground")}>{open ? `${open} to do` : g.hasData ? `${g.ok}% linked` : "No data"}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Before Stage 1</CardTitle>
          </CardHeader>
          <ul>
            {checks.map((c, i) => (
              <li key={c.label} className={cn(i > 0 && "border-t border-rule-soft")}>
                <Link to={c.to} className="flex items-start gap-3 px-5 py-3 hover:bg-hover">
                  <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", c.ok ? "bg-done" : "bg-soon")} aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">
                      {c.label}
                      <span className="sr-only">{c.ok ? ", done" : ", not yet"}</span>
                    </span>
                    <span className="text-[0.8125rem] text-muted-foreground">{c.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Requirements</h2>
          <ViewChips
            value={view}
            onChange={(v) => setView(v as typeof view)}
            views={[
              { id: "open", label: "Still to do", count: reqs.filter((r) => r.status !== "Done" && r.status !== "Not applicable").length },
              { id: "mine", label: "Mine", count: reqs.filter((r) => r.owner === me).length },
              { id: "all", label: "All", count: reqs.length },
            ]}
          />
        </div>
        <DataTable
          label="Requirements"
          rows={rows}
          getRowId={(r) => r.id}
          minWidth={800}
          empty={{ title: view === "mine" ? "Nothing assigned to you" : "Nothing left to do", body: view === "mine" ? "Requirements the consultant gives you show here." : "Every requirement is done or doesn’t apply." }}
          columns={[
            {
              id: "t",
              header: "Requirement",
              className: "min-w-[260px]",
              cell: (r) => (
                <button type="button" onClick={() => setSheet({ open: true, item: r })} className="flex cursor-pointer flex-col gap-0.5 text-left">
                  <span className="text-[0.8125rem] font-medium text-primary">Clause {r.clause}</span>
                  <span className="font-medium">{r.title}</span>
                  {r.status === "Not applicable" && r.note && <span className="text-xs text-muted-foreground">{r.note}</span>}
                  {r.evidence && r.status !== "Not applicable" && <span className="text-xs text-muted-foreground">Evidence: {r.evidence}</span>}
                </button>
              ),
            },
            {
              id: "o",
              header: "Owner, due",
              cell: (r) => (
                <span className="flex flex-col whitespace-nowrap">
                  <span>{r.owner}</span>
                  {r.due && <span className="text-[0.8125rem] text-muted-foreground">Due {r.due}</span>}
                </span>
              ),
            },
            { id: "s", header: "Status", cell: (r) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
            {
              id: "c",
              header: <span className="sr-only">Confirm</span>,
              cell: (r) =>
                confirmer && r.status === "Ready to confirm" ? (
                  <Button size="sm" variant="outline" onClick={() => { update("requirements", r.id, { status: "Done" }); toast("Confirmed done", { description: `${r.owner} and the consultant are told.` }) }}>
                    Confirm done
                  </Button>
                ) : null,
            },
            {
              id: "x",
              header: <span className="sr-only">Actions</span>,
              className: "w-12",
              cell: (r) => (
                <RowActions
                  name={r.title}
                  onEdit={lister || r.owner === me ? () => setSheet({ open: true, item: r }) : undefined}
                  removeKind={lister ? "delete" : undefined}
                  onRemove={() => remove("requirements", r.id)}
                />
              ),
            },
          ]}
        />
      </div>

      <RequirementSheet open={sheet.open} item={sheet.item} onClose={() => setSheet({ open: false })} />
    </>
  )
}
