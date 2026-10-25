import type { AccessGrant, AccessRequest, Person, Role } from "@/data/types"
import type { State } from "@/lib/store"
import { todayIso } from "@/lib/periods"

/**
 * Access requests (ADR-037). Someone whose role covers only some processes opens a link to a
 * Public or Internal record outside them. Instead of "not found" they can ask:
 * - for this record only: the record owner decides;
 * - for the process: the process owner ticks which of its shared records to open, or all of them.
 * Confidential and Highly confidential records never offer this; they still answer "not found",
 * so their existence isn't revealed. A grant opens records one by one and never changes the role.
 */

export type RequestKind = AccessRequest["kind"]

/** what the no-access screen may show: the number and who decides, never the title or contents */
export interface AccessTarget {
  kind: RequestKind
  id: string
  process: string
  /** record owner, or the process owner when the record owner can't decide */
  recordDecider: string
  processOwner: string
  /** a request from this person is already waiting */
  waiting?: AccessRequest
}

const shared = (classification: string) => classification === "Public" || classification === "Internal"

function active(state: State, name?: string) {
  const p = state.people.find((x) => x.name === name)
  return !!p && p.status !== "Deactivated" && (!p.accessEndsOn || p.accessEndsOn >= todayIso())
}

function recordOf(state: State, kind: RequestKind, id: string) {
  if (kind === "Document") {
    const d = state.documents.find((x) => x.id === id)
    return d && !d.withdrawn ? { classification: d.classification, process: d.process, owner: d.owner } : undefined
  }
  const e = state.evidence.find((x) => x.id === id)
  return e ? { classification: e.classification, process: e.processes[0] ?? "", owner: e.addedBy } : undefined
}

/**
 * Can this person ask for this record? Works on the whole, unscoped data, and answers only when
 * the record exists, is Public or Internal, belongs to a process and is outside what they can see.
 */
export function accessTarget(all: State, visible: State, person: Person, kind: RequestKind, id: string): AccessTarget | undefined {
  const r = recordOf(all, kind, id)
  if (!r || !shared(r.classification) || !r.process) return undefined
  const seen = kind === "Document" ? visible.documents.some((d) => d.id === id) : visible.evidence.some((e) => e.id === id)
  if (seen) return undefined
  const process = all.processes.find((p) => p.name === r.process)
  if (!process || !active(all, process.owner)) return undefined
  const recordDecider = r.owner && r.owner !== person.name && active(all, r.owner) ? r.owner : process.owner
  const waiting = all.accessRequests.find((q) => q.person === person.name && q.status === "Waiting" && (q.targetId === id || (q.scope === "Process" && q.process === r.process)))
  return { kind, id, process: r.process, recordDecider, processOwner: process.owner, waiting }
}

/** the Public and Internal records of a process that a process owner can open to someone */
export function sharedRecords(all: State, process: string) {
  return [
    ...all.documents.filter((d) => d.process === process && !d.withdrawn && shared(d.classification)).map((d) => ({ kind: "Document" as const, id: d.id, title: d.title, meta: `${d.type}, revision ${d.rev}` })),
    ...all.evidence.filter((e) => e.processes.includes(process) && shared(e.classification)).map((e) => ({ kind: "Evidence" as const, id: e.id, title: e.title, meta: "Evidence" })),
  ]
}

export function requestAccess(all: State, visible: State, person: Person, input: { kind: RequestKind; id: string; scope: AccessRequest["scope"]; note?: string }): { state: State; request: AccessRequest } {
  const t = accessTarget(all, visible, person, input.kind, input.id)
  if (!t) throw Error("This record can’t be requested. Ask its owner to share it with you.")
  if (t.waiting) throw Error("You’ve already asked. You’ll get a notification when it’s decided.")
  const request: AccessRequest = {
    id: `ar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    person: person.name,
    scope: input.scope,
    kind: input.kind,
    targetId: input.id,
    process: t.process,
    decider: input.scope === "Process" ? t.processOwner : t.recordDecider,
    note: input.note?.trim() || undefined,
    status: "Waiting",
    requestedOn: todayIso(),
  }
  return { state: { ...all, accessRequests: [request, ...all.accessRequests] }, request }
}

/**
 * The decider grants or declines. A record request opens that record; a process request opens the
 * records the process owner ticked, which must all be shared records of that process.
 */
export function decideAccess(all: State, person: Person, role: Role, requestId: string, decision: { grant: string[] } | { decline: string }): State {
  const q = all.accessRequests.find((x) => x.id === requestId)
  if (!q || q.status !== "Waiting") throw Error("This request has already been decided.")
  if (q.decider !== person.name || role.id === "consultant" || role.id === "guest-auditor") throw Error("Only the owner this request was sent to can decide it.")
  const on = todayIso()
  if ("decline" in decision) {
    return { ...all, accessRequests: all.accessRequests.map((x): AccessRequest => (x.id === q.id ? { ...x, status: "Declined", decidedOn: on, reason: decision.decline.trim() || undefined } : x)) }
  }
  const allowed = q.scope === "Process" ? sharedRecords(all, q.process) : sharedRecords(all, q.process).filter((r) => r.id === q.targetId)
  const picked = allowed.filter((r) => decision.grant.includes(r.id))
  if (!picked.length) throw Error(q.scope === "Process" ? "Tick at least one record to share, or decline." : "This record is no longer shared. Decline the request instead.")
  const have = new Set(all.accessGrants.filter((g) => g.person === q.person).map((g) => g.targetId))
  const grants: AccessGrant[] = picked.filter((r) => !have.has(r.id)).map((r, i) => ({ id: `ag-${Date.now()}-${i}`, person: q.person, kind: r.kind, targetId: r.id, grantedBy: person.name, grantedOn: on, requestId: q.id }))
  return {
    ...all,
    accessGrants: [...grants, ...all.accessGrants],
    accessRequests: all.accessRequests.map((x): AccessRequest => (x.id === q.id ? { ...x, status: "Granted", decidedOn: on, granted: picked.map((r) => r.id) } : x)),
  }
}
