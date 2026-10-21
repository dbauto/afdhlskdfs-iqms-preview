import { classificationAllows } from "@/lib/classification"
import type { State } from "./store"
import {
  ACCESS_LEVELS,
  type AccessLevel,
  type DocRecord,
  type DocumentRevision,
  type Person,
  type QmsScopeContent,
  type Role,
} from "@/data/types"
import { nowIso, todayIso } from "./periods"
import { routeProblems } from "./routes"

export const SCOPE_DOCUMENT = "QMS-MAN-001"
export const INITIAL_SCOPE: QmsScopeContent = {
  statement:
    "The design, manufacture, inspection and delivery of precision machined and assembled components for industrial equipment makers, carried out at the Arden & Co. head office and production plant.",
  products:
    "Machined components, sub-assemblies, and design support for customer-specified parts.",
  sites:
    "Head office and production plant. Outsourced heat treatment and plating are controlled as external processes.",
  exclusions: "None. All ISO 9001 requirements apply.",
  standard:
    "ISO 9001, certified since 2019. Next surveillance audit February 2027.",
}

/** access levels add up: Approve includes Add and edit (Settings › Roles) */
const atLeast = (level: AccessLevel | undefined, min: AccessLevel) => ACCESS_LEVELS.indexOf(level ?? "None") >= ACCESS_LEVELS.indexOf(min)

export function snapshotDocument(doc: DocRecord): DocumentRevision {
  const { revisions: _revisions, events: _events, ...version } = doc
  return structuredClone({
    ...version,
    ...(doc.id === SCOPE_DOCUMENT && !doc.scopeContent
      ? { scopeContent: INITIAL_SCOPE }
      : {}),
  })
}

export function documentRevisions(doc: DocRecord): DocumentRevision[] {
  return [snapshotDocument(doc), ...(doc.revisions ?? [])].sort(
    (a, b) => Number(b.rev) - Number(a.rev),
  )
}

export const nextDocumentRevision = (doc: DocRecord) =>
  String(
    Math.max(...documentRevisions(doc).map((r) => Number(r.rev))) + 1,
  ).padStart(2, "0")

export function controlledRevision(
  doc: DocRecord,
): DocumentRevision | undefined {
  if (doc.stage === "Archived") return undefined
  return documentRevisions(doc).find(
    (r) =>
      r.stage === "Published" &&
      !r.withdrawn &&
      r.effectivity !== "Superseded" &&
      r.effectivity !== "Archived",
  )
}

export function revisionVisible(
  r: DocumentRevision,
  person: Person,
  role: Role,
) {
  return classificationAllows(r.classification, { viewers: r.viewers, owner: r.owner, route: [...r.reviewers, ...r.approvers] }, person, role)
}

export function documentRights(state: State, person: Person, doc: DocRecord) {
  const actor = state.people.find((p) => p.id === person.id)
  const role = state.roles.find((r) => r.id === actor?.roleId)
  const active =
    !!actor &&
    !!role &&
    actor.status !== "Deactivated" &&
    (!actor.accessEndsOn || actor.accessEndsOn >= todayIso())
  const process = state.processes.find((p) => p.name === doc.process)
  const scoped =
    !!role &&
    (["All processes", "Not their own process"].includes(role.scope) ||
      !process ||
      process.owner === actor?.name ||
      !!process.members?.includes(actor?.name ?? ""))
  const view =
    active &&
    scoped &&
    role!.access.Documents !== "None" &&
    revisionVisible(doc, actor!, role!)
  const edit =
    view && atLeast(role!.access.Documents, "Add and edit")
  const manage =
    view && role!.id !== "consultant" && role!.access.Documents === "Manage"
  return {
    view,
    edit,
    manage,
    draft: edit && ["Draft", "Changes requested"].includes(doc.stage),
    actor,
    role,
  }
}

export type DocumentCommand =
  | {
      kind: "startRevision"
      id: string
      expectedRev: string
      reviewers: string[]
      approvers: string[]
      note: string
      scopeContent?: QmsScopeContent
    }
  | {
      kind: "saveDraft"
      id: string
      expectedRev: string
      record: DocRecord
      submit: boolean
    }
  | {
      kind: "review" | "approve" | "publish" | "withdraw" | "archive"
      id: string
      expectedRev: string
    }
  | { kind: "requestChanges"; id: string; expectedRev: string; reason: string }
  | {
      kind: "effectivity"
      id: string
      expectedRev: string
      revision: string
      suspend: boolean
      reason: string
    }

export function scopeProblems(scope?: QmsScopeContent) {
  return !scope || Object.values(scope).some((v) => !v.trim())
    ? [
        "Complete the scope statement, products and services, sites, applicability and standard.",
      ]
    : []
}

