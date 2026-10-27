# ADR-042: Completing the developer console workflow

27 October 2026. Requested by Danica after the workflow review: fix all ten gaps, with business partners working inside the console as Co-admins.

| # | Gap | Now |
|---|---|---|
| 1 | Nowhere to approve | **Approvals** (menu, count badge): promotions, deployments, rollbacks, AI-agent fixes, AI setting changes, archiving. Developer decides with an optional reason (required to decline). AI settings need a second admin, never the requester. Approving a promotion updates the organisation's version and removes the sandbox. |
| 2 | No console audit trail | **Activity log** (menu): who did what, when, by kind and person, search, export with fingerprint. Not editable. Production: append-only table kept 7 years. |
| 3 | No partner management | **Partners are Co-admins** linked to a partner company. They see only their assigned organisations, their revenue, allocated costs and share; support reports from their organisations; no deployments, team, reports, scans, logs or approvals. Developer assigns organisations and the share in Platform team › Business partners. |
| 4 | AI findings can't be confirmed | Finding detail with **Confirm finding** / **Dismiss** (reason required) for AI findings and **Mark fixed after retest**. The audit report counts confirmed findings only. |
| 5 | Features in two places | Sections (modules) and features are both on the organisation page; the list links there. |
| 6 | No plans or pricing | Finance › **Plans and pricing** (per-user price, applies to next invoices, 30 days' notice); organisation **Change plan or seats** (not below seats in use); **Prepare next invoices**. |
| 7 | No releases screen | Deployments › **Register release** (version, notes; Developer only). Deploy and roll back on the organisation page use the registered releases. |
| 8 | No notifications in the console | **Bell** in the top bar: approvals waiting, overdue findings and invoices, alerts; mark read. |
| 9 | Changes lost on reload | Console changes are kept in the browser for the preview (approvals, activity, notifications, sandboxes, releases, findings, prices, plans, features, partners, filings). Production: platform tables via the API. |
| 10 | Figures not clickable; phone menu | Overview figures open their page (when the role allows). Below 768 px a **menu button** opens the grouped menu in a side panel. |

## Backend impact (Pending)
| Area | Change | Status |
|---|---|---|
| Platform DB | `approvals` (kind, payload, requester, decider, reason, second-admin flag), `console_activity` (append-only), `console_notifications`, `releases`, `findings.confirmed_by/at`, `plan_prices` with effective date, organisation plan/seat history, `partner_assignments`, `partner_agreements` (share, effective date), `platform_principals.partner_id` | New / changed |
| API | approvals list/decide with role and second-admin checks; activity read/export; notifications; release register; finding confirm/dismiss/fixed; price change; plan/seat change; partner assignment; all partner routes filtered on the server by assignment | New |
| Security | partners can never read other organisations, actual costs or deployments; decisions and deploys audited; requester can't approve their own second-admin request | New |
| Tests | e2e in this PR (`console-workflow-gaps.spec.ts`) | New |
