/**
 * A section is a menu destination, not every route. Moving between a register
 * and one of its records stays in the same tab; following related records into
 * another area preserves the current workspace in a separate tab (ADR-036).
 *
 * This is deliberately route-based, so no permissions or record information are
 * consulted to choose a target. Destination permission checks still apply.
 */
export function sectionForPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/"
  if (path === "/") return "overview"
  // QMS Procedures is a view of the document register. Opening its document is
  // still within that record area, despite the QMS navigation grouping.
  if (path === "/qms/procedures" || path.startsWith("/qms/procedures/")) return "documents"
  if (path === "/qms" || path.startsWith("/qms/")) return "qms"
  if (path === "/documents" || path.startsWith("/documents/")) return "documents"
  if (path === "/evidence" || path.startsWith("/evidence/")) return "evidence"
  if (path === "/risks" || path.startsWith("/risks/")) return "risks"
  if (path === "/audits" || path.startsWith("/audits/")) return "audits"
  if (path === "/management-review" || path.startsWith("/management-review/")) return "management-review"
  if (path === "/corrective-action" || path.startsWith("/corrective-action/")) return "corrective-action"
  if (path === "/settings" || path.startsWith("/settings/")) return "settings"
  if (path === "/platform" || path.startsWith("/platform/")) return "platform"
  if (path === "/readiness" || path.startsWith("/readiness/")) return "readiness"
  if (path === "/my-tasks" || path.startsWith("/my-tasks/")) return "my-tasks"
  if (path === "/search" || path.startsWith("/search/")) return "search"
  if (path === "/notifications" || path.startsWith("/notifications/")) return "notifications"
  if (path === "/remarks" || path.startsWith("/remarks/")) return "remarks"
  return path.split("/")[1] || "overview"
}

export function isCrossSectionLink(from: string, to: string): boolean {
  return sectionForPath(from) !== sectionForPath(to)
}
