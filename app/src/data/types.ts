import type { RecordKind } from "@/lib/record-links"

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
  /** may open Confidential records without being named on them (plan v3 §9 classification.confidential.read) */
  confidentialRead?: boolean
  /** sees the certification readiness section on the Overview and the Certification readiness page, as the administrator does */
  seesReadiness?: boolean
  /** single actions switched on or off against the level (ADR-045); keys from lib/permissions ACTIONS */
  actions?: Record<string, boolean>
  /** settings pages this role may open; empty means the defaults for its levels */
  settingsPages?: string[]
  /** "none": can't give anyone a role */
  assignUpTo?: "none" | "own"
}

export interface Person {
  id: string
  name: string
  title: string
  email: string
  roleId: string
  scope: string
  status: "Active" | "Guest" | "Deactivated"
  accessEndsOn?: string
  lastActive: string
  /**
   * Profile photo. "microsoft": the photo on their Microsoft 365 account, fetched at sign-in (the default).
   * "upload": a photo they chose, re-encoded by ThryveMS to a small square JPEG (ADR-033). "none": initials.
   */
  photo?: { source: "microsoft" | "upload" | "none"; url?: string }
}

export interface Process {
  /** internal key used in links, never shown; the backend uses a UUID */
  id: string
  name: string
  owner: string
  /** people who work in this process besides the owner. Roles that cover only assigned processes see just these. */
  members?: string[]
  clauses: string
  band: "Management" | "Core" | "Support"
  purpose: string
  inputs: string[]
  activities: string[]
  outputs: string[]
  /** inputs linked to where they come from: another process's form or record, or something from outside the company */
  inputLinks?: InputLink[]
  /** records linked by hand under Inputs, Activities and Outputs (How the process works) */
  ipoLinks?: IpoLink[]
  involved: string
  feeds: string
  /** this process's own review route; empty fields fall back to the company default */
  route?: { reviewers?: string[]; approvers?: string[] }
}

/** An input to a process: one of another process's outputs (a form or record document), or something from outside. */
export interface InputLink { id: string; fromProcess?: string; docId?: string; outside?: string }

/** A record linked under Inputs, Activities or Outputs. A process linked under Outputs receives it; under Inputs it sends it. */
export interface IpoLink { id: string; column: "inputs" | "activities" | "outputs"; kind: "Process" | "Document" | "Risk" | "Objective" | "Outside"; ref?: string; label?: string }


export type DocStage = "Draft" | "Technical review" | "Changes requested" | "Approval" | "Ready to publish" | "Published" | "Archived"
export const DOC_STAGES: DocStage[] = ["Draft", "Technical review", "Approval", "Ready to publish", "Published"]

export interface QmsScopeContent {
  statement: string
  products: string
  sites: string
  exclusions: string
  standard: string
}

export interface DocumentEvent {
  kind: "Revision started" | "Published" | "Effectivity suspended" | "Effectivity resumed" | "Withdrawn" | "Archived" | "Reviewed, no change"
  revision: string
  by: string
  on: string
  reason?: string
}

export type DocumentRevision = Omit<DocRecord, "revisions" | "events"> & { withdrawn?: boolean }

export interface DocRecord {
  id: string
  title: string
  process: string
  type: string
  rev: string
  stage: DocStage
  owner: string
  nextReview: string
  /** months between periodic reviews of the published revision */
  reviewEvery?: number
  classification: Classification
  lateBy?: string
  reviewOverdue?: boolean
  description: string
  /** link to the file in SharePoint or OneDrive; empty when the file was uploaded instead */
  link: string
  /** the file uploaded to ThryveMS storage instead of a link (Public and Internal only, plan v3 D12) */
  file?: StoredFile
  clauses: string[]
  viewers: string[]
  reviewers: string[]
  approvers: string[]
  approvalMode: ApprovalMode
  /** why the current revision was started; printed in the revision history */
  changeNote?: string
  /** who started the current revision; they can't approve it */
  startedBy?: string
  startedOn?: string
  approvedOn?: string
  approvedBy?: string[]
  reviewedBy?: string[]
  publishedOn?: string
  publishedBy?: string
  effectivity?: "Effective" | "Suspended" | "Superseded" | "Archived"
  scopeContent?: QmsScopeContent
  /** Prior versions are snapshots, never generated from the revision number. */
  revisions?: DocumentRevision[]
  events?: DocumentEvent[]
  withdrawn?: boolean
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
  /** risks and opportunities this nonconformity affects (ISO 9001 clause 10.2.1 e) */
  risks?: string[]
  /** recorded when the register was checked and nothing needed to change */
  riskCheck?: { note: string; by: string; when: string }
  /** ISO dates (YYYY-MM-DD) beside the display strings, so records can be counted for a period */
  raisedDate?: string
  dueDate?: string
  closedDate?: string
  /** ISO date the verifier confirmed the action; effectiveness is checked after the QMS rules' wait */
  verifiedDate?: string
  /** raised by the outside consultant; listed in Certification readiness */
  fromConsultant?: boolean
}

