import { lazy, Suspense } from "react"
import { PageLoading } from "@/components/app/page-loading"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/app/app-shell"

const SignIn = lazy(() => import("@/pages/auth/sign-in"))
const MicrosoftSignIn = lazy(() => import("@/pages/auth/microsoft"))
const RequestAccess = lazy(() => import("@/pages/auth/request-access"))

const Overview = lazy(() => import("@/pages/overview"))
const MyTasks = lazy(() => import("@/pages/my-tasks"))
const AccessRequestPage = lazy(() => import("@/pages/access-request"))
const CertificationSettingsPage = lazy(() => import("@/pages/settings/certification"))
const ComplaintDetail = lazy(() => import("@/pages/improvement/improvements").then(m => ({ default: m.ComplaintDetail })))
const ImprovementDetail = lazy(() => import("@/pages/improvement/improvements").then(m => ({ default: m.ImprovementDetail })))
const Search = lazy(() => import("@/pages/search"))
const NotFound = lazy(() => import("@/pages/not-found"))

const Organization = lazy(() => import("@/pages/qms/organization"))
const OrgPrint = lazy(() => import("@/pages/qms/org-sections").then(m => ({ default: m.OrgPrint })))
const Policies = lazy(() => import("@/pages/qms/policies"))
const Processes = lazy(() => import("@/pages/qms/processes"))
const ProcessDetail = lazy(() => import("@/pages/qms/process-detail"))
const Objectives = lazy(() => import("@/pages/qms/objectives"))
const ObjectiveDetail = lazy(() => import("@/pages/qms/objective-detail"))
const ContextRecord = lazy(() => import("@/pages/qms/context-detail"))

const Documents = lazy(() => import("@/pages/documents/register"))
const Reviews = lazy(() => import("@/pages/documents/reviews"))
const DocumentDetail = lazy(() => import("@/pages/documents/detail"))

const Risks = lazy(() => import("@/pages/risks/register"))
const RiskDetail = lazy(() => import("@/pages/risks/detail"))
const Evidence = lazy(() => import("@/pages/evidence/evidence"))
const EvidenceDetail = lazy(() => import("@/pages/evidence/detail"))

const Audits = lazy(() => import("@/pages/audits/programme"))
const AuditDetail = lazy(() => import("@/pages/audits/detail"))
const AuditPlanPage = lazy(() => import("@/pages/audits/audit-plan"))
const AuditPlanPrint = lazy(() => import("@/pages/audits/audit-plan").then(m => ({ default: m.AuditPlanPrint })))
const QuestionnaireBuilder = lazy(() => import("@/pages/audits/questionnaire-builder"))
const ChecklistBuilder = lazy(() => import("@/pages/audits/checklist-builder"))
const ConductAudit = lazy(() => import("@/pages/audits/conduct"))
const AuditResults = lazy(() => import("@/pages/audits/results"))
const AuditReportPage = lazy(() => import("@/pages/audits/report"))
const AuditeeQuestionnaire = lazy(() => import("@/pages/audits/questionnaires"))
const QuestionnaireAssignments = lazy(() => import("@/pages/audits/questionnaires").then(m => ({ default: m.QuestionnaireAssignments })))
const InvitedQuestionnaire = lazy(() => import("@/pages/audits/invited-questionnaire"))
const ResponseDetail = lazy(() => import("@/pages/audits/response-detail"))
const ChecklistTemplates = lazy(() => import("@/pages/audits/templates"))
const ChecklistTemplateDetail = lazy(() => import("@/pages/audits/template-detail"))

const ManagementReview = lazy(() => import("@/pages/review/list"))
const ManagementReviewDetail = lazy(() => import("@/pages/review/detail"))
const RecordReview = lazy(() => import("@/pages/review/record"))
const ReviewActionDetail = lazy(() => import("@/pages/review/action-detail"))
const ReviewPack = lazy(() => import("@/pages/review/pack"))

const CorrectiveAction = lazy(() => import("@/pages/improvement/register"))
const NonconformityDetail = lazy(() => import("@/pages/improvement/detail"))

