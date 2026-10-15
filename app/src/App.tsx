import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/app/app-shell"

import SignIn from "@/pages/auth/sign-in"
import MicrosoftSignIn from "@/pages/auth/microsoft"
import RequestAccess from "@/pages/auth/request-access"

import Overview from "@/pages/overview"
import Search from "@/pages/search"
import NotFound from "@/pages/not-found"

import Organization from "@/pages/qms/organization"
import Policies from "@/pages/qms/policies"
import Processes from "@/pages/qms/processes"
import ProcessDetail from "@/pages/qms/process-detail"
import Objectives from "@/pages/qms/objectives"
import ObjectiveDetail from "@/pages/qms/objective-detail"
import ContextRecord from "@/pages/qms/context-detail"

import Documents from "@/pages/documents/register"
import Reviews from "@/pages/documents/reviews"
import DocumentDetail from "@/pages/documents/detail"

import Risks from "@/pages/risks/register"
import RiskDetail from "@/pages/risks/detail"
import Evidence from "@/pages/evidence/evidence"
import EvidenceDetail from "@/pages/evidence/detail"

import Audits from "@/pages/audits/programme"
import AuditDetail from "@/pages/audits/detail"
import ChecklistBuilder from "@/pages/audits/checklist-builder"
import ChecklistTemplates from "@/pages/audits/templates"

import ManagementReview from "@/pages/review/list"
import ManagementReviewDetail from "@/pages/review/detail"
import RecordReview from "@/pages/review/record"
import ReviewActionDetail from "@/pages/review/action-detail"
import ReviewPack from "@/pages/review/pack"

import CorrectiveAction from "@/pages/improvement/register"
import NonconformityDetail from "@/pages/improvement/detail"

import { SettingsLayout, SettingsIndex } from "@/pages/settings/layout"
import OrgProfile from "@/pages/settings/organization"
import Users from "@/pages/settings/users"
import Roles from "@/pages/settings/roles"
import RoleEditor from "@/pages/settings/role-editor"
import ProcessStructure from "@/pages/settings/process-structure"
import Numbering from "@/pages/settings/numbering"
import ReviewApproval from "@/pages/settings/review-approval"
import Retention from "@/pages/settings/retention"
import Notifications from "@/pages/settings/notifications"
import NotificationsPage from "@/pages/notifications"
import SupportReports from "@/pages/platform/reports"
import ContactSupport from "@/pages/settings/support"
import LegalSettings from "@/pages/settings/legal"
import LegalCentre from "@/pages/legal/legal"
import DataExport from "@/pages/settings/data-export"
import Billing from "@/pages/settings/billing"
import Privacy from "@/pages/settings/privacy"
import About from "@/pages/settings/about"
import Branding from "@/pages/settings/branding"
import Appearance from "@/pages/settings/appearance"
import Profile from "@/pages/settings/profile"
import Security from "@/pages/settings/security"
import Integrations from "@/pages/settings/integrations"
import QmsRules from "@/pages/settings/qms-rules"
import Activity from "@/pages/settings/activity"
import Remarks from "@/pages/remarks"
import Readiness from "@/pages/readiness"

import { PlatformShell } from "@/pages/platform/shell"
import Tenants from "@/pages/platform/organisations"
import PlatformRequests from "@/pages/platform/requests"
import Logs from "@/pages/platform/logs"
import Jobs from "@/pages/platform/jobs"
import SupportAccess from "@/pages/platform/support"
import PlatformTeam from "@/pages/platform/team"

export default function App() {
  return (
    <Routes>
      {/* Signed out */}
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-in/microsoft" element={<MicrosoftSignIn />} />
      <Route path="/request-access" element={<RequestAccess />} />
      <Route path="/legal" element={<LegalCentre />} />
      <Route path="/legal/:code" element={<LegalCentre />} />
      {/* Review pack: its own page so it prints cleanly */}
      <Route path="/management-review/:id/pack" element={<ReviewPack />} />

      {/* Platform admin console (your team) */}
      <Route path="/platform" element={<PlatformShell />}>
        <Route index element={<Tenants />} />
        <Route path="requests" element={<PlatformRequests />} />
        <Route path="logs" element={<Logs />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="support" element={<SupportAccess />} />
        <Route path="reports" element={<SupportReports />} />
        <Route path="team" element={<PlatformTeam />} />
      </Route>

      {/* Client workspace */}
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="search" element={<Search />} />
        <Route path="remarks" element={<Remarks />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="readiness" element={<Readiness />} />

        <Route path="qms" element={<Navigate to="/qms/processes" replace />} />
        <Route path="qms/organization" element={<Organization />} />
        <Route path="qms/organization/issues/:id" element={<ContextRecord kind="issue" />} />
        <Route path="qms/organization/parties/:id" element={<ContextRecord kind="party" />} />
        <Route path="qms/policies" element={<Policies />} />
        <Route path="qms/processes" element={<Processes />} />
        <Route path="qms/processes/:id" element={<ProcessDetail />} />
        <Route path="qms/objectives" element={<Objectives />} />
        <Route path="qms/objectives/:id" element={<ObjectiveDetail />} />

        <Route path="documents" element={<Documents />} />
        <Route path="documents/reviews" element={<Reviews />} />
        <Route path="documents/:id" element={<DocumentDetail />} />

        <Route path="risks" element={<Risks />} />
        <Route path="risks/:id" element={<RiskDetail />} />
        <Route path="evidence" element={<Evidence />} />
        <Route path="evidence/:id" element={<EvidenceDetail />} />

        <Route path="audits" element={<Audits />} />
        <Route path="audits/templates" element={<ChecklistTemplates />} />
        <Route path="audits/:id" element={<AuditDetail />} />
        <Route path="audits/:id/checklist" element={<ChecklistBuilder />} />

        <Route path="management-review" element={<ManagementReview />} />
        <Route path="management-review/actions/:id" element={<ReviewActionDetail />} />
        <Route path="management-review/:id" element={<ManagementReviewDetail />} />
        <Route path="management-review/:id/record" element={<RecordReview />} />

        <Route path="corrective-action" element={<CorrectiveAction />} />
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
          <Route path="privacy" element={<Privacy />} />
          <Route path="about" element={<About />} />
          <Route path="branding" element={<Branding />} />
          <Route path="appearance" element={<Appearance />} />
          <Route path="profile" element={<Profile />} />
          <Route path="security" element={<Security />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="qms-rules" element={<QmsRules />} />
          <Route path="activity" element={<Activity />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

    </Routes>
  )
}