/** An improvement idea or project (ISO 9001 clause 10.1 and 10.3). Not tied to a nonconformity. */
export type ImprovementState = "Proposed" | "Planned" | "In progress" | "Done" | "Not going ahead"
export const IMPROVEMENT_STATES: ImprovementState[] = ["Proposed", "Planned", "In progress", "Done", "Not going ahead"]
export interface Improvement {
  id: string
  title: string
  details: string
  process: string
  owner: string
  /** where the idea came from: a suggestion, an audit observation, a review decision, an opportunity… */
  source: string
  state: ImprovementState
  /** ISO dates */
  raisedDate: string
  due?: string
  doneDate?: string
  raisedBy: string
  /** what it should achieve, and what it did */
  benefit?: string
  outcome?: string
  /** why it was dropped, for Not going ahead */
  reason?: string
}

/** A customer complaint (ISO 9001 clauses 8.2.1 and 9.1.2), with the response and any nonconformity it raised. */
export type ComplaintState = "New" | "Investigating" | "Responded" | "Closed"
export const COMPLAINT_STATES: ComplaintState[] = ["New", "Investigating", "Responded", "Closed"]
export interface Complaint {
  id: string
  title: string
  customer: string
  /** order, delivery or part reference */
  reference?: string
  details: string
  process: string
  owner: string
  state: ComplaintState
  /** ISO dates */
  received: string
  respondBy: string
  respondedDate?: string
  closedDate?: string
  loggedBy: string
  /** what we told the customer */
  response?: string
  /** whether the customer accepted it */
  satisfied?: "Yes" | "Partly" | "No"
  /** the nonconformity raised from it */
  ncId?: string
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
  /** ISO dates: when it was last reviewed and when the next review is due */
  reviewedDate?: string
  nextReviewDate?: string
  /** raised by the outside consultant; listed in Certification readiness */
  fromConsultant?: boolean
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
  /** results by period (plan v3 §17). A period with no result is "No data", never zero. `values` keeps the last six for the charts. */
  results?: ObjectiveResult[]
  /** management review inputs this objective feeds, such as "c1" or "c7" (clause 9.3.2) */
  reviewInputs?: string[]
}

/** One result for one period: "2026-07" for a month, "2026-Q3" for a quarter. */
export interface ObjectiveResult {
  period: string
  value: number
  /** ISO date the result was entered */
  enteredOn: string
  enteredBy?: string
  /** evidence for this result only, such as that month's KPI pack */
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
  copiedFrom?: { auditId: string; by: string; at: string }
  auditee?: string
  templateSnapshot?: { id: string; version: number; sections: ChecklistSection[] }
  usesQuestionnaire?: boolean
  reportDueDate?: string
  plannedDate?: string
  id: string
  process: string
  month: number // 0-11
  date: string
  lead: string
  auditors: string[]
  state: AuditState
  kind: "Planned" | "Follow-up" | "Triggered"
  clauses: string[]
  /** ISO dates: when it was held and when the report was issued */
  heldDate?: string
  reportDate?: string
  timezone?: string
  planningReason?: string
  scheduleHistory?: { from: string; to: string; reason: string; by: string; at: string }[]
}

