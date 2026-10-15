# Scope and document controls — PR #16

Starting main: `2d647a4d40f218b0272468e3923ae627ebbe8ffa`. Source commit on the PR: `225bd8c4d6bdf4ef8e3c634fceaf8921d2702a19`, Git tree `135f6a3f500cbcd1b50c3f237e893c8bba0cc024`, identical to locally verified commit `216408b006986e7fb2eb252f3ebadfed30d68081`. This is a focused fix to the existing UI. No merge or deployment is included.

## What changed

- Revise scope previously displayed a toast. It now opens the existing revision Sheet with editable statement, products/services, sites, applicability and standard. Drafts are saved on the controlled scope document, can be reopened, and follow technical review, independent approval and publication. Published scope snapshots are retained. Unsaved text requires explicit discard. Archived scope stays read-only and is not described as a draft or in force.
- Share document uses the existing radio-group primitive with responsive spacing and keyboard selection. Access ends has its own row. Confidential-document edit sharing remains disabled; no new sharing authority is granted by this layout fix.
- Document Details includes Published on and Effective revision. Publication records its date/publisher. Suspend effectivity and Resume effectivity require Manage on Documents and a reason, preserve publication metadata and append an attributed event. They target the controlled revision even during a newer draft. Suspended revisions do not count as current evidence.
- Revisions → View more opens saved authorized versions and updates in the existing Dialog/DataTable components. Earlier dates and predecessor versions are not manufactured. Missing historical dates show No data. Version visibility is checked separately, including for old links and notes. Withdrawal retains an earlier controlled version when recorded.
- New commands recheck active membership/expiry, area permission, process scope, classification, workflow state/revision and independent approval. Approve permission alone does not grant draft editing. Menu, tokens, typeface and card style remain unchanged. Plan §15 records the scope/effectivity behavior.

## Executed validation

- `npm run typecheck`: passed after the final source change.
- Production build: passed locally and in Check.
- Full local production-build Playwright suite: 17 passed in 1.5 minutes. Added archived-scope regression: 1 passed in 6.3 seconds including its fresh build. Expanded responsive/keyboard check: 1 passed in 15.4 seconds including build.
- GitHub [Check run 38776347366](https://github.com/dbauto/afdhlskdfs-iqms-preview/actions/runs/38776347366): **18 passed in 1.5 minutes** on the complete final source; Type check, Build, End-to-end/permissions/responsive UI and Test evidence all succeeded. Includes audit 3a/3b, management review A–G, record figures and navigation regressions.
- `npm run build:preview` and `npm run verify:preview`: passed after the last source change. Disk and Pages-subpath checks exercise saved scope/reload, Share choice, revision modal, suspension, objective deep links/new tabs and no external dependencies. Both generated HTML files were rebuilt by script.
- `git diff --check`: passed. The guide's raw-colour scan returned zero matches; `nav.ts`, sidebar and token files are unchanged.
- [192-image comparison](document-controls-screens/README.md): baseline and after, Maria Santos/Joy Aquino, Light/Dark, 1440×900, 1280×650 at 150% zoom equivalent, 768×1024 and 390×844; loaded Public Sans. Zero horizontal page/dialog overflow. Representative desktop/laptop/tablet/mobile captures were visually inspected.
- Additional 390/768/1280/1920 checks cover sharing, scope editor, history and effectivity. Desktop zoom equivalents 80%, 125%, 150%, 200% adjust the CSS viewport and device scale; at 150% a 1280×650 content area uses an 853×433 CSS viewport. No application zoom, transform scaling or root-font override is used. Radio labels fit inside their controls and arrow-key selection passes.

The narrower-role captures intentionally show no access to the Leadership scope document; hidden records are not substituted with static scope content. Permission tests also cover deactivated/expired/missing users, process/classification denial, read-only roles, stale revisions, repeated suspension, restricted historical versions and retained dates/content.

## UI-GUIDELINES §10

The binding guide was read from [UI guidelines in PR #14](https://github.com/dbauto/afdhlskdfs-iqms-preview/blob/ui-guidelines/app/UI-GUIDELINES.md), because it is not on main yet.

| Check | Result |
|---|---|
| Typecheck, build, e2e | ✅ Check passes all 18 tests on final source |
| No raw colours/palette additions | ✅ Guide scan has zero matches |
| Menu and design tokens preserved | ✅ Navigation, sidebar and tokens unchanged |
| Responsive checks and screenshots | ✅ 192 before/after captures, required sizes and extra desktop/zoom checks; no horizontal overflow |
| Light/dark | ✅ Matrix and representative visual review |
| Wording | ✅ Existing names retained; plain new labels; no new legacy product/edition or hidden-count wording |
| Wide/narrow access | ✅ Maria/Joy matrix and command/visibility negative tests |
| Progress | ✅ Added in the final documentation commit after source Check passed |

The final documentation commit must also pass Check before the PR is marked ready; its run is linked in the PR description. No additional source change is made in that commit.

## How to use it

1. Open Organization & Scope → Revise scope. Change the scope fields, explain the change and start the revision. Reopen Revise scope to edit the draft, or Open document → Edit → Submit for review. An ongoing review cannot be edited through the scope page.
2. The assigned reviewer selects Complete technical review; an independent assigned approver approves; a document manager selects Publish. The publication date is then visible in Details. Update the external controlled file/version link in SharePoint/OneDrive separately; this app does not edit or upload that file.
3. In a document's side column, under Details, select Suspend effectivity or Resume effectivity and record the reason. This acts on the recorded controlled version, not a working draft.
4. Select Revisions → View more for saved versions, dates, full change notes, links and effectivity history.

This remains a synthetic browser-local preview. Older preview records may lack publication dates or prior-version snapshots; No data/None recorded is intentional. The existing Share dialog is still a preview simulation. Production shared persistence, identity, server-side authorization, transactional history and exact external-version verification remain backend work under the normative plan; this PR does not claim those are deployed.
