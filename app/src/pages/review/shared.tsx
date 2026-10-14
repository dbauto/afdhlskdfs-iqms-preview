import { useStore, type State } from "@/lib/store"
import type { BadgeTone } from "@/components/ui/badge"
import type { ManagementReviewRecord, ReviewAction, ReviewFormat, ReviewStage } from "@/data/types"

export const FORMATS: { id: ReviewFormat; title: string; hint: string }[] = [
  { id: "Meeting", title: "Meeting", hint: "Everyone together on one day. Record who attended." },
  { id: "No meeting", title: "No meeting", hint: "Top management reads the review pack, comments and signs off." },
  { id: "Several meetings", title: "Over several meetings", hint: "Inputs covered in regular management meetings. Record the date for each." },
]

export const formatLabel = (f: ReviewFormat) => (f === "Meeting" ? "Meeting" : f === "No meeting" ? "No meeting, pack reviewed" : "Over several meetings")

export function stageTone(r: ManagementReviewRecord, open: number): { label: string; tone: BadgeTone } {
  const map: Record<ReviewStage, { label: string; tone: BadgeTone }> = {
    Planned: { label: "Planned", tone: "draft" },
    Preparing: { label: "Preparing", tone: "progress" },
    Reviewed: { label: open ? "Reviewed, actions open" : "Reviewed", tone: open ? "soon" : "done" },
    Closed: { label: "Closed", tone: "done" },
  }
  if (r.stage === "Reviewed" && !r.signOff) return { label: "Waiting for sign-off", tone: "soon" }
  return map[r.stage]
}

/** Who can do what on management reviews. The consultant can draft input notes but not run the review. */
export function useReviewRights(r?: ManagementReviewRecord) {
  const { can, role, user } = useStore()
  const canManage = can("Management Review", "Add and edit") && role.id !== "consultant"
  return {
    canManage,
    canDraft: canManage || role.id === "consultant",
    isReviewer: !!r?.reviewers.includes(user.name),
    isInvolved: !!r && (r.reviewers.includes(user.name) || r.others.includes(user.name) || r.preparedBy === user.name),
  }
}

export const recordHref = (id: string) => (id.startsWith("NC-") ? `/corrective-action/${id}` : /^[RO]-\d/.test(id) ? "/risks" : id.startsWith("MR-") ? `/management-review/${id}` : `/documents/${id}`)

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
