# ADR-040: Deployments with sandboxes, finance by organisation and partner share, government reports

27 October 2026. Requested and design-approved by Danica (canvas, 27 Oct 2026), adopting the useful parts of the `dbauto/thryvems-console` preview into the ThryveMS console, plus a place to generate government-mandated reports with a chosen scope.

## Adopted from thryvems-console
- **Deployments** (menu): four release steps (sandbox, test, approve, release or roll back); environments per organisation (production version, health, sandbox); sandboxes with change type and reference, compare, "Ask to promote" (needs Danica's approval), remove; releases with the number of organisations on each and the rollback target. One sandbox per organisation, synthetic records only, never a copy of production data or secrets, removed after 14 days.
- **Finance › By organisation**: revenue, actual hosting, other costs, profit and margin per organisation (platform owner only).
- **Finance › Partner share**: reported profit per partner with allocated costs (₱8,000 per organisation per month) and the agreement split (sample 70/30). "View as" a partner shows only that partner's organisations, revenue, allocated costs and share; never actual hosting, deployments or client records.
- Not adopted: dark sidebar, emoji icons, separate top bar; the console keeps the client sidebar (ADR-038).

## Government reports (menu)
- One list of filings: BIR (1601-C, 0619-E, 1702Q, 2550Q with the list of sales and purchases), NPC (Annual Security Incident Report, breach notification within 72 hours, registration renewal), SEC (General Information Sheet, audited financial statements), SSS/PhilHealth/Pag-IBIG contributions, client monthly service reports and subprocessor notices. Filter by agency; figures for due soon, draft ready, overdue, filed.
- **Scope**: generating a draft always asks for a start and an end date, filled with the report's usual period. The draft page has the scope bar (start, end, quick pick, regenerate). When the agency expects a fixed period and the scope differs, the draft is marked "Custom scope".
- Draft content is filled from ThryveMS records counted inside the scope and shows each figure's source. Checklist before filing; filing record (reference number, date filed, proof link); history including every scope used.
- ThryveMS prepares drafts; filing stays on the agency portals (NPC, eFPS/eBIRForms, SEC). Due dates are reminders to confirm with the accountant and lawyer. Filing records kept 5 years (to confirm).

## Backend impact (Pending)
| Area | Change | Status |
|---|---|---|
| Platform DB | `environments`, `sandboxes` (org, version, change type, reference, state, expiry), `releases`, `promotion_requests`; `partners`, `partner_assignments`, `cost_allocations`, `partner_agreements`; `gov_reports`, `gov_report_drafts` (scope_from, scope_to, content snapshot, sources), `gov_filings` (reference, date, proof link) | New |
| API | sandbox create/compare/promote-request/remove; finance by organisation; partner-scoped finance (server-filtered); gov report list, generate with scope, regenerate, mark filed | New |
| Security | partner views filtered on the server by assignment; sandboxes never receive production data or secrets; promotion and rollback need approval and an audit record | New |
| Tests | e2e for deployments, partner view, government reports and scope (this PR) | New |
