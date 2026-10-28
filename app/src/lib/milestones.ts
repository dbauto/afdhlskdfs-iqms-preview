import type { State } from "@/lib/store"
import type { WorkspaceSettings } from "@/lib/settings"
import { SCOPE_DOCUMENT } from "@/lib/document-control"
import { resultsOf } from "@/data/records"
import { HOW_TYPES, RECORD_TYPES } from "@/pages/qms/process-flow"

/**
 * Milestones on the way to certification (ADR-044). Each one is worked out from the records, never
 * ticked by hand: done, in progress with a count, or not started.
 */
export type MilestoneStage = "Getting set up" | "Building the system" | "Running it" | "Certification"
export interface Milestone { id: string; stage: MilestoneStage; title: string; state: "Reached" | "In progress" | "Not started"; done: number; of: number; note: string; to: string }

const m = (id: string, stage: MilestoneStage, title: string, done: number, of: number, note: (d: number, o: number) => string, to: string): Milestone => ({
  id,
  stage,
  title,
  done: Math.min(done, of),
  of,
  state: of > 0 && done >= of ? "Reached" : done > 0 ? "In progress" : "Not started",
  note: note(Math.min(done, of), of),
  to,
})
const count = (d: number, o: number, what: string) => `${d} of ${o} ${what}`

export function milestones(state: State, settings: Pick<WorkspaceSettings, "orgChart" | "sites">): Milestone[] {
  const procs = state.processes
  const live = state.documents.filter((d) => d.stage !== "Archived")
  const policy = state.policies.find((p) => p.title === "Quality policy") ?? state.policies[0]
  const plan = (kind: string) => state.auditPlans.filter((p) => p.kind === kind)
  const released = (kind: string) => (plan(kind).some((p) => p.status === "Report released") ? 1 : 0)
  const audited = procs.filter((p) => state.audits.some((a) => a.process === p.name && ["Held", "Findings agreed", "Report issued", "Follow-up"].includes(a.state))).length
  const internalReport = state.audits.some((a) => a.state === "Report issued") || plan("Internal audit").some((p) => p.status === "Report released") ? 1 : 0
  const scope = state.documents.find((d) => d.id === SCOPE_DOCUMENT)
  return [
    m("profile", "Getting set up", "Company profile and scope published", scope?.stage === "Published" ? 1 : 0, 1, (d) => (d ? "Scope published" : "Publish the scope"), "/qms/organization"),
    m("chart", "Getting set up", "Org chart and sites filled in", (settings.orgChart.length > 0 ? 1 : 0) + (settings.sites.length > 0 ? 1 : 0), 2, (d, o) => count(d, o, "done"), "/qms/organization?tab=chart"),
    m("processes", "Getting set up", "All processes mapped, each with an owner", procs.filter((p) => p.owner).length, Math.max(1, procs.length), (d, o) => count(d, o, "processes"), "/qms/processes"),
    m("policy", "Getting set up", "Quality policy published", policy?.state === "Current" ? 1 : 0, 1, (d) => (d ? `Revision ${policy?.rev}` : "Publish the policy"), "/qms/policies"),
    m("ack", "Getting set up", "Everyone has acknowledged the policy", policy?.acknowledged ?? 0, Math.max(1, policy?.appliesTo ?? 1), (d, o) => count(d, o, "people"), "/qms/policies"),
    m("objectives", "Building the system", "Quality objectives set, each with a target", state.objectives.filter((o) => o.target > 0).length, Math.max(1, state.objectives.length), (d, o) => count(d, o, "objectives"), "/qms/objectives"),
    m("first-doc", "Building the system", "First document approved and published", live.some((d) => d.stage === "Published") ? 1 : 0, 1, (d) => (d ? "Published" : "Not yet"), "/documents"),
    m("docs", "Building the system", "Every process has its procedures and records", procs.filter((p) => live.some((d) => d.process === p.name && (HOW_TYPES.includes(d.type) || RECORD_TYPES.includes(d.type)))).length, Math.max(1, procs.length), (d, o) => count(d, o, "processes"), "/documents"),
    m("risks", "Building the system", "Risks assessed for every process", procs.filter((p) => state.risks.some((r) => r.process === p.name)).length, Math.max(1, procs.length), (d, o) => count(d, o, "processes"), "/risks"),
    m("evidence", "Building the system", "Evidence linked for every ISO clause", procs.length ? requirementsWithEvidence(state).done : 0, requirementsWithEvidence(state).of, (d, o) => count(d, o, "clauses"), "/evidence"),
    m("results", "Running it", "Results entered on time for 3 months", state.objectives.filter((o) => resultsOf(o).length >= 3).length, Math.max(1, state.objectives.length), (d, o) => count(d, o, "objectives"), "/qms/objectives"),
    m("internal", "Running it", "First internal audit report released", internalReport, 1, (d) => (d ? "Released" : "Not yet"), "/audits"),
    m("audited", "Running it", "Every process audited in the last 12 months", audited, Math.max(1, procs.length), (d, o) => count(d, o, "processes"), "/audits"),
    m("ca", "Running it", "First corrective action closed and verified", state.ncs.some((n) => n.stage >= 6) ? 1 : 0, 1, (d) => (d ? "Closed" : `${state.ncs.filter((n) => n.stage < 6).length} open`), "/corrective-action"),
    m("review", "Running it", "Management review held and minuted", state.reviews.some((r) => r.stage === "Reviewed" || r.stage === "Closed") ? 1 : 0, 1, (d) => (d ? "Held" : "Not yet"), "/management-review"),
    m("mock", "Certification", "Mock audit done, with a readiness verdict", released("Mock audit"), 1, (d) => (d ? "Verdict given" : plan("Mock audit")[0]?.date ? `Planned ${plan("Mock audit")[0].date}` : "Not planned"), "/audits?tab=plans"),
    m("stage1", "Certification", "Stage 1 audit passed", released("Stage 1"), 1, (d) => (d ? "Passed" : plan("Stage 1")[0]?.date ? `Planned ${plan("Stage 1")[0].date}` : "Not planned"), "/audits?tab=plans"),
    m("stage2", "Certification", "Certified after Stage 2", released("Stage 2"), 1, (d) => (d ? "Certified" : "Not planned yet"), "/audits?tab=plans"),
    m("surveillance", "Certification", "First surveillance audit passed", released("Surveillance"), 1, (d) => (d ? "Passed" : "After certification"), "/audits?tab=plans"),
  ]
}

/** ISO clauses 4 to 10 that have at least one linked evidence item or published document. */
function requirementsWithEvidence(state: State) {
  const clauses = ["4", "5", "6", "7", "8", "9", "10"]
  const has = (c: string) => state.evidence.some((e) => e.clauses.some((x) => x === c || x.startsWith(c + "."))) || state.documents.some((d) => d.stage === "Published" && d.clauses.some((x) => x === c || x.startsWith(c + ".")))
  return { done: clauses.filter(has).length, of: clauses.length }
}

/** The milestone to show on the Overview: the latest reached not yet seen, else the next one in progress. */
export function headline(list: Milestone[], seen: string[]) {
  const reached = list.filter((x) => x.state === "Reached")
  const fresh = reached.find((x) => !seen.includes(x.id))
  const next = list.find((x) => x.state === "In progress") ?? list.find((x) => x.state === "Not started")
  return { reached: reached.length, total: list.length, fresh, next }
}
