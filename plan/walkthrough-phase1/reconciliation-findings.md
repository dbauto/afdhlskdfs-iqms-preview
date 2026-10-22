# Phase 1 continuation — semantic and baseline reconciliation

**21 Oct 2026 • Proposed, not accepted.** Source pin: frontend `96a199fee066cb4df041b2ad5dc27f246934f38f`; backend `b6f738f3258d84bf76662a2debd6361c0dda9a0b`. This document records improvements to G1 source traceability. No walkthroughs are running.

## 1. Newly traced evidence

- [Critical branch guards](./critical-branch-guards.csv): **29/29** anchor strings rechecked against the exact line of the pinned source. Includes form completion blockers, report issuance, review close, role gating, scope, and effectiveness delay. **Source verification only**; negative and concurrent runtime paths have not been run.
- [Semantic command anchors, major workflows](./semantic-command-anchors.csv): **37/37** command sites independently located at the recorded lines in the pinned source for audit, document, review and nonconformity workflows.
- [Semantic command anchors, remaining modules](./semantic-command-anchors-other.csv): **34/34** command sites independently located at recorded lines for process, QMS, risks, evidence, complaints and user management.
- [Tab surfaces](./tab-surfaces.csv): **27** `TabsTrigger` occurrences in 10 source screens, assigned stable `TAB-*` IDs for future guide targets. This is a *sampled contextual subset* (not a global tab denominator and not a browser verification).
- [Workflow candidates](./workflow-candidates.csv): Expanded from **122 to 129** after reviewing Search, Certification readiness, Consultant remarks, Notifications and the new pending Business-space scope. **126** current-oriented candidates and **3** explicitly future or pending, with all source and role/state claims still needing full validation.
- [Dependencies](./dependencies-and-exclusions.csv): **19** entries, including open frontend PR #35.

The inventory was subsequently expanded by five Overview-specific guides (FLOW-130–134), bringing the current candidate total to **134 (131 current-oriented; 3 future/pending)**. The [Overview UI version delta](./overview-baseline-revision.md) maps merged PRs #36, #38 and #39 to a new source pin and 32/32 source-line-verified (not browser-tested) acceptance assertions. The historic bulk inventory stays pinned to the earlier commit. The 71 audited *source command occurrences* supplement the 1,506 raw JSX/control observations but do not fully disposition the 1,506. **Nothing above is counted as completed G1 unless the source-to-action, current-role and state transition is proven and owner-reviewed.**

## 2. Material decisions and findings

| Finding | Source-backed observation | Decision / next proof |
|---|---|---|
| FIND-01 — Guide scope can change | Frontend [PR #35](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/35) proposes new Business-space routes/role restrictions and changes to existing platform UI; still open on this snapshot | Do not freeze 42-page denominator permanently until PR #35 is approved/merged or explicitly excluded by owner. Add Business-space leaves, roles and guides if adopted. |
| FIND-02 — No complete control-to-flow graph yet | The 1,506 action observations are line-pattern candidates; 71 anchors now source-checked, but controls, disabled states and outcomes require full review | Map **every eligible** control to a guide step or approved non-walkthrough/exclusion; record source, transition, validation and role gate. |
| FIND-03 — Audit lifecycle must not be guessed | `audits/form-approval.tsx` distinguishes Before use vs After completion, `audit/conduct.tsx` checks assessment blockers, `audit/report.tsx` controls issuance and amendments | Build tests for approval none/sequential, returned form, result NC link, evidence verification, versioned report issuance, blocked issuance and amendment. Review backend PR #9 first. |
| FIND-04 — Management Review closure requires more than viewed tutorial steps | `review/detail.tsx` guards close with signatures, no change requests and action carry-forward, and `review/record.tsx` blocks incomplete conclusions or invalid links | Guide completion must follow actual saved review record and sign-offs; test rejected/reopened/locked paths and new-tab packs. |
| FIND-05 — Source-only role grants are not authority | `app/src/data/org.ts` defines 9 role templates and 13 areas; `lib/store.tsx` adds effective process scope/classification/assignment; Settings has its own needs | Runtime role × module × process scope × classification × workflow state test suite required, including direct links and revoked assignments. |
| FIND-06 — Preexisting G1 missed supporting pages | `search.tsx`, `readiness.tsx`, `remarks.tsx`, `notifications.tsx` contain important interactions beyond main menu (e.g. readiness confirmation and notifications) | Added FLOW-123–128. Re-run independent screen crawl for further missing journeys; no claims of full 134-flow coverage. |
| FIND-07 — Onboarding and two requested future features | Eight setup criteria proposed; bulk Excel links-only import and Google sign-in remain separately approved designs to be scheduled | No upload control, no fake process Draft state and no Google admission UI until independently implemented and tested. |
| FIND-08 — Backend synchronization is not automatic | Open backend PR #9 reconciles older audit/process/review source and PR #3 is older Stage1 follow-up | Future guide persistence, APIs, events and security need linked backend architecture change PR; this documentation-only PR has **no backend runtime impact**. |

## 3. Evidence and status limitations

**Verified:** GitHub readback of the source-linked lines for the **29 guards + 71 commands**; route and menu source mapping inherited from the initial Phase 1 inventory. The source observations are correct *at the pinned commit*, not necessarily at later PR heads.

**Not yet verified:** Live browser role/state variants, actual control visibility and labels, 27 tab targets at viewport sizes, semantic 1,506-control dispositions, complete workflow branch termination, rejection/expiry/concurrency, actual guide progress, owner-approved exclusions and frozen denominators.

**G1 verdict: IN PROGRESS / NOT PASSED.** The source evidence narrows uncertainty but does not change the acceptance contract. C01–C14 walkthrough success metrics remain untested/not implemented. The documented Play action is still a requirement for later phases, not a working control.

## 4. Backend impact and dependencies

**Documentation-only change — no backend impact now.** No changes to schemas, relationships, APIs, workflows, permissions, security, integrations, events, or backend tests. Future implementation has backend impact and must be recorded through a linked backend repo change-management branch/PR and reviewed before full synchronization. Backend sync for future walkthrough functionality is **Pending**.

## 5. Next requirements for G1 pass

Complete the semantic crosswalk for every eligible current control and route, reconcile all relevant role/state variants in live browser, resolve the PR #35 baseline and backend PR #9 overlap, review required/optional onboarding predicates, obtain owner approval of exclusions, and freeze exact M/S/W/A/R/O denominators. No phase or guide is complete without those proofs.