const SettingsLayout = lazy(() => import("@/pages/settings/layout").then(m => ({ default: m.SettingsLayout })))
const SettingsIndex = lazy(() => import("@/pages/settings/layout").then(m => ({ default: m.SettingsIndex })))
const OrgProfile = lazy(() => import("@/pages/settings/organization"))
const Users = lazy(() => import("@/pages/settings/users"))
const Roles = lazy(() => import("@/pages/settings/roles"))
const RoleEditor = lazy(() => import("@/pages/settings/role-editor"))
const ProcessStructure = lazy(() => import("@/pages/settings/process-structure"))
const Numbering = lazy(() => import("@/pages/settings/numbering"))
const ReviewApproval = lazy(() => import("@/pages/settings/review-approval"))
const Retention = lazy(() => import("@/pages/settings/retention"))
const Notifications = lazy(() => import("@/pages/settings/notifications"))
const NotificationsPage = lazy(() => import("@/pages/notifications"))
const SupportReports = lazy(() => import("@/pages/platform/reports"))
const ContactSupport = lazy(() => import("@/pages/settings/support"))
const LegalSettings = lazy(() => import("@/pages/settings/legal"))
const LegalCentre = lazy(() => import("@/pages/legal/legal"))
const DataExport = lazy(() => import("@/pages/settings/data-export"))
const Billing = lazy(() => import("@/pages/settings/billing"))
const StorageSettings = lazy(() => import("@/pages/settings/storage"))
const Privacy = lazy(() => import("@/pages/settings/privacy"))
const About = lazy(() => import("@/pages/settings/about"))
const Branding = lazy(() => import("@/pages/settings/branding"))
const Appearance = lazy(() => import("@/pages/settings/appearance"))
const Profile = lazy(() => import("@/pages/settings/profile"))
const Security = lazy(() => import("@/pages/settings/security"))
const Integrations = lazy(() => import("@/pages/settings/integrations"))
const QmsRules = lazy(() => import("@/pages/settings/qms-rules"))
const Activity = lazy(() => import("@/pages/settings/activity"))
const Remarks = lazy(() => import("@/pages/remarks"))
const Readiness = lazy(() => import("@/pages/readiness"))

