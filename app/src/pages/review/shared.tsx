import * as React from "react"

import { coversAllProcesses, useStore, type State } from "@/lib/store"
import { computeInput, reviewPeriod, type InputFigure } from "@/lib/review-figures"
import { parseDisplayDate, todayIso, addDays } from "@/lib/periods"
import { RECORD_MODULE, type RecordKind } from "@/lib/record-links"
import { hasAnalysis } from "@/data/reviews"
import type { BadgeTone } from "@/components/ui/badge"
import type { FigureStatus, ManagementReviewRecord, ReviewAction, ReviewFormat, ReviewInput, ReviewStage } from "@/data/types"
import type { TrackStep } from "@/components/app/page"
import type { SupportingRow } from "@/components/app/supporting-records"

export const FORMATS: { id: ReviewFormat; title: string; hint: string }[] = [
  { id: "Meeting", title: "Meeting", hint: "Everyone together on one day. Record who attended." },
  { id: "No meeting", title: "No meeting", hint: "Top management reads the review pack, comments and signs off." },
  { id: "Several meetings", title: "Over several meetings", hint: "Inputs covered in regular management meetings. Record the date for each." },
]

export const formatLabel = (f: ReviewFormat) => (f === "Meeting" ? "Meeting" : f === "No meeting" ? "No meeting, pack reviewed" : "Over several meetings")

/** "In iQMS" is the stored value from before the rename; it is shown as ThryveMS. */
export const signOffLabel = (how: "In iQMS" | "Signed scan") => (how === "Signed scan" ? "signed scan" : "in ThryveMS")

export function stageTone(r: ManagementReviewRecord, open: number): { label: string; tone: BadgeTone } {
  const map: Record<ReviewStage, { label: string; tone: BadgeTone }> = {
    Planned: { label: "Planned", tone: "draft" },
    Preparing: { label: r.packSentOn ? "With top management" : "Preparing", tone: "progress" },
    Reviewed: { label: open ? "Reviewed, actions open" : "Reviewed", tone: open ? "soon" : "done" },
    Closed: { label: "Closed", tone: "done" },
  }
  if (r.stage === "Reviewed" && !r.signOff) return { label: "Waiting for sign-off", tone: "soon" }
  return map[r.stage]
}

/**
 * Who can do what on management reviews. Consultants can draft analysis but can't run the review,
 * evaluate as top management, sign off or finish and lock (plan v3 D18, §22).
 */
export function useReviewRights(r?: ManagementReviewRecord) {
  const { can, role, user } = useStore()
  const canManage = can("Management Review", "Add and edit") && role.id !== "consultant"
  const isReviewer = !!r?.reviewers.includes(user.name) && role.id !== "consultant"
  return {
    canManage,
    canDraft: canManage || role.id === "consultant",
    isReviewer,
    /** top management evaluates once the pack is out */
    canEvaluate: isReviewer && can("Management Review"),
    isInvolved: !!r && (r.reviewers.includes(user.name) || r.others.includes(user.name) || r.preparedBy === user.name || !!r.contributors?.includes(user.name)),
    /** summary figures count records across every process, so only people who see every process get them */
    seesSummary: coversAllProcesses(role),
  }
}

/** Ready for the pack: analysed and not a draft, or marked not applicable. */
export const inputReady = (i: ReviewInput) => !!i.notApplicable || (hasAnalysis(i) && !i.draft)

/** Status of one input while preparing. */
export function inputState(i: ReviewInput): { label: string; tone: BadgeTone } {
  if (i.notApplicable) return { label: "Not applicable", tone: "draft" }
  if (i.draft) return { label: "Consultant draft", tone: "soon" }
  if (hasAnalysis(i)) return { label: "Prepared", tone: "done" }
  if (i.handedTo) return { label: `With ${i.handedTo.split(" ")[0]}`, tone: "draft" }
  return { label: "Needs analysis", tone: "draft" }
}

/** The linked record is finished, so the action is probably done too. The owner confirms. */
export function linkedClosed(state: State, a: ReviewAction) {
  if (!a.linked || a.state === "Done") return undefined
  const nc = state.ncs.find((n) => n.id === a.linked)
  if (nc) return nc.stage === 6 ? `${nc.id} was closed${nc.due.startsWith("Closed") ? ` on ${nc.due.replace("Closed ", "")}` : ""}` : undefined
  const r = state.risks.find((x) => x.id === a.linked)
  if (r) return r.treatment === "Closed" ? `${r.id} was closed` : undefined
  return undefined
}

