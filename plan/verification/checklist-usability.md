# Checklist usability follow-up — PR #13

Starting commit: `8ee2f5431e8deff8dac4f0c4986b26fff8b047f8` on `kit/3c-conduct-findings`. Danica approved the focused layout and access fixes on 15 October 2026. No merge or deployment is included.

## Defect and change

The reusable template table had no question-opening route. Its Edit dialog changed only name, process and keeper, despite telling people to add questions in a workspace it did not link to. This was reproduced against the pre-change commit: no Open checklist or Edit questions actions, and no question fields in the dialog.

- Template names and explicit Open checklist actions now open saved questions. Edit questions opens the same inline editor used in audit checklists. Metadata Edit stays available.
- Question text and choice lines are edited in the main column. The ⋯ button opens Question settings through the existing Sheet primitive; no permanent duplicate question editor remains.
- Saved audit versions have explicit Open checklist and Edit draft actions. The selected version is carried in the URL and validated against the audit. Missing IDs do not fall back to an unrelated or blank draft. The editor reads the current store so changing versions and audits cannot retain stale local question content.
- Draft choice editing preserves trailing newlines during typing/reload. Release still validates and normalizes choices.
- Templates show record-driven question counts, preserve copied audit snapshots, and carry the questionnaire setting into new audits. New template questions, reordering, deletion and duplication use the same controls.
- Template mutations recheck active membership, audit permission and process scope. Guest auditors have no general template browser. Restricted evidence labels, document suggestions and independence hints remain unavailable; audit release/revision and independence enforcement rules are retained.

The existing menu, tokens, fonts, cards, record layout and wording remain. New controls use Button, Field, Input, Textarea, NativeSelect, Switch, Badge, Sheet, RowActions, ConfirmRemove and DataTable. No upload control, API backend, email delivery or report issuance was added.

## Validation

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run e2e -- --workers=2`: **20 passed in 2.1 minutes**, against the production bundle. This includes the original audit/questionnaire tests, management review A–G, permissions, navigation, record figures and both UI matrices.
- `npm run build:preview`: passed; generated `index.html` and `docs/index.html` through the build script.
- `npm run verify:preview`: passed from both disk and a Pages-style subpath. The smoke check now opens a saved template read-only, switches to editing, opens Question settings and opens/edits an exact saved audit version. It also checks existing deep links, new tabs and no external dependencies.
- `git diff --check`: passed. The UI guide's raw-colour diff scan returns no matches; navigation and token files are unchanged.
- New comparison matrix: **160 layout checks**, zero overflow, and **144 screenshots**. Both appearances, Maria Santos and Joy Aquino, widths 390/768/1280/1440/1920. The 1280×650 captures use device scale factor 1.5; no app zoom or root-size changes. Settings receive another 20 viewport checks. [Screenshot comparison index](checklist-usability-screens/README.md).
- Baseline fonts were verified as loaded after correcting only the local baseline Vite allow-list for symlinked test dependencies. Baseline source remains the pinned commit above.

The focused tests passed administrator template editing, independent template snapshots, new/duplicated content, exact saved-version opening, lead-only release, scope, read-only settings, inactive/expired access and restricted evidence. The original questionnaire/execution flows also ran against the new controls.

The browser-only preview limitations and unfinished report/consolidation stage remain as documented in [questionnaire verification](questionnaire-checklist.md). See the updated [usage guide](questionnaire-checklist-guide.md).

## UI-GUIDELINES §10

The binding guide was read from open PR #14 (`ui-guidelines`) because its file is not yet on this branch. 

| Required check | Result and evidence |
|---|---|
| Typecheck, build and e2e pass | ✅ 20 production-build tests; commands above |
| No raw hex or palette colours added | ✅ Exact guide scan returns no matches |
| No top-level menu change | ✅ `nav.ts` unchanged; template route stays under Audits |
| Required viewport checks and screenshots | ✅ 160 before/after layouts, 20 settings checks, 144 screenshots; zero page overflow |
| Light and dark checked | ✅ Matrix and representative desktop/laptop/tablet/mobile captures reviewed |
| Wording and product labels | ✅ Existing labels retained; new actions name what they open/edit; no new legacy name/edition/hidden-count wording |
| Wide and narrow access | ✅ Maria/Joy matrix, administrator journeys, active/expired/deactivated and guest checks, restricted evidence |
| Progress updated | ✅ Follow-up recorded in `plan/progress.md` |

GitHub Check must pass on the final uploaded commit before PR #13 is marked ready. The PR body records that run after completion. Merge and deployment remain for the owner.

