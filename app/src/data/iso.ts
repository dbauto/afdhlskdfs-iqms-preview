/**
 * ISO 9001:2026 requirement clauses (4 to 10), in standard order.
 * Clauses 1 to 3 are informative and are not offered for selection.
 *
 * Changes from 2015 that affect numbering: 6.1 is split into 6.1.1 to 6.1.3 (risks and
 * opportunities now have separate action clauses), and 2015's 10.3 Continual improvement is
 * folded into 10.1, so 10.2 is the last clause. Clause titles follow the published edition as
 * reported in transition guides; check them against the purchased standard before go-live.
 */
export const ISO_EDITION = "ISO 9001:2026"

export interface IsoClause {
  no: string
  title: string
}

export const ISO_CLAUSES: IsoClause[] = [
  { no: "4", title: "Context of the organization" },
  { no: "4.1", title: "Understanding the organization and its context" },
  { no: "4.2", title: "Needs and expectations of interested parties" },
  { no: "4.3", title: "Scope of the quality management system" },
  { no: "4.4", title: "Quality management system and its processes" },

  { no: "5", title: "Leadership" },
  { no: "5.1", title: "Leadership and commitment" },
  { no: "5.1.1", title: "General" },
  { no: "5.1.2", title: "Customer focus" },
  { no: "5.2", title: "Policy" },
  { no: "5.2.1", title: "Establishing the quality policy" },
  { no: "5.2.2", title: "Communicating the quality policy" },
  { no: "5.3", title: "Roles, responsibilities and authorities" },

  { no: "6", title: "Planning" },
  { no: "6.1", title: "Actions to address risks and opportunities" },
  { no: "6.1.1", title: "Determining risks and opportunities" },
  { no: "6.1.2", title: "Actions to address risks" },
  { no: "6.1.3", title: "Actions to address opportunities" },
  { no: "6.2", title: "Quality objectives and planning to achieve them" },
  { no: "6.3", title: "Planning of changes" },

  { no: "7", title: "Support" },
  { no: "7.1", title: "Resources" },
  { no: "7.1.1", title: "General" },
  { no: "7.1.2", title: "People" },
  { no: "7.1.3", title: "Infrastructure" },
  { no: "7.1.4", title: "Environment for the operation of processes" },
  { no: "7.1.5", title: "Monitoring and measuring resources" },
  { no: "7.1.6", title: "Organizational knowledge" },
  { no: "7.2", title: "Competence" },
  { no: "7.3", title: "Awareness" },
  { no: "7.4", title: "Communication" },
  { no: "7.5", title: "Documented information" },
  { no: "7.5.1", title: "General" },
  { no: "7.5.2", title: "Creating and updating" },
  { no: "7.5.3", title: "Control of documented information" },

  { no: "8", title: "Operation" },
  { no: "8.1", title: "Operational planning and control" },
  { no: "8.2", title: "Requirements for products and services" },
  { no: "8.2.1", title: "Customer communication" },
  { no: "8.2.2", title: "Determining the requirements" },
  { no: "8.2.3", title: "Review of the requirements" },
  { no: "8.2.4", title: "Changes to requirements" },
  { no: "8.3", title: "Design and development" },
  { no: "8.3.1", title: "General" },
  { no: "8.3.2", title: "Design and development planning" },
  { no: "8.3.3", title: "Design and development inputs" },
  { no: "8.3.4", title: "Design and development controls" },
  { no: "8.3.5", title: "Design and development outputs" },
  { no: "8.3.6", title: "Design and development changes" },
  { no: "8.4", title: "Control of externally provided processes, products and services" },
  { no: "8.4.1", title: "General" },
  { no: "8.4.2", title: "Type and extent of control" },
  { no: "8.4.3", title: "Information for external providers" },
  { no: "8.5", title: "Production and service provision" },
  { no: "8.5.1", title: "Control of production and service provision" },
  { no: "8.5.2", title: "Identification and traceability" },
  { no: "8.5.3", title: "Property belonging to customers or external providers" },
  { no: "8.5.4", title: "Preservation" },
  { no: "8.5.5", title: "Post-delivery activities" },
  { no: "8.5.6", title: "Control of changes" },
  { no: "8.6", title: "Release of products and services" },
  { no: "8.7", title: "Control of nonconforming outputs" },

  { no: "9", title: "Performance evaluation" },
  { no: "9.1", title: "Monitoring, measurement, analysis and evaluation" },
  { no: "9.1.1", title: "General" },
  { no: "9.1.2", title: "Customer satisfaction" },
  { no: "9.1.3", title: "Analysis and evaluation" },
  { no: "9.2", title: "Internal audit" },
  { no: "9.2.1", title: "General" },
  { no: "9.2.2", title: "Internal audit programme" },
  { no: "9.3", title: "Management review" },
  { no: "9.3.1", title: "General" },
  { no: "9.3.2", title: "Management review inputs" },
  { no: "9.3.3", title: "Management review results" },

  { no: "10", title: "Improvement" },
  { no: "10.1", title: "Continual improvement" },
  { no: "10.2", title: "Nonconformity and corrective action" },
  { no: "10.2.1", title: "Actions when a nonconformity occurs" },
  { no: "10.2.2", title: "Documented information on nonconformities" },
]

const ORDER = new Map(ISO_CLAUSES.map((c, i) => [c.no, i]))
const depth = (no: string) => no.split(".").length
const parent = (no: string) => no.split(".").slice(0, -1).join(".")

export const clauseTitle = (no: string) => ISO_CLAUSES.find((c) => c.no === no)?.title

/** "4.1–4.4, 5, 6.2" -> ["4.1", "4.2", "4.3", "4.4", "5", "6.2"] */
/** 2015 numbers that moved in 2026, so documents brought in from an older system still map. */
const FROM_2015: Record<string, string> = { "10.3": "10.1" }

export function parseClauses(text: string): string[] {
  const out: string[] = []
  for (const part of text.split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
    const [a, b] = part.split(/\s*[–-]\s*/).map((x) => FROM_2015[x] ?? x)
    if (b && ORDER.has(a) && ORDER.has(b)) {
      const from = ORDER.get(a)!
      const to = ORDER.get(b)!
      for (const c of ISO_CLAUSES.slice(from, to + 1)) if (depth(c.no) === depth(a) && parent(c.no) === parent(a)) out.push(c.no)
    } else if (ORDER.has(a)) out.push(a)
  }
  return [...new Set(out)]
}

/** ["4.1", "4.2", "4.3", "4.4", "5", "6.2"] -> "4.1–4.4, 5, 6.2" (three or more siblings in a row become a range) */
export function formatClauses(list: string[]): string {
  const sorted = [...new Set(list)].filter((c) => ORDER.has(c)).sort((a, b) => ORDER.get(a)! - ORDER.get(b)!)
  const siblings = (c: string) => ISO_CLAUSES.filter((x) => depth(x.no) === depth(c) && parent(x.no) === parent(c)).map((x) => x.no)
  const parts: string[] = []
  let i = 0
  while (i < sorted.length) {
    const sib = siblings(sorted[i])
    let j = i
    while (j + 1 < sorted.length && sib.indexOf(sorted[j + 1]) === sib.indexOf(sorted[j]) + 1 && sib.indexOf(sorted[j]) !== -1) j++
    if (j - i >= 2) parts.push(`${sorted[i]}–${sorted[j]}`)
    else for (let k = i; k <= j; k++) parts.push(sorted[k])
    i = j + 1
  }
  return parts.join(", ")
}
