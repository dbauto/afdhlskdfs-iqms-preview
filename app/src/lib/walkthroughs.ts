export interface WalkthroughStep {
  title: string
  body: string
  selectors: string[]
}

export interface WalkthroughGuide {
  id: string
  version: string
  route: string
  page: string
  steps: WalkthroughStep[]
}

const GUIDE_VERSION = "1.0.0"

const pages = [
  ["GUIDE-MENU-001", "/", "Overview"],
  ["GUIDE-MENU-002", "/my-tasks", "My tasks"],
  ["GUIDE-MENU-003", "/qms/organization", "Organisation"],
  ["GUIDE-MENU-004", "/qms/policies", "Policies"],
  ["GUIDE-MENU-005", "/qms/processes", "Processes"],
  ["GUIDE-MENU-006", "/qms/objectives", "Objectives"],
  ["GUIDE-MENU-007", "/documents", "Documents"],
  ["GUIDE-MENU-008", "/documents/reviews", "Document reviews"],
  ["GUIDE-MENU-009", "/risks", "Risks"],
  ["GUIDE-MENU-010", "/evidence", "Evidence"],
  ["GUIDE-MENU-011", "/audits", "Audits"],
  ["GUIDE-MENU-013", "/corrective-action", "Corrective action"],
  ["GUIDE-MENU-014", "/settings/organization", "Organisation settings"],
  ["GUIDE-MENU-015", "/settings/users", "Users"],
  ["GUIDE-MENU-016", "/settings/roles", "Roles and permissions"],
  ["GUIDE-MENU-017", "/settings/security", "Security"],
  ["GUIDE-MENU-018", "/settings/integrations", "Integrations"],
  ["GUIDE-MENU-019", "/settings/branding", "Branding"],
  ["GUIDE-MENU-020", "/settings/activity", "Activity"],
  ["GUIDE-MENU-021", "/settings/process-structure", "Process structure"],
  ["GUIDE-MENU-022", "/settings/certification", "Certification"],
  ["GUIDE-MENU-023", "/settings/qms-rules", "QMS rules"],
  ["GUIDE-MENU-024", "/settings/numbering", "Document numbering"],
  ["GUIDE-MENU-025", "/settings/review", "Review and approval"],
  ["GUIDE-MENU-026", "/settings/retention", "Record retention"],
  ["GUIDE-MENU-027", "/settings/profile", "Profile and security"],
  ["GUIDE-MENU-028", "/settings/appearance", "Appearance"],
  ["GUIDE-MENU-029", "/settings/notifications", "Notifications"],
  ["GUIDE-MENU-030", "/settings/data-export", "Data export"],
  ["GUIDE-MENU-031", "/settings/billing", "Billing"],
  ["GUIDE-MENU-032", "/settings/privacy", "Privacy"],
  ["GUIDE-MENU-033", "/settings/legal", "Legal and agreements"],
  ["GUIDE-MENU-034", "/settings/support", "Contact support"],
  ["GUIDE-MENU-035", "/settings/about", "About"],
  ["GUIDE-MENU-036", "/platform", "Organisations"],
  ["GUIDE-MENU-037", "/platform/requests", "Requests"],
  ["GUIDE-MENU-038", "/platform/logs", "Logs"],
  ["GUIDE-MENU-039", "/platform/jobs", "Background jobs"],
  ["GUIDE-MENU-040", "/platform/reports", "Support reports"],
  ["GUIDE-MENU-041", "/platform/support", "Support access"],
  ["GUIDE-MENU-042", "/platform/team", "Platform team"],
  ["GUIDE-MENU-043", "/qms/procedures", "Procedures"],
] as const

function steps(page: string): WalkthroughStep[] {
  return [
    {
      title: `Welcome to ${page}`,
      body: "This heading confirms where you are and the purpose of this page.",
      selectors: ["main h1"],
    },
    {
      title: "Review what is visible",
      body: "Use the visible summaries, filters, and status information to understand the work available to you.",
      selectors: ["main [role='group']", "main table", "main section", "main [data-slot='card']"],
    },
    {
      title: "Continue your work",
      body: "Available actions already reflect your current access. The walkthrough explains them without selecting or changing any business record.",
      selectors: ["main button:not([aria-label='Play walkthrough'])", "main a[href]", "main h1"],
    },
  ]
}

export const WALKTHROUGH_GUIDES: readonly WalkthroughGuide[] = pages.map(([id, route, page]) => ({
  id,
  version: GUIDE_VERSION,
  route,
  page,
  steps: steps(page),
}))

export function walkthroughForRoute(pathname: string) {
  return WALKTHROUGH_GUIDES.find((guide) => guide.route === pathname)
}
