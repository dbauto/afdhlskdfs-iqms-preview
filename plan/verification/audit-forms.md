# Independent audit forms: implementation and verification

16 October 2026. Started from main `efbc82799b9506d6a798d759f99806f66e803288`, which already contains the approved PRs #15, #13 and #16. Work branch: `feat/audit-forms-collaboration`.

## Result

One audit plan now supports independent named checklists and questionnaires, one lead and several auditors, selected form owners/View/Edit collaborators, separate version-pinned answers/assessments, optional preparation/completion approval routes, reasoned reopening/withdrawal and independent copies to other processes. Existing single-checklist histories migrate without replacing their original IDs or references. Current grants govern old versions too. Stale writes cannot reuse a withdrawn form ID, use an ID belonging to another audit, or change an issued audit. Respondent projections omit collaborator/reviewer metadata and approval snapshots; evidence classification checks still apply.

The existing inline question editor, evidence/response/clarification workflow, controlled revisions and UI primitives are reused. New questionnaire questions default to response-only, with a separate assessment option. The exact form name appears on respondent assignments and answer pages. Audit readiness considers every active form; saved earlier versions remain directly openable. The old unsaved report-sharing demonstration controls are replaced by the actual audit team and persistent per-form settings. Report issuance stays unavailable.

Preparation requests bind exact content/settings. Completion requests bind responses, assessments, clarification, verification and findings as well. None/All/Any/Sequential routes enforce reviewer eligibility and order. Pending/approved work is locked. Return/reopen decisions preserve prior events; assessment/response snapshots remain append-only. Required evidence must be linked and verified, or its unavailability justified. Conditional questions use the applicable answers. A copy resets operational records, access grants and routes, generates fresh identities, and requires destination authority, a qualified independent team and clause review before release.

[Usage guide](audit-forms-guide.md) · [ADR-024](../decisions/ADR-024-independent-audit-forms.md) · [192 before/after screenshots](audit-forms-screens/README.md)

## Executed validation

- `npm run typecheck`: passed after the final source change.
- Production build: passed through the Playwright web-server build.
- Full local production-build Playwright suite: **42 passed in 2.2 minutes**, including all earlier audit/template, document and management review scenarios A–G.
- Final focused workflow/layout run after adding the respondent form label and review-panel capture: **13 passed in 51.6 seconds**. It builds both the current source and baseline main. Checks cover multiple form families/versions, separate questionnaire submissions, All/Any/Sequential approval, return/cancel/reopen, exact approved content, completion locks, evidence verification, nested conditions, selected/historical grants, classification/expiry denial, cross-process copying, independent lead review, duplicate/stale decisions, withdrawal/history and withdrawn/cross-audit ID reuse denial, full UI workflow and draft-comment recovery.
- Final command-guard regression after the stale-ID review: **11 passed in 12.1 seconds**, JSON reporter: expected 11, unexpected 0, skipped 0, flaky 0. Both generated previews and disk/Pages smoke checks were rebuilt/re-run after these guards.
- Screenshot matrix: **192 images**, six views × two people × two themes × four sizes × before/after. Loaded Public Sans and requested theme asserted. Zero page/dialog overflow and zero page errors. Additional widths 390/768/1280/1920/1600/1024/640 and unsaved Sheet recovery passed. Representative desktop, tablet, mobile, zoom, light/dark, restricted-role and review-panel captures were visually inspected. DataTable keeps wide columns inside its own scroller.
- `npm run build:preview`: passed; root and docs HTML rebuilt by script. Single-file verification exercises disk and Pages subpath, no external dependencies, record deep links/new tabs, the earlier scope/share/history/effectivity controls, new independent form autosave/reload and a copied destination plan.
- `git diff --check`: passed. No raw hex/palette additions. Navigation, sidebar and design tokens unchanged. All fixtures are synthetic; no upload control, dependency or deployment configuration is introduced.

GitHub Check and the final progress-only commit are recorded in the PR description after their runs complete. Local logs are summarized here; CI preserves machine-readable test evidence in its artifact.

## UI guide §10

The binding guide was read from [PR #14's UI guidelines](https://github.com/dbauto/afdhlskdfs-iqms-preview/blob/2d46e350bbb9b63e7b1c649b9eee9175fbbeea2b/app/UI-GUIDELINES.md); that unrelated open PR is not merged into this branch.

| Check | Evidence |
|---|---|
| Typecheck, build, e2e | Local checks above; final GitHub Check linked in PR |
| No raw colors or palette additions | Diff scan has no matches |
| Navigation/tokens preserved | Existing Audits routes; navigation/sidebar/token files unchanged |
| Responsive screenshots | 192 before/after images, required sizes and additional desktop/zoom equivalents; no page overflow |
| Light/dark | Explicit theme assertions and visual review |
| Wording | Existing action names retained; plain new labels; no new legacy brand/edition/hidden-count wording |
| Wide/narrow access | Maria/Joy matrix, direct NotFound checks, command/scoping/expiry/classification tests |
| Progress | Added only in the last documentation commit after source Check passes |

## Remaining boundary

This remains the existing same-browser localStorage preview, not a shared production service. The client-side checks demonstrate behavior; server organization/process isolation, authenticated memberships, transactional approvals/history, durable cross-user access and verified external invitations are future backend implementation under the normative plan. Copying is in-app structural reuse, not export/upload/import of completed audit data. Consolidated reports, issuance, amendments and auditee finding acknowledgement remain separate from form completion. No merge or production deployment is part of this change.