export type RemarkKind = "Process" | "Document" | "Risk" | "Audit" | "Evidence" | "Nonconformity" | "Management review"

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
  respondBy?: "Auditee" | "Auditor" | "Both"
  respondent?: string
  auditeeRequired?: boolean
  assessmentRequired?: boolean
  evidenceRule?: "Not required" | "Optional" | "Required" | "When No"
  evidenceEnabled?: boolean
  choices?: string[]
  naJustification?: boolean
  showWhen?: { questionId: string; equals: string }
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
  /** one evidence item can be a single file or a pack: several files and links kept together */
  files?: EvidenceFile[]
  /** records this evidence is reused on, by id: documents, nonconformities and so on */
  usedIn?: string[]
  /** ISO date it was added */
  addedDate?: string
}

export interface EvidenceFile {
  name: string
  kind: "File" | "Link"
  /** SharePoint or other link; files uploaded here get one from storage */
  url?: string
  size?: string
  /** uploaded to ThryveMS storage rather than linked (Public and Internal evidence only, plan v3 D12) */
  stored?: StoredFile
  /** folder inside the evidence pack, such as "Calibration/2026/Q3". Empty for the top level. */
  folder?: string
}

/** A file kept in ThryveMS storage. Public and Internal records only; Confidential ones stay as links. */
export interface StoredFile {
  /** storage object id, given by the server; never a public address */
  key: string
  name: string
  /** bytes */
  size: number
  /** media type as given by the browser, such as application/pdf */
  type: string
  uploadedBy: string
  /** ISO date */
  uploadedOn: string
}

export interface InterestedParty {
  id: string
  name: string
  needs: string
  howMonitored: string
  reviewDue?: boolean
  /** ISO date it was last changed. There's no change history yet, so this is all review input b can use. */
  changedDate?: string
}

export interface ContextIssue {
  id: string
  kind: "Internal" | "External"
  issue: string
  effect: string
  /** ISO date it was last changed */
  changedDate?: string
}

/** What a notification is about. Matches the rows in Settings › Notifications. */
export type NotificationKind = "Waiting on you" | "Overdue" | "Remark" | "Comment" | "Shared" | "Audit" | "Policy" | "Assigned"

/**
 * Someone who can't open a record asked for access. A request for one record goes to its owner;
 * a request for a whole process goes to the process owner, who ticks which shared documents to open.
 * Only Public and Internal records can be requested: Confidential ones answer "not found".
 */
export interface AccessRequest {
  id: string
  /** person asking, by name */
  person: string
  /** "Record": one document or evidence item. "Process": the shared documents of a process. */
  scope: "Record" | "Process"
  kind: "Document" | "Evidence"
  /** the record asked for; for a process request, the record the person was trying to open */
  targetId: string
  process: string
  /** who decides: the record owner, or the process owner */
  decider: string
  note?: string
  status: "Waiting" | "Granted" | "Declined"
  /** ISO date */
  requestedOn: string
  decidedOn?: string
  /** records opened to the person by this decision */
  granted?: string[]
  reason?: string
}

/** One record opened to one person outside their role's process scope. */
export interface AccessGrant {
  id: string
  person: string
  kind: "Document" | "Evidence"
  targetId: string
  grantedBy: string
  /** ISO date */
  grantedOn: string
  requestId?: string
}

export interface AppNotification {
  eventKey?: string
  id: string
  /** person name it is for */
  to: string
  kind: NotificationKind
  title: string
  body?: string
  /** link to the record */
  href: string
  /** who caused it, if a person */
  from?: string
  when: string
  /** sort key, newest first; minutes before now in the sample data */
  age: number
  read: boolean
}

/* Management review (ISO 9001 clause 9.3) */

