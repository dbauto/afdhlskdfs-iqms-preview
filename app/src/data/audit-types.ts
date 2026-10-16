import type { ChecklistSection } from "./types"
export interface AuditFormRoute {
  mode: "None" | "All" | "Any" | "Sequential"
  approverIds: string[]
}
export interface AuditFormMember {
  personId: string
  access: "View" | "Edit"
}
export interface AuditFormApproval {
  id: string
  phase: "Preparation" | "Completion"
  route: AuditFormRoute
  status: "Pending" | "Approved" | "Changes requested" | "Cancelled"
  reason?: string
  requestedBy: string
  requestedAt: string
  snapshot: string
  decisions: { personId: string; decision: "Approved" | "Changes requested"; comment: string; at: string }[]
}
export interface AuditChecklist {
  id: string
  auditId: string
  version: number
  status: "Draft" | "Released" | "Revised"
  sections: ChecklistSection[]
  usesQuestionnaire: boolean
  releasedAt?: string
  releasedBy?: string
  revisionReason?: string
  basedOn?: string
  /** Stable form identity; id identifies this exact version. Optional for legacy data. */
  formId?: string
  title?: string
  kind?: "Checklist" | "Questionnaire"
  ownerId?: string
  members?: AuditFormMember[]
  preparationRoute?: AuditFormRoute
  completionRoute?: AuditFormRoute
  approvals?: AuditFormApproval[]
  preparedBy?: string
  completedAt?: string
  completedBy?: string
  withdrawnAt?: string
  withdrawalReason?: string
  copiedFrom?: { auditId: string; formId: string; version: number }
}
export interface AuditReference {
  kind: "document" | "evidence" | "link" | "response"
  id?: string
  url?: string
  title: string
  addedBy: string
  addedAt: string
  responseRevision?: number
}
export interface QuestionnaireAssignment {
  id: string
  auditId: string
  checklistId: string
  version: number
  respondent: string
  questionIds: string[]
  dueDate: string
  status: "Not started" | "In progress" | "Submitted" | "Clarification requested" | "Resubmitted"
  assignedBy: string
  assignedAt: string
  submittedAt?: string
  reminded?: string[]
  respondentId?: string
  invitationId?: string
  recordedBy?: string
}
/** Preview invitations are not bearer credentials and never claim email verification. */
export interface QuestionnaireInvitation {
  id: string
  auditId: string
  assignmentId: string
  name: string
  email: string
  department: string
  status: "Active" | "Revoked"
  expiresOn: string
  createdBy: string
  createdAt: string
  identity: "Unverified preview" | "Interview recorded by auditor"
  revokedAt?: string
}
export interface AuditeeResponse {
  id: string
  auditId: string
  assignmentId: string
  checklistId: string
  version: number
  questionId: string
  respondent: string
  value: string
  explanation: string
  naReason: string
  evidence: AuditReference[]
  status: "Draft" | "Submitted"
  updatedAt: string
  history: {
    value: string
    selectedValues?: string[]
    explanation: string
    naReason: string
    evidence: AuditReference[]
    by: string
    at: string
  }[]
  selectedValues?: string[]
  submissionRevision?: number
  submittedAt?: string
  recordedBy?: string
  identity?: "Workspace account" | "Unverified preview" | "Interview recorded by auditor"
  submissions?: {
    revision: number
    value: string
    selectedValues?: string[]
    explanation: string
    naReason: string
    evidence: AuditReference[]
    submittedAt: string
    recordedBy?: string
  }[]
}
export type AssessmentResult = "Conforms" | "Observation" | "Minor NC" | "Major NC" | "Not applicable"
export interface AuditorAssessment {
  id: string
  auditId: string
  checklistId: string
  version: number
  questionId: string
  auditor: string
  result: AssessmentResult | ""
  answer?: string
  selectedValues?: string[]
  objectiveEvidence: string
  sampling: string
  interviewee: string
  notes: string
  evidence: AuditReference[]
  status: "Draft" | "Completed"
  at: string
  supersedes?: string
}
export interface EvidenceVerification {
  id: string
  auditId: string
  checklistId: string
  version: number
  questionId: string
  reference: AuditReference
  unavailable?: boolean
  status: "Pending review" | "Verified" | "Insufficient" | "Not applicable"
  by: string
  at: string
  notes: string
}
export interface ClarificationRequest {
  id: string
  auditId: string
  checklistId: string
  version: number
  questionId: string
  assignmentId: string
  from: string
  to: string
  kind: "Clarification" | "More evidence"
  text: string
  reply?: string
  replyHistory?: { reply: string; by: string; at: string }[]
  status: "Open" | "Answered" | "Resolved"
  at: string
  repliedAt?: string
  resolvedAt?: string
}
export interface AuditFinding {
  id: string
  auditId: string
  checklistId: string
  version: number
  questionId: string
  assessmentId: string
  title: string
  classification: "Observation" | "Opportunity" | "Minor NC" | "Major NC"
  requirement: string
  clause: string
  process: string
  facts: string
  evidence: AuditReference[]
  owner: string
  auditor: string
  status: "Draft" | "Agreed" | "Final"
  ncId?: string
  at: string
  consolidatedWith?: string
  consolidationReason?: string
}
export interface AuditReport {
  id: string
  auditId: string
  version: number
  status: "Draft" | "Issued"
  objectives: string
  scope: string
  criteria: string
  auditors: string[]
  auditees: string[]
  dates: string
  processes: string[]
  evidenceSummary: string
  conclusion: string
  followUp: string
  summary: string
  issuedBy?: string
  issuedAt?: string
  amendmentReason?: string
  basedOn?: string
  snapshot?: {
    checklist: AuditChecklist
    checklists?: AuditChecklist[]
    assignments: QuestionnaireAssignment[]
    responses: AuditeeResponse[]
    assessments: AuditorAssessment[]
    findings: AuditFinding[]
    verifications: EvidenceVerification[]
  }
}