export function actionsFor(state: State, reviewId: string) {
  const acts = state.reviewActions.filter((a) => a.reviewId === reviewId)
  return { acts, open: acts.filter((a) => a.state === "Open"), late: acts.filter((a) => a.state === "Open" && a.late) }
}

/** The review's reporting period. */
export const periodOf = (r: ManagementReviewRecord) => reviewPeriod(r, (d) => parseDisplayDate(d))

/* ---------------- The seven guided steps (worked out from the four stored stages) ---------------- */

export const GUIDED_STEPS = ["Plan review", "Prepare inputs", "Distribute review pack", "Management evaluation", "Record decisions", "Finalize and sign off", "Monitor actions"]

export function guidedStep(r: ManagementReviewRecord, openActions: number, onRecordPage = false): { current: number; next: string; steps: TrackStep[] } {
  const ready = r.inputs.filter(inputReady).length
  const all = r.inputs.length
  let current: number
  let next: string
  if (r.stage === "Planned") {
    current = 0
    next = "Start preparing the inputs."
  } else if (r.stage === "Preparing" && onRecordPage) {
    current = 4
    next = "Record the conclusion and decisions, then finish and lock."
  } else if (r.stage === "Preparing" && !r.packSentOn) {
    current = ready === all ? 2 : 1
    next = ready === all ? "Every input is prepared. Send the review pack to top management." : `Prepare the inputs: ${ready} of ${all} ready. Add analysis, or mark an input not applicable.`
  } else if (r.stage === "Preparing") {
    current = 3
    next = r.format === "Meeting" ? `Top management reviews the pack before the meeting on ${r.date}. Then record the review.` : `Top management evaluates the inputs by ${r.date}. Then record the decisions and lock the record.`
  } else if (r.stage === "Reviewed" && !r.signOff) {
    current = 5
    next = `Waiting for ${r.reviewers.join(" and ")} to sign off.`
  } else if (r.stage === "Reviewed") {
    current = 6
    next = openActions ? `${openActions} action${openActions === 1 ? "" : "s"} still open. Close the review when all are done; open actions carry forward to the next review.` : "All actions are done. Close the review."
  } else {
    current = 7
    next = "Closed. Every action is done."
  }
  const steps: TrackStep[] = GUIDED_STEPS.map((label, i) => ({
    label,
    when:
      i === 1 && r.stage !== "Planned" ? `${ready} of ${all} ready` : i === 2 && r.packSentOn ? `Sent ${r.packSentOn}` : i === 4 && r.recordedOn ? `Locked ${r.recordedOn}` : i === 5 && r.signOff ? `Signed ${r.signOff.when}` : undefined,
  }))
  return { current, next, steps }
}

/* ---------------- Figures as the viewer should see them ---------------- */

export type FigureLabel = "Live" | "Prepared" | "Finalized"

/** Live figures for every input, for the person viewing. */
export function useInputFigures(review?: ManagementReviewRecord) {
  const { state, canSee } = useStore()
  return React.useMemo(() => {
    if (!review) return {} as Record<string, InputFigure>
    const period = periodOf(review)
    return Object.fromEntries(review.inputs.map((i) => [i.ref, computeInput(i.ref, state, period, { review, canSee })])) as Record<string, InputFigure>
  }, [review, state, canSee])
}

export interface ShownFigure {
  label: FigureLabel
  value: string
  detail: string
  status: FigureStatus
  warn?: boolean
  method?: string
  computedAt?: string
}

/** Finalized when locked, Prepared when the pack has gone out, otherwise Live. */
export function shownFigure(review: ManagementReviewRecord, input: ReviewInput, live?: InputFigure): ShownFigure | undefined {
  if (input.frozen) return { label: "Finalized", ...input.frozen }
  const sent = review.packSnapshot?.figures[input.ref]
  if (sent) return { label: "Prepared", ...sent, warn: live?.warn }
  if (live) return { label: "Live", value: live.value, detail: live.detail, status: live.status, warn: live.warn, method: live.method, computedAt: live.computedAt }
  return undefined
}