/** A review doesn't need a meeting: top management can review a pack, or cover the inputs over several regular meetings. */
export type ReviewFormat = "Meeting" | "No meeting" | "Several meetings"
/** ISO 9001 reviews cover clause 9.3 with its 11 inputs; internal reviews cover only what top management chose. Missing means ISO 9001 (older records). */
export type ReviewKind = "ISO 9001" | "Internal"
/** What a topic added by hand points at. */
export type ReviewItemType = "Process" | "Document" | "Evidence" | "Link" | "Objective or KPI" | "Risk" | "Nonconformity" | "Audit" | "Own topic"
export const REVIEW_ITEM_TYPES: ReviewItemType[] = ["Process", "Document", "Evidence", "Link", "Objective or KPI", "Risk", "Nonconformity", "Audit", "Own topic"]
/** A topic top management added to the review, rather than a clause 9.3.2 input. */
export interface ReviewItem {
  type: ReviewItemType
  /** the ThryveMS record, for every type except Link and Own topic */
  recordId?: string
  /** https link, for Link */
  url?: string
  /** why top management wants to look at it */
  why?: string
  addedBy: string
  /** ISO date */
  addedOn: string
}
export type ReviewStage = "Planned" | "Preparing" | "Reviewed" | "Closed"
export const REVIEW_STAGES: ReviewStage[] = ["Planned", "Preparing", "Reviewed", "Closed"]
export type Verdict = "Yes" | "Partly" | "No"

/** Whether a figure could be worked out (plan v3 §22). Zero records is only "zero" when the query ran and found none. */
export type FigureStatus = "valid" | "zero" | "not-collected" | "no-source"

/** A record a figure was worked out from, as it was when the figure was frozen. */
export interface FigureSource {
  kind: RecordKind
  id: string
  /** its revision, stage or last change when frozen, so later changes can be told apart */
  version?: string
  title?: string
  status?: string
  /** ISO date that placed it in the period */
  date?: string
  /** review status of the supporting record when the review was locked */
  check?: RecordCheckStatus
}

/** A figure as it was sent in the pack or frozen at Finish and lock. */
export interface FrozenFigure {
  value: string
  detail: string
  status: FigureStatus
  period?: { start: string; end: string }
  method?: string
  sources: FigureSource[]
  /** ISO date and time it was worked out */
  computedAt?: string
  /** the live figure at Finish and lock, kept only when it differs from the figure top management reviewed */
  liveAtLock?: { value: string; detail: string }
}

/** Analysis for top management: four short fields instead of one note. */
export interface ReviewAnalysis {
  summary: string
  observations: string
  attention: string
  recommendations: string
}

export interface ReviewInput {
  /** a, b, c1 … e, following clause 9.3.2 */
  ref: string
  name: string
  /** where the figures come from */
  source: string
  /** before analysis fields existed. Loaded into analysis.summary. */
  note?: string
  noteBy?: string
  analysis?: ReviewAnalysis
  /** who wrote the analysis */
  preparedBy?: string
  /** ISO date and time the analysis was last saved */
  updatedAt?: string
  /** the quality manager who confirmed a consultant's draft */
  confirmedBy?: string
  /** written by the consultant; the quality manager confirms it */
  draft?: boolean
  /** handed to someone else to prepare */
  handedTo?: string
  /** "Several meetings": the meeting and date this input was covered in */
  coveredIn?: string
  /** not relevant this time, with the reason */
  notApplicable?: string
  /** figures as they were when the review was recorded */
  frozen?: FrozenFigure
  /** set on topics added by hand; clause inputs don't have it */
  item?: ReviewItem
  /** ISO date and time the analysis or applicability changed after the pack was sent */
  changedAfterPack?: string
}

export interface ReviewComment {
  ref: string
  author: string
  when: string
  text: string
}

