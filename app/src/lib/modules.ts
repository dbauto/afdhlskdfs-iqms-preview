import type { Area } from "@/data/types"

/**
 * Sections the platform admin can turn on or off for each client (Platform › Organisations).
 * Overview and Settings are always on. A section that is off disappears from that client's
 * menu, pages, role editor and buttons, whatever their role allows.
 */
export const MODULES: { area: Area; clause: string; what: string }[] = [
  { area: "Organization & Scope", clause: "4.1 to 4.3", what: "Context, interested parties, scope and glossary" },
  { area: "Policies", clause: "5.2", what: "Quality policy and other policies, with acknowledgement" },
  { area: "Processes", clause: "4.4", what: "Process map, owners and process pages" },
  { area: "Objectives & KPIs", clause: "6.2", what: "Quality objectives and their results" },
  { area: "Documents", clause: "7.5", what: "Controlled documents, revisions and approval" },
  { area: "Risks & Opportunities", clause: "6.1.1–6.1.3", what: "Risk register and matrix" },
  { area: "Evidence", clause: "7.5.3", what: "Records that prove each requirement is met" },
  { area: "Audits", clause: "9.2", what: "Audit programme, checklists and findings" },
  { area: "Management Review", clause: "9.3", what: "Review meetings, inputs and decisions" },
  { area: "Corrective Action", clause: "10.2", what: "Nonconformities, actions, complaints and improvements" },
]

export type ModuleMap = Partial<Record<Area, boolean>>

/** The client this preview is signed in to. */
export const CURRENT_ORG_ID = "arden"

export function isOn(map: ModuleMap | undefined, area: Area): boolean {
  if (area === "Overview" || area === "Settings") return true
  if (area === "QMS") return (["Organization & Scope", "Policies", "Processes", "Objectives & KPIs"] as Area[]).some((a) => isOn(map, a))
  return map?.[area] !== false
}
