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

import Documents from "@/pages/documents/register"
import Reviews from "@/pages/documents/reviews"
import DocumentDetail from "@/pages/documents/detail"

import Risks from "@/pages/risks/register"
import Evidence from "@/pages/evidence/evidence"

import Audits from "@/pages/audits/programme"
import AuditDetail from "@/pages/audits/detail"
import ChecklistBuilder from "@/pages/audits/checklist-builder"
import ChecklistTemplates from "@/pages/audits/templates"

import ManagementReview from "@/pages/review/management-review"

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
import DataExport from "@/pages/settings/data-export"
import Billing from "@/pages/settings/billing"
import Privacy from "@/pages/settings/privacy"
import About from "@/pages/settings/about"

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

      {/* Platform admin console (your team) */}
      <Route path="/platform" element={<PlatformShell />}>
        <Route index element={<Tenants />} />
        <Route path="requests" element={<PlatformRequests />} />
        <Route path="logs" element={<Logs />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="support" element={<SupportAccess />} />
        <Route path="team" element={<PlatformTeam />} />
      </Route>

      {/* Client workspace */}
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="search" element={<Search />} />

        <Route path="qms" element={<Navigate to="/qms/processes" replace />} />
        <Route path="qms/organization" element={<Organization />} />
        <Route path="qms/policies" element={<Policies />} />
        <Route path="qms/processes" element={<Processes />} />
        <Route path="qms/processes/:id" element={<ProcessDetail />} />
        <Route path="qms/objectives" element={<Objectives />} />

        <Route path="documents" element={<Documents />} />
        <Route path="documents/reviews" element={<Reviews />} />
        <Route path="documents/:id" element={<DocumentDetail />} />

        <Route path="risks" element={<Risks />} />
        <Route path="evidence" element={<Evidence />} />

        <Route path="audits" element={<Audits />} />
        <Route path="audits/templates" element={<ChecklistTemplates />} />
        <Route path="audits/:id" element={<AuditDetail />} />
        <Route path="audits/:id/checklist" element={<ChecklistBuilder />} />

        <Route path="management-review" element={<ManagementReview />} />

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
          <Route path="data-export" element={<DataExport />} />
          <Route path="billing" element={<Billing />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="about" element={<About />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

    </Routes>
  )
}