export interface ManagementReviewRecord {
  id: string
  title: string
  /** missing on older records, which are all ISO 9001 reviews */
  kind?: ReviewKind
  /** what top management wants to find out or decide */
  question?: string
  /** what prompted it, when someone said */
  prompt?: string
  /** who asked for the review */
  requestedBy?: string
  /** what the preparer was asked to prepare */
  prepareNote?: string
  format: ReviewFormat
  stage: ReviewStage
  /** meeting date, or the date top management should have reviewed by */
  date: string
  place?: string
  /** top management who review and sign off */
  reviewers: string[]
  /** others who get the pack or attend */
  others: string[]
  preparedBy: string
  inputs: ReviewInput[]
  packSentOn?: string
  /** per person: read, commented, signed off, present, apologies */
  status: Record<string, "Not opened" | "Read" | "Commented" | "Signed off" | "Present" | "Apologies">
  comments: ReviewComment[]
  conclusion?: { suitable: Verdict; adequate: Verdict; effective: Verdict; aligned: Verdict; reasons: Partial<Record<"suitable" | "adequate" | "effective" | "aligned", string>>; summary: string }
  signOff?: ReviewSignOff
  notesFile?: string
  recordedOn?: string
  /** evidence item the locked record was saved as */
  evidenceId?: string
  /** the reporting period the figures cover, ISO dates. Chosen when planning. */
  period?: { start: string; end: string }
  /** people who help prepare inputs, such as department heads */
  contributors?: string[]
  /** figures as they were when the pack was sent */
  packSnapshot?: { sentAt: string; figures: Record<string, FrozenFigure> }
  /** decisions proposed from an input or an evaluation, decided on the Finish and lock page */
  proposedDecisions?: ProposedDecision[]
  /** append-only: every sign-off, in order. signOff is the first one. */
  signOffs?: ReviewSignOff[]
  /** append-only: changes after Finish and lock, each with a reason */
  amendments?: ReviewAmendment[]
  /** top management asking for the locked record to be corrected before they sign */
  changeRequests?: ReviewChangeRequest[]
  /** ISO date and time the conclusion last changed by amendment; earlier sign-offs no longer count */
  conclusionChangedAt?: string
  /** Record the review, saved as it is filled in */
  recordDraft?: ReviewRecordDraft
  /** ISO date and time it was finished and locked */
  lockedAt?: string
}

export interface ReviewSignOff {
  how: "In iQMS" | "Signed scan"
  by: string
  when: string
  /** ISO date and time; missing on older records */
  at?: string
  file?: string
}

export interface ReviewAmendment {
  by: string
  at: string
  reason: string
  change: string
  /** the change request this answers */
  requestId?: string
  /** an action changed by this amendment, before and after */
  action?: { id: string; before: { text: string; owner: string; due: string }; after: { text: string; owner: string; due: string } }
  /** the conclusion summary, before and after */
  summary?: { before: string; after: string }
}

export interface ReviewChangeRequest {
  id: string
  by: string
  at: string
  reason: string
  /** the amendment that answered it */
  resolvedAt?: string
  resolvedBy?: string
}

export interface ReviewRecordDraft {
  format: ReviewFormat
  took: Record<string, boolean>
  covered: Record<string, string>
  verdict: Partial<Record<"suitable" | "adequate" | "effective" | "aligned", Verdict>>
  reasons: Partial<Record<"suitable" | "adequate" | "effective" | "aligned", string>>
  summary: string
  decisions: { key: string; text: string; type: ReviewActionType; owner: string; due: string; linked: string; openCa: boolean; inputRef: string; sourceRecords: { kind: RecordKind; id: string }[]; evaluationId?: string }[]
  signHow: "In iQMS" | "Signed scan"
  scan: string
  scanSigners: string[]
  notesFile: string
  savedAt: string
  savedBy: string
}

export interface ProposedDecision {
  id: string
  text: string
  type: ReviewActionType
  /** the input it came from */
  inputRef?: string
  sourceRecords?: { kind: RecordKind; id: string }[]
  evaluationId?: string
  proposedBy: string
  at: string
}

export type RecordCheckStatus = "Not reviewed" | "Reviewed" | "Needs clarification" | "Insufficient evidence"
export const RECORD_CHECK_STATUSES: RecordCheckStatus[] = ["Not reviewed", "Reviewed", "Needs clarification", "Insufficient evidence"]

/**
 * Someone's check of one supporting record for one input. Records found automatically are worked
 * out live, so a row is only stored once someone acts on one, or for a reference added by hand.
 * These are review workflow controls, not ISO conformity decisions.
 */
export interface ReviewRecordCheck {
  id: string
  reviewId: string
  ref: string
  kind: RecordKind | "link"
  /** for a record in ThryveMS */
  recordId?: string
  /** for a SharePoint, OneDrive or other https:// reference */
  url?: string
  title: string
  /** "auto" for a record found by ThryveMS, otherwise the person who added the reference */
  addedBy: string
  status: RecordCheckStatus
  by?: string
  /** ISO date and time */
  at?: string
  notes?: string
  /** evidence item that supports the check, such as EV-0208 */
  evidenceRef?: string
}

