export type Classification = "Public" | "Internal" | "Confidential" | "Highly confidential"
export const CLASSIFICATIONS: Classification[] = ["Public", "Internal", "Confidential", "Highly confidential"]
export const isLocked = (c: Classification) => c === "Confidential" || c === "Highly confidential"

export type AccessLevel = "None" | "View" | "Add and edit" | "Approve" | "Manage"
export const ACCESS_LEVELS: AccessLevel[] = ["None", "View", "Add and edit", "Approve", "Manage"]

/** Menu areas. The names match the client's menu exactly. */
export type Area =
  | "Overview"
  | "QMS"
  | "Organization & Scope"
  | "Policies"
  | "Processes"
  | "Objectives & KPIs"
  | "Documents"
  | "Risks & Opportunities"
  | "Evidence"
  | "Audits"
  | "Management Review"
  | "Corrective Action"
  | "Settings"

export interface Role {
  id: string
  name: string
  purpose: string
  scope: "All processes" | "Processes they own" | "Processes they are assigned to" | "Not their own process"
  access: Record<Area, AccessLevel>
  system?: boolean
}

export interface Person {
  id: string
  name: string
  title: string
  email: string
  roleId: string
  scope: string
  status: "Active" | "Guest" | "Deactivated"
  lastActive: string
}

export interface Process {
  id: string // "04"
  name: string
  owner: string
  clauses: string
  band: "Management" | "Core" | "Support"
  purpose: string
  inputs: string[]
  activities: string[]
  outputs: string[]
  involved: string
  feeds: string
  /** this process's own review route; empty fields fall back to the company default */
  route?: { reviewers?: string[]; approvers?: string[] }
}

export type DocStage = "Draft" | "Technical review" | "Changes requested" | "Approval" | "Ready to publish" | "Published" | "Archived"
export const DOC_STAGES: DocStage[] = ["Draft", "Technical review", "Approval", "Ready to publish", "Published"]

export interface DocRecord {
  id: string
  title: string
  process: string
  type: string
  rev: string
  stage: DocStage
  owner: string
  nextReview: string
  classification: Classification
  lateBy?: string
  reviewOverdue?: boolean
  description: string
  link: string
  clauses: string[]
  viewers: string[]
  reviewers: string[]
  approvers: string[]
  approvalMode: ApprovalMode
  /** why the current revision was started; printed in the revision history */
  changeNote?: string
  /** who started the current revision; they can't approve it */
  startedBy?: string
}

export type ApprovalMode = "Everyone must approve" | "Any one of them" | "One after another"

export type Severity = "Minor" | "Major"
export const NC_STAGES = ["Raised", "Contained", "Root cause and action", "Action done", "Verification", "Effectiveness", "Closed"] as const

export interface TaskItem {
  id: string
  name: string
  accountable: string
  helpers: string[]
  due: string
  done: boolean
}

export interface Nonconformity {
  id: string
  title: string
  process: string
  clause: string
  source: string
  severity: Severity
  stage: number // index into NC_STAGES
  owner: string
  verifier: string
  due: string
  late?: boolean
  details: string
  containment: string
  rootCause: string
  tasks: TaskItem[]
  raised: string
}

export interface Risk {
  id: string
  title: string
  kind: "Risk" | "Opportunity"
  process: string
  likelihood: number
  impact: number
  treatment: string
  action: string
  owner: string
  review: string
  late?: boolean
  source?: string
}

export interface Objective {
  id: string
  name: string
  process: string
  frequency: "monthly" | "quarterly"
  target: number
  unit: "%" | "score"
  values: number[]
  owner: string
  nextResult: string
  /** evidence items that support the results, such as the monthly KPI pack (ISO 9001 clause 9.1) */
  evidence?: string[]
}

export interface Policy {
  id: string
  title: string
  summary: string
  rev: string
  approvedBy: string
  approvedOn: string
  acknowledged: number
  appliesTo: number
  state: "Current" | "Review due" | "Draft"
  reviewDue?: string
}

export type AuditState = "Planned" | "Checklist ready" | "Held" | "Findings agreed" | "Report issued" | "Report late" | "Follow-up"

export interface Audit {
  id: string
  process: string
  month: number // 0-11
  date: string
  lead: string
  auditors: string[]
  state: AuditState
  kind: "Planned" | "Follow-up" | "Triggered"
  clauses: string[]
}

export type RemarkKind = "Process" | "Document" | "Risk" | "Audit" | "Evidence" | "Nonconformity"

/** A consultant's remark on a record. Clients reply; the consultant or a quality manager resolves it. */
export interface Remark {
  id: string
  kind: RemarkKind
  targetId: string
  /** "OPS-PRO-001 Production planning and control" */
  targetLabel: string
  to: string
  area: Area
  author: string
  text: string
  when: string
  status: "Open" | "Resolved"
  replies: { author: string; text: string; when: string }[]
  resolvedBy?: string
}

export type RequirementStatus = "To do" | "In progress" | "Ready to confirm" | "Done" | "Not applicable"

/** Something the client must have or do before certification, listed by the consultant. */
export interface Requirement {
  id: string
  clause: string
  title: string
  owner: string
  due: string
  status: RequirementStatus
  /** evidence or document that shows it's done */
  evidence?: string
  /** why it doesn't apply, for Not applicable */
  note?: string
  addedBy: string
}

export type AuditorLevel = "Lead auditor" | "Auditor" | "In training"

/** One person on the company's auditor list. Being an auditor is a qualification, not a role. */
export interface Auditor {
  id: string
  /** a person in Users, or an outside auditor's name */
  name: string
  external?: { organisation: string; email: string }
  level: AuditorLevel
  /** training that makes them competent (ISO 9001 clause 7.2) */
  training: string
  trainedOn: string
  /** link to the certificate, kept as evidence */
  certificate?: string
  /** when their competence is checked again */
  recheckBy: string
  /** processes they can't audit, on top of the ones they own or work in */
  extraExclusions: string[]
  status: "Active" | "Paused"
}

export interface ChecklistQuestion {
  id: string
  type: string
  clause?: string
  text: string
  askedBy: string
  required: boolean
  evidence: string[]
  guidance: string
}

export interface ChecklistSection {
  id: string
  clause: string
  title: string
  items: ChecklistQuestion[]
}

export interface EvidenceItem {
  id: string
  /** one piece of evidence can support several clauses */
  clauses: string[]
  title: string
  kind: "File" | "Link" | "Record"
  /** and several processes */
  processes: string[]
  addedBy: string
  added: string
  classification: Classification
}

export interface InterestedParty {
  id: string
  name: string
  needs: string
  howMonitored: string
  reviewDue?: boolean
}

export interface ContextIssue {
  id: string
  kind: "Internal" | "External"
  issue: string
  effect: string
}