/** Title of a record the person may see, or undefined. Used to show "Not available" for hidden or deleted records. */
export function useResolve() {
  const { state, canSee, can } = useStore()
  return React.useCallback(
    (kind: RecordKind | "link", id: string): string | undefined => {
      switch (kind) {
        case "document": {
          const d = state.documents.find((x) => x.id === id)
          return d && canSee(d.classification, d.viewers) ? d.title : undefined
        }
        case "evidence": {
          const e = state.evidence.find((x) => x.id === id)
          return e && canSee(e.classification) ? e.title : undefined
        }
        case "objective":
          return state.objectives.find((x) => x.id === id)?.name
        case "risk":
          return state.risks.find((x) => x.id === id)?.title
        case "nonconformity":
          return state.ncs.find((x) => x.id === id)?.title
        case "audit": {
          const a = state.audits.find((x) => x.id === id)
          return a ? `${a.process} audit` : undefined
        }
        case "review":
          return can("Management Review") ? state.reviews.find((x) => x.id === id)?.title : undefined
        case "review-action":
          return can("Management Review") ? state.reviewActions.find((x) => x.id === id)?.text : undefined
        case "process":
          return state.processes.find((x) => x.id === id)?.name
        case "issue":
          return state.issues.find((x) => x.id === id)?.issue
        case "party":
          return state.parties.find((x) => x.id === id)?.name
        default:
          return undefined
      }
    },
    [state, canSee, can]
  )
}

/** The supporting records of one input: live (or frozen) records merged with the checks people made and references they added. */
export function useSupportingRows(review: ManagementReviewRecord, input: ReviewInput, live?: InputFigure): SupportingRow[] {
  const { state } = useStore()
  const resolve = useResolve()
  return React.useMemo(() => {
    const checks = state.reviewRecordChecks.filter((c) => c.reviewId === review.id && c.ref === input.ref)
    const checkFor = (kind: string, id?: string) => checks.find((c) => c.kind === kind && c.recordId === id)
    const asCheck = (c?: (typeof checks)[number]) => (c ? { status: c.status, by: c.by, at: c.at, notes: c.notes, evidenceRef: c.evidenceRef } : undefined)
    const rows: SupportingRow[] = []
    if (input.frozen) {
      for (const s of input.frozen.sources) {
        const title = resolve(s.kind, s.id)
        const c = checkFor(s.kind, s.id)
        rows.push({ key: `${s.kind}:${s.id}`, kind: s.kind, id: s.id, title: title ? (s.title ?? title) : s.id, module: RECORD_MODULE[s.kind], date: s.date, status: s.status ? `${s.status} when locked` : undefined, tone: "draft", description: s.version ? `As locked: ${s.version}.` : undefined, available: !!title, addedBy: "auto", check: asCheck(c) ?? (s.check ? { status: s.check } : undefined) })
      }
    } else if (live) {
      for (const s of live.sources) rows.push({ ...s, key: `${s.kind}:${s.id}`, available: true, addedBy: "auto", check: asCheck(checkFor(s.kind, s.id)) })
    }
    const have = new Set(rows.map((r) => r.key))
    for (const c of checks) {
      if (c.kind === "link") {
        rows.push({ key: c.id, kind: "link", url: c.url, title: c.title, module: "Outside ThryveMS", evidenceType: "Linked reference", available: true, addedBy: c.addedBy, check: asCheck(c) })
        continue
      }
      const key = `${c.kind}:${c.recordId}`
      if (have.has(key)) continue
      const title = resolve(c.kind, c.recordId ?? "")
      rows.push({ key: c.addedBy === "auto" ? key : c.id, kind: c.kind, id: c.recordId, title: title ?? c.recordId ?? "", module: RECORD_MODULE[c.kind], description: c.addedBy === "auto" ? "No longer matches this input for the period." : undefined, evidenceType: c.addedBy === "auto" ? undefined : "Linked reference", available: !!title, addedBy: c.addedBy, check: asCheck(c) })
    }
    return rows
  }, [review.id, input, live, state.reviewRecordChecks, resolve])
}

/**
 * Due-soon and overdue reminders for review actions, one per event. The real service sends these
 * from a scheduled job (plan v3 §23); the preview sends them when someone who manages reviews opens Management Review.
 */
export function useActionReminders() {
  const { state, update, notify } = useStore()
  const { canManage } = useReviewRights()
  React.useEffect(() => {
    if (!canManage) return
    const today = todayIso()
    for (const a of state.reviewActions) {
      if (a.state !== "Open" || !a.dueDate) continue
      const event = a.dueDate < today ? "overdue" : a.dueDate <= addDays(today, 7) ? "soon" : undefined
      if (!event || a.reminded?.includes(event)) continue
      notify([a.owner], { kind: event === "overdue" ? "Overdue" : "Waiting on you", title: event === "overdue" ? `Action ${a.id} from ${a.reviewId} is overdue` : `Action ${a.id} from ${a.reviewId} is due ${a.due}`, body: a.text, href: `/management-review/actions/${a.id}` })
      update("reviewActions", a.id, { reminded: [...(a.reminded ?? []), event], ...(event === "overdue" ? { late: true } : {}) })
    }
  }, [canManage, state.reviewActions])
}
