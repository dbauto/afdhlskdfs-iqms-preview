# Questionnaire and auditor checklist verification

PR #13 keeps the existing Audits menu and checklist builder. The builder now supplies actual multiline, radio and checkbox controls; evidence links can be disabled, optional or required. Questionnaire answers are separate from the auditor's assessment and completion checkbox. See the [usage guide](questionnaire-checklist-guide.md) and [respondent identity decision](../decisions/ADR-023-questionnaire-respondents.md).

## Scope and limits

This is the browser-only synthetic preview. No server, email delivery, verified identity, cross-device invitation or production data/configuration has been introduced. **Open respondent preview** is explicitly unverified, same-browser sample data. Production invitations must implement ADR-023 before exposure to real respondents. Interview entry names both respondent and recording auditor.

The recovered execution work includes independent, attributable assessments, evidence review, clarification, findings, one finding-to-NC link, audit progress and management review sources. The wider kit's versioned report issue/amendment and multiple-auditor consolidation remain unfinished (stage 3d); report issuance is disabled. This PR does not represent completion of the full uploaded kit. Merge and production deployment require the owner's approval.

## Validation

The final production-build run passed all 15 tests in 2.9 minutes. The expanded finding-detail role/theme/viewport checks then passed in a focused two-test run (36.9 seconds). Chromium is local test infrastructure only; no runtime dependency or binary was added to the app.

- TypeScript: passed (`npm run typecheck`).
- Production build: passed (`npm run build`).
- Full Playwright suite: passed (`npm run e2e -- --workers=2`): 15 tests, including management review A–G. Tests build and serve the production app so reload/new-tab checks exercise the shipped bundle; the questionnaire scenario has an explicit 90-second budget. Readiness waits also accept the intentional access-denied screen.
- Single-file preview build and disk/Pages-subpath checks: passed (`npm run build:preview`, `npm run verify:preview`); no external dependencies, deep links and new tabs work from disk and a Pages-style subpath.
- GitHub Check runs TypeScript, production build and the complete 15-test suite, and preserves screenshot/test evidence for 30 days. [Current PR checks](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/13/checks) must pass before the PR is marked ready; the PR records the verified run.
- Before/after UI matrix: passed. Baseline: 100 cases. After: 160 workspace cases (including the new finding detail) and eight standalone respondent layouts. All 268 cases have zero page overflow. The [comparison index](questionnaire-checklist-screens/README.md) links 216 screenshots; before/after JSON matrices are in the same folder. The baseline replays the same prompts; it cannot represent the new multiselect control.

The tests cover separate workspace respondents; multiline/radio/multiselect controls; answer and evidence requirements; disabled evidence; draft/reload recovery; submission lock; clarification/revision history; exact response snapshot opened in a new tab; invalid/forged references; completed checklist persistence; independence; finding/NC deduplication; narrower roles; inactive/expired/denied access; respondent preview isolation, expiry/revocation, same-name collision and interview attribution.

## UI-GUIDELINES §10

The guide is in the owner's open [UI guidelines PR #14](https://github.com/dbauto/afdhlskdfs-iqms-preview/blob/7a8bbd7/app/UI-GUIDELINES.md), read as binding even though it is not yet on main. Existing primitives, design tokens, fonts, menu and card style are retained.

| Required check | Result and evidence |
|---|---|
| Typecheck, build and e2e pass | ✅ Commands and results above |
| No raw hex or palette colours added | ✅ Source diff scan returns no matches |
| No top-level menu added | ✅ `nav.ts` unchanged |
| No horizontal scrolling; required screenshots | ✅ 268 layouts, 216 screenshots; [comparison index](questionnaire-checklist-screens/README.md) |
| Light and dark | ✅ Both appearances in the complete matrix; representative desktop, scaled laptop and mobile captures visually reviewed |
| Plain wording and product name | ✅ Existing wording retained, short dates used, no new legacy product label or ISO edition string |
| Wide and narrow role access | ✅ Maria/Joy UI checks and command permission tests passed, including denied conduct/finding pages and restricted evidence |
| Progress updated | ✅ `plan/progress.md` records implementation, tests and remaining backend/report work |

Screenshots use synthetic People & competence audit IA-2026-10. Baseline is main `2d647a4d40f218b0272468e3923ae627ebbe8ffa`. Maria Santos and Joy Aquino are existing synthetic sample users. Widths are 390, 768, 1280, 1440 and 1920; images cover 1440×900, 1280×650 at 150% display scaling, 768×1024 and 390×844. Browser device scale factor 1.5 represents display scaling; no app zoom, root font-size or transform override is used. The new standalone invited-respondent page has both appearances and all four screenshot sizes.