const PlatformShell = lazy(() => import("@/pages/platform/shell").then(m => ({ default: m.PlatformShell })))
const Tenants = lazy(() => import("@/pages/platform/organisations"))
const PlatformRequests = lazy(() => import("@/pages/platform/requests"))
const Logs = lazy(() => import("@/pages/platform/logs"))
const Jobs = lazy(() => import("@/pages/platform/jobs"))
const SupportAccess = lazy(() => import("@/pages/platform/support"))
const PlatformTeam = lazy(() => import("@/pages/platform/team"))
const PlatformOverview = lazy(() => import("@/pages/platform/overview"))
const OrganisationPage = lazy(() => import("@/pages/platform/organisation"))
const AiAssistants = lazy(() => import("@/pages/platform/ai"))
const SecurityScans = lazy(() => import("@/pages/platform/scans"))
const ScanReport = lazy(() => import("@/pages/platform/scan-report"))
const PlatformSettings = lazy(() => import("@/pages/platform/settings"))
const Finance = lazy(() => import("@/pages/platform/finance"))
const Approvals = lazy(() => import("@/pages/platform/approvals"))
const ActivityLog = lazy(() => import("@/pages/platform/activity"))
const Deployments = lazy(() => import("@/pages/platform/deployments"))
const GovernmentReports = lazy(() => import("@/pages/platform/gov-reports"))
const GovReportPage = lazy(() => import("@/pages/platform/gov-report"))

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
    <Routes>
      {/* Signed out */}
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-in/microsoft" element={<MicrosoftSignIn />} />
      <Route path="/respond-preview/:invitationId" element={<InvitedQuestionnaire />} />
      <Route path="/request-access" element={<RequestAccess />} />
      <Route path="/legal" element={<LegalCentre />} />
      <Route path="/legal/:code" element={<LegalCentre />} />
      {/* Review pack: its own page so it prints cleanly */}
      <Route path="/management-review/:id/pack" element={<ReviewPack />} />
      <Route path="/qms/organization/print" element={<OrgPrint />} />
      <Route path="/audits/plans/:id/print" element={<AuditPlanPrint />} />

      {/* Platform admin console (your team) */}
      <Route path="/platform/scans/report" element={<ScanReport />} />
      <Route path="/platform" element={<PlatformShell />}>
        <Route index element={<PlatformOverview />} />
        <Route path="organisations" element={<Tenants />} />
        <Route path="organisations/:id" element={<OrganisationPage />} />
        <Route path="finance" element={<Finance />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="deployments" element={<Deployments />} />
        <Route path="government-reports" element={<GovernmentReports />} />
        <Route path="government-reports/:id" element={<GovReportPage />} />
        <Route path="ai" element={<AiAssistants />} />
        <Route path="scans" element={<SecurityScans />} />
        <Route path="settings" element={<PlatformSettings />} />
        <Route path="requests" element={<PlatformRequests />} />
        <Route path="logs" element={<Logs />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="support" element={<SupportAccess />} />
        <Route path="reports" element={<SupportReports />} />
        <Route path="team" element={<PlatformTeam />} />
      </Route>

      {/* Client workspace */}
      <Route element={<AppShell />}>
        <Route index element={<Suspense fallback={<PageLoading />}><Overview /></Suspense>} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="access-requests/:id" element={<AccessRequestPage />} />
        <Route path="search" element={<Search />} />
        <Route path="remarks" element={<Remarks />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="readiness" element={<Suspense fallback={<PageLoading />}><Readiness /></Suspense>} />

        <Route path="qms" element={<Navigate to="/qms/processes" replace />} />
        <Route path="qms/organization" element={<Organization />} />
        <Route path="qms/organization/issues/:id" element={<ContextRecord kind="issue" />} />
        <Route path="qms/organization/parties/:id" element={<ContextRecord kind="party" />} />
        <Route path="qms/policies" element={<Policies />} />
        <Route path="qms/processes" element={<Suspense fallback={<PageLoading />}><Processes /></Suspense>} />
        <Route path="qms/processes/:id" element={<ProcessDetail />} />
        <Route path="qms/procedures" element={<Documents procedures />} />
        <Route path="qms/objectives" element={<Objectives />} />
        <Route path="qms/objectives/:id" element={<ObjectiveDetail />} />

        <Route path="documents" element={<Suspense fallback={<PageLoading />}><Documents /></Suspense>} />
        <Route path="documents/reviews" element={<Reviews />} />
        <Route path="documents/:id" element={<DocumentDetail />} />

        <Route path="risks" element={<Suspense fallback={<PageLoading />}><Risks /></Suspense>} />
        <Route path="risks/:id" element={<RiskDetail />} />
        <Route path="evidence" element={<Evidence />} />
        <Route path="evidence/:id" element={<EvidenceDetail />} />

        <Route path="audits" element={<Suspense fallback={<PageLoading />}><Audits /></Suspense>} />
        <Route path="audits/templates" element={<ChecklistTemplates />} />
        <Route path="audits/templates/:templateId" element={<ChecklistTemplateDetail />} />
        <Route path="audits/responses/:responseId" element={<ResponseDetail />} />
        <Route path="audits/plans/:id" element={<AuditPlanPage />} />
        <Route path="audits/:id" element={<AuditDetail />} />
        <Route path="audits/:id/conduct" element={<ConductAudit />} />
        <Route path="audits/:id/results" element={<AuditResults />} />
        <Route path="audits/:id/report" element={<AuditReportPage />} />
        <Route path="audits/:id/questionnaires" element={<QuestionnaireAssignments />} />
        <Route path="audits/:id/questionnaires/:assignmentId" element={<AuditeeQuestionnaire />} />
        <Route path="audits/:id/questionnaire-builder" element={<QuestionnaireBuilder />} />
        <Route path="audits/:id/checklist" element={<ChecklistBuilder />} />

        <Route path="management-review" element={<ManagementReview />} />
        <Route path="management-review/actions/:id" element={<ReviewActionDetail />} />
        <Route path="management-review/:id" element={<ManagementReviewDetail />} />
        <Route path="management-review/:id/record" element={<RecordReview />} />

        <Route path="corrective-action" element={<CorrectiveAction />} />
        <Route path="corrective-action/improvements/:id" element={<ImprovementDetail />} />
        <Route path="corrective-action/complaints/:id" element={<ComplaintDetail />} />
        <Route path="corrective-action/:id" element={<NonconformityDetail />} />

        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<SettingsIndex />} />
          <Route path="organization" element={<OrgProfile />} />
          <Route path="users" element={<Users />} />
          <Route path="roles" element={<Roles />} />
          <Route path="roles/:id" element={<RoleEditor />} />
          <Route path="process-structure" element={<ProcessStructure />} />
          <Route path="numbering" element={<Numbering />} />
          <Route path="review" element={<ReviewApproval />} />
          <Route path="retention" element={<Retention />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="support" element={<ContactSupport />} />
          <Route path="legal" element={<LegalSettings />} />
          <Route path="data-export" element={<DataExport />} />
          <Route path="billing" element={<Billing />} />
          <Route path="storage" element={<StorageSettings />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="about" element={<About />} />
          <Route path="branding" element={<Branding />} />
          <Route path="appearance" element={<Appearance />} />
          <Route path="profile" element={<Profile />} />
          <Route path="security" element={<Security />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="certification" element={<CertificationSettingsPage />} />
          <Route path="qms-rules" element={<QmsRules />} />
          <Route path="activity" element={<Activity />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
