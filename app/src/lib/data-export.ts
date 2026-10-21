import type { State } from "@/lib/store"
import { NC_STAGES } from "@/data/types"
import { ACTIVITY } from "@/data/admin"

/** The registers people can export, and how each becomes rows. Only records the person can see are passed in. */
export const EXPORT_PARTS = [
  "Documents register",
  "Nonconformities and corrective actions",
  "Improvements and customer complaints",
  "Risks and opportunities",
  "Audits",
  "Objectives and results",
  "Management reviews and actions",
  "Activity log",
] as const
export type ExportPart = (typeof EXPORT_PARTS)[number]

type Row = Record<string, string | number | undefined>

export function exportRows(state: State, part: ExportPart): Row[] {
  switch (part) {
    case "Documents register":
      return state.documents.map((d) => ({ id: d.id, title: d.title, process: d.process, type: d.type, revision: d.rev, stage: d.stage, owner: d.owner, next_review: d.nextReview, classification: d.classification, link: d.link }))
    case "Nonconformities and corrective actions":
      return state.ncs.flatMap((n) => [
        { record: "Nonconformity", id: n.id, title: n.title, process: n.process, clause: n.clause, severity: n.severity, stage: NC_STAGES[n.stage], owner: n.owner, verifier: n.verifier, due: n.dueDate ?? n.due, raised: n.raisedDate, closed: n.closedDate },
        ...n.tasks.map((t) => ({ record: "Corrective action", id: `${n.id}/${t.id}`, title: t.name, process: n.process, owner: t.accountable, due: t.due, stage: t.done ? "Done" : "Open" })),
      ])
    case "Improvements and customer complaints":
      return [
        ...state.improvements.map((i) => ({ record: "Improvement", id: i.id, title: i.title, process: i.process, owner: i.owner, state: i.state, due: i.due, raised: i.raisedDate, done: i.doneDate, outcome: i.outcome })),
        ...state.complaints.map((c) => ({ record: "Customer complaint", id: c.id, title: c.title, customer: c.customer, process: c.process, owner: c.owner, state: c.state, received: c.received, respond_by: c.respondBy, responded: c.respondedDate, satisfied: c.satisfied, nonconformity: c.ncId })),
      ]
    case "Risks and opportunities":
      return state.risks.map((r) => ({ id: r.id, kind: r.kind, title: r.title, process: r.process, likelihood: r.likelihood, impact: r.impact, treatment: r.treatment, action: r.action, owner: r.owner, next_review: r.nextReviewDate }))
    case "Audits":
      return state.audits.map((a) => ({ id: a.id, process: a.process, date: a.date, lead: a.lead, auditors: a.auditors.join("; "), state: a.state, clauses: a.clauses.join("; "), held: a.heldDate, report: a.reportDate }))
    case "Objectives and results":
      return state.objectives.map((o) => ({ id: o.id, objective: o.name, process: o.process, owner: o.owner, target: o.target, unit: o.unit, frequency: o.frequency, latest: o.values.at(-1) }))
    case "Management reviews and actions":
      return [
        ...state.reviews.map((r) => ({ record: "Review", id: r.id, title: r.title, date: r.date, stage: r.stage, reviewers: r.reviewers.join("; ") })),
        ...state.reviewActions.map((a) => ({ record: "Action", id: a.id, title: a.text, review: a.reviewId, owner: a.owner, due: a.dueDate ?? a.due, stage: a.state })),
      ]
    case "Activity log":
      return ACTIVITY.map((a) => ({ when: a.when, who: a.who, what: a.what, record: a.ref }))
  }
}

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v)
  // quote every cell; neutralise spreadsheet formulas
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
}

export function toCsv(rows: Row[]) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  return [cols.map(cell).join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n")
}

export function download(name: string, text: string, type: string) {
  const blob = new Blob([type.includes("csv") ? "﻿" + text : text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
