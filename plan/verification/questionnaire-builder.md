# Dedicated questionnaire builder verification

16 October 2026. Branch `fix/questionnaire-builder`, based on main `55ea388e917177c0501a386470ce95605ecc4f56` after the approved merge of PR #17.

## Problem and correction

Add questionnaire saved a typed Questionnaire, but opened the checklist URL, called it a checklist throughout the editor/register, exposed the questionnaire-off switch and mixed auditor-only answer settings into authoring. Creation also defaulted to the lead owner even when another eligible team auditor was creating it, leaving that creator unable to edit without changing the owner manually.

Questionnaires now have their own builder at `/audits/:id/questionnaire-builder`, distinct heading/actions/version wording, new AQF form numbers, inline response-type controls and respondent guidance. Text, choice, multiselect, Yes/No/N/A, number/date and instructions reuse the established question/answer primitives. New questions collect auditee answers with optional independent auditor assessment off by default. Form type cannot change after creation, collection cannot be disabled, and auditor-only question types block preparation/release until corrected. Legacy questionnaire IDs/versions/responses remain intact; old authoring links redirect with version/view mode preserved. Existing combined checklists keep their compatible behavior.

Open questionnaire / Edit questions in Saved audit forms, correct approval notification links, creation from Audit questionnaires, and Mark questionnaire ready → exact-form assignment connect the full workflow. Eligible team creators default to owning the form. Non-team quality oversight gets an explicit editing handoff without gaining permissions. View-only auditors have no Add actions that their command permissions would reject. Section titles wrap above actions in narrow cards. Unlinked evidence text requires Keep editing or explicit discard while other edits autosave.

[Usage and decision](../decisions/ADR-025-questionnaire-builder.md) · [128 before/after screenshots](questionnaire-builder-screens/README.md)

## Verified results

- TypeScript passed after the final creation-permission checks.
- Full production-build Playwright regression: **47 passed in 134.7 seconds**, zero skipped, unexpected or flaky (JSON reporter). This includes the prior 42 audit/template, document, navigation, management-review and permission tests plus five builder checks.
- Final focused run after the creation-button gates: **5 passed in 41.5 seconds**, including the before/after matrix and extended wide-builder checks. Four workflow tests cover creation by a team auditor, editable question/choice persistence, evidence/required-answer validation, independent preparation approval, lead release, auditee submission, exact-version revision/history, incompatible old draft correction, type/collection command guards, legacy URL redirects, hidden/read-only access and the default quality-manager handoff. The settings test also verifies unsaved evidence-link recovery/discard.
- **128 comparison images**: four screens, Maria/Ben, Light/Dark, 1440×900, 1280×650 at 150% zoom equivalent, 768×1024, 390×844. Same synthetic data on both sides. Public Sans/theme/page/dialog bounds asserted; no page errors or horizontal page overflow. Additional actual-builder widths 1280/1920/1600/1024/640 passed. Representative mobile/desktop/zoom/theme captures visually inspected. Wide DataTable columns scroll internally.
- `npm run build:preview` passed after the final source changes; both generated HTML files rebuilt by script.
- `npm run verify:preview` passed on disk and the Pages subpath. It checks existing scope/share/history/effectivity and new independent forms/process copying, then creates a questionnaire, edits/reloads its question, confirms its dedicated route/default type/no off-switch, marks it ready and opens assignments. No external dependencies or page errors; existing record deep links/new tabs pass.
- `git diff --check origin/main` passed. The UI-guide raw-color diff scan has no matches. Navigation, sidebar, token/theme files and dependency manifests are unchanged. No upload, backend or deployment change.

GitHub Check on the complete PR and final progress-only commit is linked in the PR description after completion.

## UI guide §10

The guide from [PR #14](https://github.com/dbauto/afdhlskdfs-iqms-preview/blob/2d46e350bbb9b63e7b1c649b9eee9175fbbeea2b/app/UI-GUIDELINES.md) was applied without importing that unrelated branch.

| Check | Evidence |
|---|---|
| Typecheck, production build, e2e | Local results above; final Check in PR |
| No raw colors | Diff scan has zero matches |
| Existing navigation/design tokens | Unchanged; the builder is within Audits |
| Responsive screenshots | 128 comparisons and additional actual-builder wide/zoom equivalents |
| Light/dark | Both asserted and visually reviewed |
| Plain wording | Questionnaire-specific authoring; legacy checklist wording retained for checklists |
| Wide/narrow access | Quality/editor versus View collaborator; denied routes and handoff cases |
| Progress | Last documentation-only commit after local source verification |

## How to use it

1. Open an audit → Add questionnaire, or Audit questionnaires → Add questionnaire. Name it, select an eligible owner/collaborators and optional approval routes. Create questionnaire opens the dedicated builder. If you are outside the plan team, the owner prepares the questions; join the audit team and receive Edit access if you need to author them.
2. Add question, choose its answer type inline and write the question/choices. Use ⋯ for required answers, evidence, N/A reason, conditions, reviewer, respondent guidance and optional auditor assessment. Edits save automatically. Repeat or add sections.
3. Submit for preparation approval if configured; assigned independent reviewers approve or return it. The lead selects Mark questionnaire ready and is taken to assignments for that exact form/version.
4. Assign respondents and due dates. Each respondent opens their own questionnaire, answers, links required evidence and submits. Clarification and submission snapshots use the existing workflow.
5. Open a saved questionnaire with Open questionnaire, then Edit questions for an editable draft. Released versions stay read-only. The lead starts a questionnaire revision with a reason; old assignments/submissions retain the old version.

This remains the existing synthetic browser-local preview. Cross-device sharing, verified invitations, server authorization/isolation and report consolidation remain separate work. This correction does not deploy or merge itself.