export function applyDocumentCommand(
  state: State,
  person: Person,
  c: DocumentCommand,
): State {
  const doc = state.documents.find((d) => d.id === c.id)
  if (!doc) throw Error("This document is not available.")
  const rights = documentRights(state, person, doc)
  if (!rights.view) throw Error("This document is not available.")
  if (doc.rev !== c.expectedRev)
    throw Error("The revision changed; reopen the document before continuing.")
  const actor = rights.actor!,
    role = rights.role!,
    on = nowIso()
  let next: DocRecord = structuredClone(doc)
  const event = (
    kind: NonNullable<DocRecord["events"]>[number]["kind"],
    revision: string,
    reason?: string,
  ) => {
    next.events = [
      ...(next.events ?? []),
      { kind, revision, reason, by: actor.name, on },
    ]
  }
  if (c.kind === "startRevision") {
    if (!rights.edit || doc.stage !== "Published")
      throw Error(
        "Finish or withdraw the ongoing revision before starting another.",
      )
    if (!c.note.trim()) throw Error("Say what is changing in this revision.")
    const p = routeProblems(
      { reviewers: c.reviewers, approvers: c.approvers },
      {
        author: actor.name,
        isQuality: rights.manage,
        required: [],
        doc,
        consultants: state.people
          .filter((p) => p.roleId === "consultant")
          .map((p) => p.name),
      },
    )
    if (
      [...c.reviewers, ...c.approvers].some(
        (name) =>
          !state.people.some(
            (p) =>
              p.name === name &&
              p.status !== "Deactivated" &&
              (!p.accessEndsOn || p.accessEndsOn >= todayIso()),
          ),
      )
    )
      p.push("Choose active reviewers and approvers.")
    if (doc.id === SCOPE_DOCUMENT) {
      if (
        !atLeast(role.access["Organization & Scope"], "Add and edit")
      )
        throw Error("You cannot revise the QMS scope.")
      p.push(...scopeProblems(c.scopeContent))
    }
    if (p.length) throw Error(p[0])
    next.revisions = [...(doc.revisions ?? []), snapshotDocument(doc)]
    next.rev = nextDocumentRevision(doc)
    next.stage = "Draft"
    next.reviewers = c.reviewers
    next.approvers = c.approvers
    next.changeNote = c.note.trim()
    next.startedBy = actor.name
    next.startedOn = on
    next.publishedOn = undefined
    next.publishedBy = undefined
    next.approvedOn = undefined
    next.approvedBy = undefined
    next.reviewedBy = undefined
    next.effectivity = undefined
    if (c.scopeContent) next.scopeContent = c.scopeContent
    event("Revision started", next.rev, c.note.trim())
  } else if (c.kind === "saveDraft") {
    if (!rights.draft)
      throw Error(
        "Only a draft or changes-requested revision can be edited; start a new revision for published content.",
      )
    const record = c.record
    if (
      !record.title.trim() ||
      !record.description.trim() ||
      !/^https:\/\//.test(record.link)
    )
      throw Error(
        "Complete the title, description and full HTTPS document link.",
      )
    const destination = { ...doc, process: record.process }
    if (!documentRights(state, actor, destination).edit)
      throw Error("Choose a process you can edit.")
    if (
      doc.id === SCOPE_DOCUMENT &&
      (scopeProblems(record.scopeContent).length ||
        !atLeast(role.access["Organization & Scope"], "Add and edit"))
    )
      throw Error("Complete the scope fields using an authorized scope editor.")
    if (
      c.submit &&
      (!record.clauses.length ||
        !record.reviewers.length ||
        !record.approvers.length ||
        record.approvers.includes(doc.startedBy ?? actor.name) ||
        record.approvers.some(
          (n) =>
            state.people.find((p) => p.name === n)?.roleId === "consultant",
        ))
    )
      throw Error(
        "Choose clauses, reviewers and an independent approver before submitting.",
      )
    // Revision history, publication metadata and workflow state cannot be patched by a form.
    if (c.submit) {
      next.reviewedBy = []
      next.approvedBy = []
      next.approvedOn = undefined
    }
    next = {
      ...next,
      title: record.title,
      process: record.process,
      type: record.type,
      owner: record.owner,
      classification: record.classification,
      description: record.description,
      link: record.link,
      clauses: record.clauses,
      viewers: record.viewers,
      reviewers: record.reviewers,
      approvers: record.approvers,
      approvalMode: record.approvalMode,
      scopeContent: record.scopeContent,
      stage: c.submit ? "Technical review" : doc.stage,
    }
  } else if (c.kind === "review") {
    if (
      doc.stage !== "Technical review" ||
      !doc.reviewers.includes(actor.name) ||
      !["Add and edit", "Approve", "Manage"].includes(role.access.Documents) ||
      role.id === "consultant"
    )
      throw Error("Only an assigned technical reviewer can complete this step.")
    next.reviewedBy = [...new Set([...(doc.reviewedBy ?? []), actor.name])]
    if (doc.reviewers.every((n) => next.reviewedBy!.includes(n)))
      next.stage = "Approval"
  } else if (c.kind === "approve" || c.kind === "requestChanges") {
    if (
      doc.stage !== "Approval" ||
      !doc.approvers.includes(actor.name) ||
      role.id === "consultant" ||
      actor.name === doc.startedBy ||
      ACCESS_LEVELS.indexOf(role.access.Documents) <
        ACCESS_LEVELS.indexOf("Approve")
    )
      throw Error(
        "Only an assigned independent approver can decide this revision.",
      )
    if (
      doc.approvalMode === "One after another" &&
      doc.approvers.find((n) => !doc.approvedBy?.includes(n)) !== actor.name
    )
      throw Error("Wait for the earlier approver to finish.")
    if (c.kind === "requestChanges") {
      if (!c.reason.trim()) throw Error("Say what needs to change.")
      next.stage = "Changes requested"
      next.approvedBy = []
    } else {
      next.approvedBy = [...new Set([...(doc.approvedBy ?? []), actor.name])]
      const complete =
        doc.approvalMode === "Any one of them" ||
        doc.approvers.every((n) => next.approvedBy!.includes(n))
      if (complete) {
        next.stage = "Ready to publish"
        next.approvedOn = todayIso()
      }
    }
  } else if (c.kind === "publish") {
    if (!rights.manage || doc.stage !== "Ready to publish")
      throw Error(
        "Only an authorized publisher can publish an approved revision.",
      )
    next.stage = "Published"
    next.publishedOn = todayIso()
    next.publishedBy = actor.name
    next.effectivity = "Effective"
    next.lateBy = undefined
    next.revisions = (next.revisions ?? []).map((r) =>
      r.stage === "Published" && !r.withdrawn
        ? { ...r, effectivity: "Superseded" }
        : r,
    )
    event("Published", doc.rev)
  } else if (c.kind === "effectivity") {
    if (!rights.manage || !c.reason.trim())
      throw Error(
        "An authorized document manager must give a reason to change effectivity.",
      )
    const controlled = controlledRevision(doc)
    if (
      !controlled ||
      !revisionVisible(controlled, actor, role) ||
      controlled.rev !== c.revision
    )
      throw Error(
        "The controlled revision changed; reopen the document before continuing.",
      )
    const expected = c.suspend ? "Effective" : "Suspended"
    if ((controlled.effectivity ?? "Effective") !== expected)
      throw Error(
        "Effectivity already changed; reopen the document before continuing.",
      )
    if (controlled.rev === doc.rev)
      next.effectivity = c.suspend ? "Suspended" : "Effective"
    else
      next.revisions = next.revisions?.map((r) =>
        r.rev === controlled.rev
          ? { ...r, effectivity: c.suspend ? "Suspended" : "Effective" }
          : r,
      )
    event(
      c.suspend ? "Effectivity suspended" : "Effectivity resumed",
      controlled.rev,
      c.reason.trim(),
    )
  } else if (c.kind === "withdraw") {
    if (!rights.edit || ["Published", "Archived"].includes(doc.stage))
      throw Error("Only an ongoing revision can be withdrawn.")
    const controlled = controlledRevision(doc)
    const withdrawn = { ...snapshotDocument(doc), withdrawn: true }
    next = controlled
      ? {
          ...controlled,
          revisions: [
            ...(doc.revisions ?? []).filter((r) => r.rev !== controlled.rev),
            withdrawn,
          ],
          events: doc.events,
        }
      : { ...next, stage: "Archived", withdrawn: true, effectivity: "Archived" }
    event("Withdrawn", doc.rev)
  } else {
    if (!rights.manage || doc.stage === "Archived")
      throw Error(
        "Only an authorized document manager can archive an active document.",
      )
    next.stage = "Archived"
    next.effectivity = "Archived"
    next.revisions = next.revisions?.map((r) =>
      r.stage === "Published" ? { ...r, effectivity: "Archived" } : r,
    )
    event("Archived", doc.rev)
  }
  return {
    ...state,
    documents: state.documents.map((d) => (d.id === doc.id ? next : d)),
  }
}
