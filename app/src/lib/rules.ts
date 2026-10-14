/**
 * Company QMS rules (Settings › QMS rules). Pages read RULES directly; the store
 * keeps it up to date and re-renders the app when a rule changes.
 */
export interface QmsRules {
  /** risk score (likelihood × impact) at which a risk counts as medium, and as high */
  riskMedium: number
  riskHigh: number
  /** months between reviews, by rating */
  reviewHigh: number
  reviewMedium: number
  reviewLow: number
  /** corrective action: days to contain and to complete the action, by severity */
  majorContain: number
  majorAction: number
  minorContain: number
  minorAction: number
  /** days after the action is done before effectiveness is checked */
  effectiveAfter: number
  /** each process audited at least every N months; report due N days after the audit */
  auditEvery: number
  reportDays: number
  /** how often KPI results are entered */
  kpiPeriod: "Monthly" | "Quarterly"
}

export const DEFAULT_RULES: QmsRules = {
  riskMedium: 8,
  riskHigh: 15,
  reviewHigh: 3,
  reviewMedium: 6,
  reviewLow: 12,
  majorContain: 1,
  majorAction: 30,
  minorContain: 7,
  minorAction: 60,
  effectiveAfter: 90,
  auditEvery: 12,
  reportDays: 10,
  kpiPeriod: "Monthly",
}

export const RULES: QmsRules = { ...DEFAULT_RULES }
