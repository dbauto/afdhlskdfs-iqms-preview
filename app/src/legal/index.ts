/**
 * Customer-facing legal documents. The markdown files are the single source; the app shows them
 * at /legal/<code> and in Settings › Legal and agreements. When the backend exists, each published
 * version is recorded in the platform database and acceptances in the client database
 * (backend specification v3 §6.5).
 */
import terms from "./terms.md?raw"
import privacy from "./privacy.md?raw"
import dpa from "./dpa.md?raw"
import subprocessors from "./subprocessors.md?raw"
import security from "./security.md?raw"
import acceptableUse from "./acceptable-use.md?raw"
import cookies from "./cookies.md?raw"
import serviceLevels from "./service-levels.md?raw"
import aiAddendum from "./ai-addendum.md?raw"

export interface LegalDoc {
  code: string
  title: string
  version: string
  effective: string
  /** one line for lists */
  summary: string
  /** an Owner or Administrator accepts it for the company */
  acceptance: "company" | "none"
  body: string
}

/** Drafts until reviewed by Philippine counsel and the DPO; the app labels them as drafts. */
export const LEGAL_STATUS: "draft" | "published" = "draft"
const V = "1.0"
const EFFECTIVE = "On acceptance"

export const LEGAL_DOCS: LegalDoc[] = [
  { code: "terms", title: "Terms of Service", version: V, effective: EFFECTIVE, summary: "The agreement between your company and iQMS: the service, fees, liability and ending.", acceptance: "company", body: terms },
  { code: "dpa", title: "Data Processing Agreement", version: V, effective: EFFECTIVE, summary: "How iQMS processes personal data for your company under the Data Privacy Act of 2012.", acceptance: "company", body: dpa },
  { code: "privacy", title: "Privacy Notice", version: V, effective: "14 October 2026", summary: "What personal data is collected, why, where it’s kept and your rights.", acceptance: "none", body: privacy },
  { code: "security", title: "Security Overview", version: V, effective: "14 October 2026", summary: "How your records are kept separate, protected and recoverable.", acceptance: "none", body: security },
  { code: "subprocessors", title: "Subprocessors", version: V, effective: "14 October 2026", summary: "The companies that host and run iQMS, what they do and where.", acceptance: "none", body: subprocessors },
  { code: "service-levels", title: "Service Levels and Support", version: V, effective: EFFECTIVE, summary: "Availability, recovery targets, support hours and support access.", acceptance: "none", body: serviceLevels },
  { code: "acceptable-use", title: "Acceptable Use Policy", version: V, effective: EFFECTIVE, summary: "What everyone using iQMS may and may not do.", acceptance: "none", body: acceptableUse },
  { code: "cookies", title: "Cookie Notice", version: V, effective: "14 October 2026", summary: "The few cookies iQMS needs, and nothing for tracking.", acceptance: "none", body: cookies },
  { code: "ai", title: "AI Features Addendum", version: V, effective: EFFECTIVE, summary: "Rules for optional AI features. All are off unless your company turns them on.", acceptance: "none", body: aiAddendum },
]

export const legalDoc = (code: string) => LEGAL_DOCS.find((d) => d.code === code)
