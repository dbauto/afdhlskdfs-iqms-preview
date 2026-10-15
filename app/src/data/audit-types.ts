import type { ChecklistSection } from './types'
export interface AuditChecklist {
  id: string; auditId: string; version: number; status: 'Draft' | 'Released' | 'Revised'; sections: ChecklistSection[]
  usesQuestionnaire: boolean; releasedAt?: string; releasedBy?: string; revisionReason?: string; basedOn?: string
}
export interface AuditReference { kind: 'document' | 'evidence' | 'link'; id?: string; url?: string; title: string; addedBy: string; addedAt: string }
export interface QuestionnaireAssignment {
  id: string; auditId: string; checklistId: string; version: number; respondent: string; questionIds: string[]; dueDate: string
  status: 'Not started' | 'In progress' | 'Submitted' | 'Clarification requested' | 'Resubmitted'; assignedBy: string; assignedAt: string; submittedAt?: string; reminded?: string[]
}
export interface AuditeeResponse {
  id: string; auditId: string; assignmentId: string; checklistId: string; version: number; questionId: string; respondent: string
  value: string; explanation: string; naReason: string; evidence: AuditReference[]; status: 'Draft' | 'Submitted'; updatedAt: string
  history: { value: string; explanation: string; naReason: string; evidence: AuditReference[]; by: string; at: string }[]
}
export type AssessmentResult = 'Conforms' | 'Observation' | 'Minor NC' | 'Major NC' | 'Not applicable'
export interface AuditorAssessment {
  id: string; auditId: string; checklistId: string; version: number; questionId: string; auditor: string; result: AssessmentResult
  objectiveEvidence: string; sampling: string; interviewee: string; notes: string; evidence: AuditReference[]; status: 'Draft' | 'Completed'; at: string; supersedes?: string
}
export interface EvidenceVerification {
  id: string; auditId: string; checklistId: string; version: number; questionId: string; reference: AuditReference
  status: 'Pending review' | 'Verified' | 'Insufficient' | 'Not applicable'; by: string; at: string; notes: string
}
export interface ClarificationRequest {
  id: string; auditId: string; checklistId: string; version: number; questionId: string; assignmentId: string; from: string; to: string
  kind: 'Clarification' | 'More evidence'; text: string; reply?: string; replyHistory?: { reply: string; by: string; at: string }[]; status: 'Open' | 'Answered' | 'Resolved'; at: string; repliedAt?: string; resolvedAt?: string
}
export interface AuditFinding {
  id: string; auditId: string; checklistId: string; version: number; questionId: string; assessmentId: string; title: string
  classification: 'Observation' | 'Opportunity' | 'Minor NC' | 'Major NC'; requirement: string; clause: string; process: string; facts: string; evidence: AuditReference[]
  owner: string; auditor: string; status: 'Draft' | 'Agreed' | 'Final'; ncId?: string; at: string; consolidatedWith?: string; consolidationReason?: string
}
export interface AuditReport {
  id: string; auditId: string; version: number; status: 'Draft' | 'Issued'; objectives: string; scope: string; criteria: string; auditors: string[]; auditees: string[]
  dates: string; processes: string[]; evidenceSummary: string; conclusion: string; followUp: string; summary: string
  issuedBy?: string; issuedAt?: string; amendmentReason?: string; basedOn?: string
  snapshot?: { checklist: AuditChecklist; assignments: QuestionnaireAssignment[]; responses: AuditeeResponse[]; assessments: AuditorAssessment[]; findings: AuditFinding[]; verifications: EvidenceVerification[] }
}
