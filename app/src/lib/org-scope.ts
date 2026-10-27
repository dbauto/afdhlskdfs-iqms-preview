import { TENANTS } from "@/data/admin"
import { useConsole } from "@/lib/console-store"
import { usePlatformAccess } from "@/lib/platform-access"

/**
 * Which organisations the signed-in member sees (ADR-042). Partners are Co-admins limited to the organisations
 * assigned to their partner company; everyone else sees all. Archived organisations are hidden from lists.
 */
export function useOrgScope() {
  const { me } = usePlatformAccess()
  const c = useConsole()
  const visible = (id: string) => !me.partnerId || c.partnerOf[id] === me.partnerId
  const orgs = TENANTS.filter((t) => visible(t.id) && !c.orgs[t.id]?.archived)
  return { partnerId: me.partnerId, visible, orgs, orgNames: new Set(orgs.map((t) => t.name)) }
}
