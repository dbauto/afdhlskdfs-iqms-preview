import { formRights } from "./audit-form-policy"
import type { State } from "./store"
import type { Person, Role } from "@/data/types"
import type { AuditReference } from "@/data/audit-types"
import { isSafeUrl } from "./record-links"
import { classificationAllows } from "./classification"
export const referenceKey = (r: AuditReference) => `${r.kind}:${r.id ?? r.url}:${r.responseRevision ?? ""}`
export function mayReadReference(state: State, person: Person, role: Role, ref: AuditReference, auditProcess?: string) {
  if (person.status === "Deactivated" || (person.accessEndsOn && person.accessEndsOn < new Date().toISOString().slice(0, 10)))
    return false
  if (ref.kind === "response") {
    const response = state.auditeeResponses.find((r) => r.id === ref.id)
    const audit = state.audits.find((a) => a.id === response?.auditId)
    const form = state.auditChecklists.find(c => c.id === response?.checklistId)
    const q = form?.sections.flatMap((s) => s.items)
      .find((q) => q.id === response?.questionId)
    return (
      !!response?.submissions?.some((s) => s.revision === ref.responseRevision) &&
      !!audit &&
      role.access.Audits !== "None" &&
      (!!form && formRights(state, form, person, role).view && (form.members !== undefined || ["admin", "quality"].includes(role.id) ||
        audit.lead === person.name ||
        (audit.auditors.includes(person.name) && q?.askedBy === person.name)))
    )
  }
  if (ref.kind === "link") return isSafeUrl(ref.url)
  const record =
    ref.kind === "document" ? state.documents.find((d) => d.id === ref.id) : state.evidence.find((e) => e.id === ref.id)
  if (!record) return false
  const area = ref.kind === "document" ? "Documents" : "Evidence"
  if (role.access[area] === "None") return false
  const parties = "owner" in record ? { viewers: record.viewers, owner: record.owner, route: [...record.reviewers, ...record.approvers] } : { owner: record.addedBy }
  if (!classificationAllows(record.classification, parties, person, role)) return false
  const processes = "processes" in record ? record.processes : [record.process]
  const wide = ["All processes", "Not their own process"].includes(role.scope)
  return (
    processes.length === 0 ||
    (!!auditProcess && processes.includes(auditProcess)) ||
    wide ||
    processes.some((name) => {
      const p = state.processes.find((p) => p.name === name)
      return !!p && (p.owner === person.name || p.members?.includes(person.name))
    })
  )
}
export function validatedReferences(state: State, person: Person, role: Role, refs: AuditReference[], auditProcess?: string) {
  return [
    ...new Map(
      refs.map((r) => {
        if (!mayReadReference(state, person, role, r, auditProcess))
          throw Error(
            "An evidence reference is unavailable or not permitted. Choose an accessible record or a full https:// link.",
          )
        const record =
          r.kind === "document"
            ? state.documents.find((d) => d.id === r.id)
            : r.kind === "evidence"
              ? state.evidence.find((e) => e.id === r.id)
              : undefined
        return [
          referenceKey(r),
          {
            ...r,
            title: record?.title ?? r.title.trim(),
            url: r.kind === "link" ? r.url!.trim() : undefined,
            addedBy: person.name,
            addedAt: r.addedAt || new Date().toISOString(),
          },
        ] as const
      }),
    ).values(),
  ]
}
