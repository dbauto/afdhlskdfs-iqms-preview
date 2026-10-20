/**
 * One way to link to a record. Every record kind has its own page; links to them open in a new
 * tab (see RecordLink), so a review or audit being worked on stays open.
 */

export type RecordKind =
  | "document"
  | "objective"
  | "risk"
  | "evidence"
  | "audit"
  | "nonconformity"
  | "review"
  | "review-action"
  | "process"
  | "issue"
  | "party"

export const RECORD_KIND_LABEL: Record<RecordKind, string> = {
  document: "Document",
  objective: "Objective",
  risk: "Risk or opportunity",
  evidence: "Evidence",
  audit: "Audit",
  nonconformity: "Nonconformity",
  review: "Management review",
  "review-action": "Review action",
  process: "Process",
  issue: "Context issue",
  party: "Interested party",
}

/** The module a record lives in, as named in the menu. */
export const RECORD_MODULE: Record<RecordKind, string> = {
  document: "Documents",
  objective: "Objectives & KPIs",
  risk: "Risks & Opportunities",
  evidence: "Evidence",
  audit: "Audits",
  nonconformity: "Corrective Action",
  review: "Management Review",
  "review-action": "Management Review",
  process: "Processes",
  issue: "Organization & Scope",
  party: "Organization & Scope",
}

/** The route of a record's own page. */
export function recordHref(kind: RecordKind, id: string) {
  const e = encodeURIComponent(id)
  switch (kind) {
    case "document":
      return `/documents/${e}`
    case "objective":
      return `/qms/objectives/${e}`
    case "risk":
      return `/risks/${e}`
    case "evidence":
      return `/evidence/${e}`
    case "audit":
      return `/audits/${e}`
    case "nonconformity":
      return `/corrective-action/${e}`
    case "review":
      return `/management-review/${e}`
    case "review-action":
      return `/management-review/actions/${e}`
    case "process":
      return `/qms/processes/${e}`
    case "issue":
      return `/qms/organization/issues/${e}`
    case "party":
      return `/qms/organization/parties/${e}`
  }
}

/** Works out the kind from an ID such as NC-2026-007, R-031, EV-0208 or OPS-WI-014. Unknown IDs are treated as documents. */
export function kindOfId(id: string): RecordKind {
  if (/^NC-/.test(id)) return "nonconformity"
  if (/^[RO]-\d/.test(id)) return "risk"
  if (/^EV-/.test(id)) return "evidence"
  if (/^IA-/.test(id)) return "audit"
  if (/^OBJ-/.test(id)) return "objective"
  if (/^MR-/.test(id)) return "review"
  if (/^RA-/.test(id)) return "review-action"
  if (/^ci-/.test(id)) return "issue"
  if (/^ip-/.test(id)) return "party"
  return "document"
}

/** Route for an ID whose kind isn't known in advance. */
export const hrefForId = (id: string) => recordHref(kindOfId(id), id)

/** Only full https:// addresses are accepted as links to outside documents (SharePoint, OneDrive). */
export function isSafeUrl(url?: string): url is string {
  if (!url) return false
  try {
    const u = new URL(url.trim())
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "")
    const privateHost =
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host === "::1" ||
      host === "::" ||
      /^(fc|fd|fe80):/i.test(host) ||
      /^(0|10|127)\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    return u.protocol === "https:" && !!host && !privateHost && !u.username && !u.password && !/\s/.test(url.trim())
  } catch {
    return false
  }
}

/** "SharePoint", "OneDrive" or the site name, for labelling an outside link. */
export function linkSource(url: string) {
  try {
    const h = new URL(url).hostname
    if (/sharepoint\./i.test(h)) return /-my\.sharepoint\./i.test(h) ? "OneDrive" : "SharePoint"
    if (/onedrive\.|1drv\.ms/i.test(h)) return "OneDrive"
    return h.replace(/^www\./, "")
  } catch {
    return "Link"
  }
}