export type EvaluationStatus = "Satisfactory" | "Needs improvement" | "Requires management action"
export const EVALUATION_STATUSES: EvaluationStatus[] = ["Satisfactory", "Needs improvement", "Requires management action"]

/** Top management's evaluation of one input, or of the whole review (ref "overall"). The statuses are workflow aids, not ISO 9001 terms. */
export interface ReviewEvaluation {
  id: string
  reviewId: string
  ref: string
  by: string
  status?: EvaluationStatus
  comment: string
  /** a question for the preparer, and their answer */
  clarification?: { question: string; answer?: string; answeredBy?: string; answeredAt?: string }
  /** ISO date and time */
  at: string
}

export type ReviewActionType = "Improvement" | "Change to the QMS" | "Resource need"

/** A decision top management recorded on an item in Needs you. The key names the item and its version. */
export interface TopDecision {
  id: string
  key: string
  choice: "Approve" | "Approve with a condition" | "Need more information" | "Send back"
  words: string
  by: string
  on: string
}

export interface ReviewAction {
  id: string
  reviewId: string
  text: string
  type: ReviewActionType
  owner: string
  due: string
  /** record it led to: NC-…, R-…, a document id */
  linked?: string
  state: "Open" | "Done"
  late?: boolean
  doneOn?: string
  /** ISO dates beside the display strings */
  dueDate?: string
  doneDate?: string
  /** the input it came from, such as "c7" */
  inputRef?: string
  /** supporting records the decision was based on */
  sourceRecords?: { kind: RecordKind; id: string }[]
  evaluationId?: string
  /** evidence items that show it was done */
  completionEvidence?: string[]
  /** due-soon and overdue reminders already sent, one per event */
  reminded?: ("soon" | "overdue")[]
  /** why it was marked done without completion evidence */
  doneNote?: string
}

/* Support reports: from people (Contact support) and from the error monitor */

export type SupportCategory = "Something isn’t working" | "Data looks wrong" | "Access or sign-in" | "Question" | "Idea"
export type SupportImpact = "I can’t work" | "It slows me down" | "Minor"
/**
 * New → Investigating → Fix in sandbox → Waiting for approval → Deployed → Closed.
 * The AI agent can only go as far as "Waiting for approval"; a person approves the deploy.
 */
export type SupportState = "New" | "Investigating" | "Fix in sandbox" | "Waiting for approval" | "Deployed" | "Closed"

/** A screenshot on a support report, re-encoded as JPEG in the browser (lib/screenshots.ts). */
export interface SupportScreenshot {
  name: string
  width: number
  height: number
  bytes: number
  /** data URL in the preview; a storage key in production */
  data: string
}

export interface SupportReport {
  id: string
  source: "Person" | "Error monitor"
  org: string
  from?: string
  email?: string
  category: SupportCategory
  impact: SupportImpact
  title: string
  details: string
  page?: string
  attachments: string[]
  /** screenshots the reporter added (ADR-038); required for problem reports */
  screenshots?: SupportScreenshot[]
  /** the reference shown on the error screen, when the report started there */
  errorRef?: string
  /** a person on the support team checked the screenshots before AI support may read them */
  screenshotsCleared?: { by: string; at: string }
  /** the AI support assistant's suggested reply; a person sends it */
  aiReply?: { text: string; model: string; tokens: number; peso: number }
  /** only when the person agreed to include technical details */
  diagnostics?: { app: string; browser: string; time: string; role: string; errors: string[] }
  state: SupportState
  created: string
  updates: { when: string; who: string; text: string }[]
  /** what the AI agent found and tested; it never deploys on its own */
  agent?: { finding: string; fix?: string; branch?: string; tests?: string; sandbox?: string }
}

/** A company’s acceptance of a legal document version (Terms, DPA). */
export interface AgreementAcceptance {
  id: string
  code: string
  version: string
  acceptedBy: string
  role: string
  /** name typed as signature */
  signedName: string
  at: string
}
