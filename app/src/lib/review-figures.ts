/**
 * Live figures for each management review input, worked out from the records in iQMS.
 * They stay live while the review is being prepared and are frozen when it is recorded,
 * so the record shows what top management saw.
 */
import type { State } from "@/lib/store"
import { fmtKpi, fmtTarget, onTarget } from "@/data/records"
import type { ManagementReviewRecord } from "@/data/types"
import { riskLevel } from "@/components/app/status"
import { PROCESS_FLAG } from "@/pages/qms/processes"

export interface LiveFigure {
  /** the headline, for example "5 / 7" */
  value: string
  /** what it means, for example "on target" */
  detail: string
  /** draws attention when something is off */
  warn?: boolean
}

/** The review before this one, by date order in the list (newest first). */
export function previousReview(state: State, review: ManagementReviewRecord) {
  const i = state.reviews.findIndex((r) => r.id === review.id)
  return state.reviews[i + 1]
}

export function liveFigure(ref: string, state: State, review: ManagementReviewRecord): LiveFigure | undefined {
  switch (ref) {
    case "a": {
      const prev = previousReview(state, review)
      if (!prev) return { value: "None", detail: "first review" }
      const acts = state.reviewActions.filter((a) => a.reviewId === prev.id)
      const done = acts.filter((a) => a.state === "Done").length
      const late = acts.filter((a) => a.state === "Open" && a.late).length
      return { value: `${done} / ${acts.length}`, detail: `done${late ? `, ${late} overdue` : ""}`, warn: late > 0 }
    }
    case "b":
      return { value: String(state.issues.length), detail: `issues, ${state.parties.length} interested parties` }
    case "c1": {
      const o = state.objectives.find((x) => /customer satisfaction/i.test(x.name))
      return o ? { value: fmtKpi(o), detail: `target ${fmtTarget(o)}`, warn: !onTarget(o) } : undefined
    }
    case "c2": {
      const on = state.objectives.filter((o) => onTarget(o)).length
      return { value: `${on} / ${state.objectives.length}`, detail: "objectives on target", warn: on < state.objectives.length }
    }
    case "c3": {
      const flags = Object.values(PROCESS_FLAG)
      const atRisk = flags.filter((f) => f.tone === "overdue").length
      const watch = flags.length - atRisk
      return { value: String(state.processes.length - flags.length), detail: `healthy, ${watch} to watch, ${atRisk} at risk` }
    }
    case "c4": {
      const open = state.ncs.filter((n) => n.stage < 6)
      const major = open.filter((n) => n.severity === "Major").length
      const late = open.filter((n) => n.late).length
      return { value: String(open.length), detail: `open, ${major} major${late ? `, ${late} overdue` : ""}`, warn: late > 0 }
    }
    case "c5":
      return { value: String(state.objectives.length), detail: "KPIs measured" }
    case "c6": {
      const held = state.audits.filter((a) => ["Held", "Findings agreed", "Report issued", "Report late", "Follow-up"].includes(a.state))
      const issued = held.filter((a) => a.state === "Report issued" || a.state === "Follow-up").length
      return { value: `${issued} / ${held.length}`, detail: "reports issued", warn: issued < held.length }
    }
    case "c7": {
      const o = state.objectives.find((x) => /supplier/i.test(x.name))
      return o ? { value: fmtKpi(o), detail: `supplier on-time, target ${fmtTarget(o)}`, warn: !onTarget(o) } : undefined
    }
    case "e": {
      const risks = state.risks.filter((r) => r.kind === "Risk" && r.treatment !== "Closed")
      const high = risks.filter((r) => riskLevel(r).label === "High").length
      const late = risks.filter((r) => r.late).length
      return { value: String(risks.length), detail: `open risks, ${high} high${late ? `, ${late} review late` : ""}`, warn: late > 0 }
    }
    default:
      return undefined
  }
}
