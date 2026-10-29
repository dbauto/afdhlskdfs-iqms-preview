/**
 * Review routes: who reviews and who approves a document revision.
 *
 * Three levels, the most specific wins:
 *   1. company default by document type (Settings › Review and approval)
 *   2. the process's own route (process page › Summary › Review route)
 *   3. for a new revision, the people on the previous revision
 * The person starting a revision can change it for that revision only.
 */
import type { DocRecord, Person, Process, Role } from "@/data/types"
import { peopleAllowed } from "@/lib/permissions"

/** An approver rule: a job ("Process owner") or a named person. */
export type ApproverRule = string
export const APPROVER_JOBS = ["Process owner", "Quality manager", "Managing director"] as const

export interface RouteDefaults {
  reviewers: string[]
  approverByType: Record<string, ApproverRule>
}

export const DEFAULT_ROUTES: RouteDefaults = {
  reviewers: ["Nina Flores"],
  approverByType: {
    Manual: "Managing director",
    Policy: "Managing director",
    Procedure: "Process owner",
    "Work instruction": "Process owner",
    Form: "Process owner",
    Register: "Quality manager",
    Record: "Process owner",
    Standard: "Quality manager",
  },
}

export interface ResolvedRoute {
  reviewers: string[]
  approvers: string[]
  /** where the route came from, shown under the route */
  source: string
  /** changes made automatically, such as replacing someone who left */
  notes: string[]
  /** the approver the company or process requires; only quality managers can remove them */
  required: string[]
}

function resolveRule(rule: ApproverRule, process: Process | undefined, people: Person[], roles: Role[] = []): string | undefined {
  if (rule === "Process owner") return process?.owner
  // the first active person whose role is picked by the "Quality manager" rule (ADR-045)
  if (rule === "Quality manager") return peopleAllowed(people, roles, "docs.qmRule", false)[0] ?? people.find((p) => p.roleId === "quality" && p.status === "Active")?.name
  if (rule === "Managing director") return people.find((p) => /managing director/i.test(p.title) && p.status === "Active")?.name
  return rule
}

/** "Policy" -> "policies", "Work instruction" -> "work instructions" */
export const typePlural = (t: string) => (t.endsWith("y") ? t.slice(0, -1) + "ies" : t + "s").toLowerCase()

/** The default route for a document type in a process, before any previous revision is considered. */
export function defaultRoute(type: string, processName: string, processes: Process[], people: Person[], d: RouteDefaults, roles: Role[] = []): ResolvedRoute {
  const process = processes.find((p) => p.name === processName)
  const company = resolveRule(d.approverByType[type] ?? "Process owner", process, people, roles)
  const own = process?.route
  const approvers = own?.approvers?.length ? own.approvers : company ? [company] : []
  const reviewers = own?.reviewers?.length ? own.reviewers : d.reviewers
  const source = own?.approvers?.length || own?.reviewers?.length ? `From the ${processName} process route` : `Company default for ${typePlural(type)}`
  return { reviewers, approvers, source, notes: [], required: approvers }
}

/** The route proposed for the next revision of a document: the last route, with leavers replaced. */
export function revisionRoute(doc: DocRecord, processes: Process[], people: Person[], d: RouteDefaults): ResolvedRoute {
  const base = defaultRoute(doc.type, doc.process, processes, people, d)
  const active = (n: string) => people.find((p) => p.name === n)?.status !== "Deactivated"
  const notes: string[] = []
  const keep = (list: string[], fallback: string[], step: string) => {
    const gone = list.filter((n) => !active(n))
    gone.forEach((n) => notes.push(`${n} has left, so the default ${step} ${fallback.join(" and ")} was added.`))
    const kept = list.filter(active)
    return kept.length ? [...new Set([...kept, ...(gone.length ? fallback : [])])] : fallback
  }
  const approvers = keep(doc.approvers, base.approvers, "approver")
  // the approver the company or process requires is always proposed, even if the last revision skipped them
  for (const n of base.required)
    if (!approvers.includes(n)) {
      approvers.push(n)
      notes.push(`${n} was added: they must approve ${typePlural(doc.type)} in ${doc.process}.`)
    }
  return {
    reviewers: keep(doc.reviewers, base.reviewers, "reviewer"),
    approvers,
    source: `Same people as revision ${doc.rev}`,
    notes,
    required: base.required,
  }
}

/** Problems with a route, in plain words. Empty when it's fine. */
export function routeProblems(r: { reviewers: string[]; approvers: string[] }, opts: { author: string; isQuality: boolean; required: string[]; doc?: Pick<DocRecord, "viewers" | "classification">; consultants?: string[] }): string[] {
  const out: string[] = []
  if (!r.reviewers.length) out.push("Add at least one technical reviewer.")
  if (!r.approvers.length) out.push("Add at least one approver.")
  const outside = r.approvers.filter((n) => opts.consultants?.includes(n))
  if (outside.length) out.push(`${outside.join(" and ")} can’t approve documents with ${outside.length > 1 ? "their roles" : "their role"}. Choose people whose role can approve.`)
  if (r.approvers.includes(opts.author)) out.push(`You’re starting this revision, so you can’t also approve it. Choose someone else.`)
  const missing = opts.required.filter((n) => !r.approvers.includes(n))
  if (missing.length && !opts.isQuality) out.push(`${missing.join(" and ")} must approve this type of document. Only a quality manager can remove them.`)
  if (opts.doc && opts.doc.classification !== "Public" && opts.doc.classification !== "Internal" && opts.doc.viewers.length) {
    const cant = [...r.reviewers, ...r.approvers].filter((n) => !opts.doc!.viewers.includes(n))
    if (cant.length) out.push(`${[...new Set(cant)].join(", ")} can’t see this ${opts.doc.classification.toLowerCase()} document. Give them access first, or choose someone who has it.`)
  }
  return out
}
