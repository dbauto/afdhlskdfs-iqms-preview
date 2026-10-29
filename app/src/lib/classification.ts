import type { Person, Role } from "@/data/types"
import { allows } from "@/lib/permissions"

/** Who a record belongs to, for classification checks: its owner, people named on it, and people on its review route. */
export interface ClassifiedParties {
  viewers?: string[]
  owner?: string
  route?: string[]
}

/**
 * Plan v3 §9 classification access, in one place for lists, counts, search and record pages:
 * Public and Internal: everyone in the workspace.
 * Confidential: named viewers, the owner, route members, and roles granted "Can open Confidential records".
 *   Consultants only when named (decision D18).
 * Highly confidential: named viewers and the owner only; never consultants.
 */
export function classificationAllows(classification: string, parties: ClassifiedParties, person: Pick<Person, "name">, role: Role) {
  if (classification === "Public" || classification === "Internal") return true
  const me = person.name
  const named = !!parties.viewers?.includes(me)
  const owner = !!parties.owner && parties.owner === me
  // the outside consultant only sees Confidential records they are named on (decision D18)
  if (allows(role, "remarks.consultant")) return classification === "Confidential" && named
  if (classification === "Highly confidential") return named || owner || allows(role, "docs.highly")
  return named || owner || !!parties.route?.includes(me) || allows(role, "docs.confidential")
}
