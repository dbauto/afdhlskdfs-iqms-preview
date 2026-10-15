/**
 * Who may audit what. ISO 9001 clause 9.2.2: auditors are chosen so the audit is objective
 * and impartial, so no one audits their own work.
 */
import type { Auditor, DocRecord, Person, Process } from "@/data/types"

/** Why this auditor can't audit this process, or undefined if they can. */
export function blockedReason(a: Auditor, process: string, processes: Process[], people: Person[]): string | undefined {
  const p = processes.find((x) => x.name === process)
  if (p?.owner === a.name) return "Owns this process"
  const person = people.find((x) => x.name === a.name)
  if (p?.members?.includes(a.name)) return "Works in this process"
  if (a.extraExclusions.includes(process)) return "Marked as not independent"
  return undefined
}

/** The ways someone was involved in a document: owner, reviewer or approver. */
export function involvement(name: string, doc?: DocRecord): string | undefined {
  if (!doc) return undefined
  if (doc.owner === name) return "owns"
  if (doc.approvers.includes(name)) return "approved"
  if (doc.reviewers.includes(name)) return "reviewed"
  return undefined
}

/** "OPS-PRO-001 Production planning and control" -> "OPS-PRO-001" */
export const docIdOf = (evidence: string) => evidence.split(" ")[0]
