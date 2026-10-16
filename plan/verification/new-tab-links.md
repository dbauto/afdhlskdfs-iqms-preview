# New-tab content links verification

Starting point: main `66442d17fd449c424bf744274d94786f83244b6e` after approved PR #19. Branch `feat/new-tab-record-links`.

Danica requested content links throughout the app open new tabs so following an Overview item or linked record keeps the working page available. [ADR-027](../decisions/ADR-027-new-tab-content-links.md) records the policy and browser-preview persistence correction.

## Behavior

Cross-page content links now open a separate tab: Overview cards/attention/upcoming work, document and other registers, search results, notifications, related records/evidence, audit forms/results/findings/reports, review actions and legal references. Row-menu Open actions are real links. Targets preserve route query/version information under normal and hash routing, with `noopener noreferrer` and an accessible new-tab cue. Same-page filters, structural navigation and completion of commands retain their working flow. The sidebar/settings navigation and breadcrumbs remain available for moving around the current tab.

Opening an inspection link keeps the original URL, draft text, selected view and scroll context. The destination still enforces its own access rules. Confidential/unavailable records remain hidden or show the existing unavailable page. Notification records open separately while the source item becomes read.

Cross-tab tests reproduced an existing preview-store problem: imported data could be written back by another tab and undo recent typing, including questionnaire choices and report narratives. The correction saves local commands synchronously, ignores superseded queued storage events, and imports peer snapshots without echoing them back. It preserves sequential edits in multiple tabs; production concurrency and shared persistence remain backend requirements.

## Recorded verification

- After the persistence correction, **15 focused production-build tests passed (40.8s)**: real new tabs, Overview context retention, cross-module wide/narrow links, exact register/notification destinations, safe opener attributes, template/version editing, questionnaire responses and invited/interview isolation, two-auditor findings and report issuance/amendments. Earlier failures proved the typing/choice regression and were fixed rather than bypassed.
- New cross-module checks inspect content links in 28 routes as Maria and Ben. Restricted pages retain the unavailable recovery state. Explicit tests exercise sidebar/breadcrumb navigation and local filters without spawning extra tabs.
- New two-tab form test types a question character by character while another tab is open, saves an independent second form, edits the first again, and reloads both to confirm the two form identities and full text remain intact. Existing questionnaire multiselect/reload and report character-by-character/reload tests now run with their prior source tabs open.
- Final full-suite, layout and generated-preview results are recorded below after completion. GitHub Check on the final PR head is linked in the pull request.

[Before/after screenshots](new-tab-links-screens/README.md) use the same records as main for Overview and a permitted Operations evidence item, both themes, Maria/Ben, desktop, 150% zoom equivalent, tablet and mobile. The existing UI, wording, navigation structure, fonts and semantic tokens are preserved.

## UI guide §10

| Check | Evidence |
|---|---|
| Typecheck/build/e2e | Final results below and linked GitHub Check |
| No raw colors/new palette | Source diff scan; no design token changes |
| Existing top-level navigation | No new menu item; structural navigation kept |
| Responsive | Comparison matrix plus extra 1920px checks and full existing responsive suite |
| Light/dark | Both in the new matrix and existing tests |
| Plain wording/accessibility | Original link names; new-tab descriptions/titles; real anchors |
| Wide/narrow access | Maria/Ben route checks and destination permissions |
| Progress | One appended PR row; no earlier row edited |

This remains the synthetic browser-local preview. It does not grant permissions, add uploads, change external sharing or deploy itself.

## Final local results

- TypeScript passed after the shared-link and persistence changes.
- Final full production-build suite command completed successfully with no failed tests; the current suite lists **62 tests in 22 files**. This includes all 57 earlier audit/document/management-review/permission/navigation regressions plus four new link/context/synchronization tests and the new responsive test. The local last-run record was `passed` with an empty failed-test list; final GitHub Check provides the retained full run log.
- Final layout comparison passed: **1 test in 24.8s**, including **64 before/after screenshots**, both roles/themes and required viewports, real permitted evidence content for both roles, plus 1920px checks. No page errors/overflow; Public Sans loaded. Representative desktop evidence and narrow dark Overview images were visually inspected.
- Both single-file previews rebuilt successfully. Final disk and Pages-subpath smoke passed, including native Overview → Reviews popups, saved records, independent audit forms/process copies, questionnaire editing/release, Results and report narrative. No external dependencies or page errors.
- The final focused link tests passed again after adding the explicit denied-document check; JSON reporter statistics are recorded in the PR.
- Diff/color scan passed with no raw colors. Existing navigation, tokens and dependency manifests are unchanged. Progress appends one PR row only.
