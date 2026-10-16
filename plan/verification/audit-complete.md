# Audit completion and questionnaire editing verification

16 October 2026. Branch `fix/audit-complete-flow`, based on main `4e0845864849cfa3aef0d69c03ee5adddb6e10c1` (approved PR #18).

The prior implementation routed quality/admin creators into a form owned by the lead, making the newly created questionnaire read-only. Passing isolated builder tests had not proved the default-user handoff or the whole audit lifecycle. This correction tests the actual visible controls and completes the release, results, findings and report path. [ADR-026](../decisions/ADR-026-audit-completion.md) records the permission and integrity decisions.

## Use the complete flow

1. **Plan:** Audits → Plan audit. Select the process, date/report due date, independent lead/team and designated auditee. Planning opens the overview. Add one or several checklists/questionnaires. The first checklist copies the selected template; later template edits do not change it. Rescheduling requires a reason.
2. **Prepare:** The authorized creator owns the new form and edits questions/choices inline. Changes save automatically. Use ⋯ for required answers, evidence rules, conditions and guidance. For an existing read-only draft, an authorized quality/admin preparer can deliberately take ownership with a recorded reason. Optional approval before use stays separate from release.
3. **Ready:** The lead chooses Mark checklist ready or Mark questionnaire ready. Other preparers choose Ask lead to mark ready; the lead gets the exact form link. No-approval forms can be marked ready immediately after validation. Released questions stay read-only. A preparer requests a revision and the lead starts a new draft when changes are needed.
4. **Collect and assess:** Assign released questionnaires to respondents and due dates. Respondents answer their own questions and submit. The audit’s Results page shows responses and submission status, with separate Assessments and Findings views. An independent assigned auditor conducts required checks, verifies evidence and resolves clarifications. An answer alone is not an auditor’s conformity conclusion.
5. **Resolve findings:** Create an observation, opportunity, minor NC or major NC from the assessed question. Correct draft facts through Edit finding. The lead sends it to the designated auditee, who agrees or disputes it. The lead records final disposition, explaining a withdrawal or disagreement resolution. Confirmed NCs link to one Corrective Action. Replaced/withdrawn forms keep their outstanding findings; their original content remains unchanged.
6. **Complete forms:** In Results, select the form and complete it after its requirements are met. If configured, request completion approval from the independent reviewers. Preparation approval, auditee review and completion approval are separate.
7. **Consolidate and issue:** In Audit report, each contributing auditor saves their own summary/conclusion. The lead writes the narrative and records Include, Merge or Exclude for each finalized finding. A merge needs the same clause/classification and an included target; exclusion needs a withdrawn finding and a reason. The page lists unmet issue requirements. Issue report freezes the complete audit record; audits with no NCs can issue normally.
8. **Correct an issued report:** The lead starts an amendment with a reason. The new draft can be corrected through controlled form/finding reopenings; old issued versions remain available and unchanged. Select a report version to review/print it.

## Verification

Final local and GitHub Check results are recorded below and in the pull request after the source and generated previews are frozen. Tests use synthetic people, processes and records only.

The new production-build tests cover:

- A real default administrator → lead → respondent → lead journey using visible controls, editable questionnaire text and choices, reload recovery, request/ready handoff, submission, completion, no-NC report issuance and amendment.
- Deliberate ownership takeover, reasons/history, read-only/hidden roles, released-version protection and independent assessment authority.
- Two auditors, disagreement resolution, one linked corrective action per finding, attributable contributions, explicit duplicate consolidation and immutable report snapshots.
- Missing answers/approvals/narrative/contributions, unauthorized issue/amendment, current grants and restricted evidence in historical snapshots.
- Template copying and questionnaire setting, schedule history and recoverable missing prior checklist, exact-version response selection, finding corrections/withdrawal, requested revision and preserved old submissions.
- Findings retained through withdrawn/replaced form versions and stale editorial decisions rejected after a finding changes.

[Before/after screenshots and print artifact](audit-complete-screens/README.md) compare the same synthetic records against the base commit. Maria’s wide quality access and Ben’s selected View access are checked in both themes at desktop, zoom equivalent, tablet and mobile sizes. Additional widths check actual builder/results/report reflow. Tables scroll within their containers.

## UI guide §10

The guide on the unrelated `ui-guidelines` branch was read and applied without merging that branch.

| Check | Evidence |
|---|---|
| Typecheck, production build, full e2e | Final results below and linked GitHub Check |
| No raw colors | Source diff scan; print CSS uses system colors |
| Existing navigation/design tokens | No top-level item, sidebar or token changes |
| Responsive screenshots | 192 before/after images and extra widths 640/1024/1280/1600/1920 |
| Light/dark | Both in the matrix; representative captures visually inspected |
| Plain wording | Ready, Responses, Assessments, Findings, Report and actionable missing requirements |
| Wide/narrow access | Quality preparer, View collaborator, independent lead, respondent and denied commands |
| Progress | One appended PR entry after source verification; earlier entries retained |

## Remaining infrastructure boundary

The preview stores synthetic records in one browser. Shared multi-user persistence, real sessions, verified respondent invitations, email delivery, server isolation/classification enforcement and transactional concurrency remain backend work. Report consolidation and issuance are now implemented in the preview. This branch is not merged or deployed by these checks.

## Final recorded evidence

- Final TypeScript check passed before the final production-build browser runs.
- Final focused workflow/permission/visual run: **10 passed in 57.1 seconds**. This includes the last historical-contributor extension: Kim contributes through the visible report controls after her original form is withdrawn while the replacement form and full narrative remain unavailable to her. A missing contribution blocks issue; changed finding reviews require a fresh editorial decision.
- **192 before/after screenshots**, zero recorded page errors, Public Sans loaded and no horizontal page overflow in all required after layouts; extra builder/results/report widths passed. Representative mobile, tablet/dark and desktop/zoom images were visually reviewed. The issued A4 report is two pages; both rendered pages were visually inspected for readable text and application controls are absent.
- Source diff/color checks passed with no raw colors, new dependencies, top-level navigation or token changes. Screenshot links resolve. Existing progress entries are retained.

- Final full production-build regression: **57 passed (2.6 minutes)** after the historical-contributor UI and command changes. This includes all 47 earlier tests plus ten new workflow/correction/layout tests; no tests were skipped.
- Both generated single-file previews were rebuilt with `npm run build:preview`. Final `npm run verify:preview` passed for disk and the Pages subpath, including deep links/new tabs, existing scope/share/history/effectivity, form copying, questionnaire editing/reload/release, Results and persisted report narrative; no external dependency or browser errors. Issue remains blocked for the deliberately unfinished smoke-test audit.
- Final GitHub Check results are linked in the PR description; merging and deployment require owner review.
- Final handoff review corrected finding-created notifications to the exact finding page, including a second auditor’s form. The visible destination is asserted in the two-auditor regression. TypeScript and all four complete-flow tests passed again (14.4 seconds); the generated previews were rebuilt and disk/Pages-subpath smoke repeated after this one-line route correction. Final GitHub Check covers the complete PR head.
