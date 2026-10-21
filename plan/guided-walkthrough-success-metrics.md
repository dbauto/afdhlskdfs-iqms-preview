# ThryveMS walkthrough success metrics and acceptance gates

**Status:** Proposed; owner approval pending. **Date:** 21 Oct 2026. Companion to [Guided onboarding and walkthrough implementation plan](./guided-walkthrough-plan.md). This is an **implementation acceptance contract**, not a claim that any guides work today.

## 1. Definition of complete

The project is **Complete** only when all applicable Gates G1–G6 are passed **on the same accepted release baseline**, with directly linked evidence, no unresolved blocking defects, and backend architecture/traceability changes reviewed and approved. A guide implemented without the required Play action, complete role coverage, real workflow completion checks or test evidence is **In progress**, not Complete.

**Statuses:** Not started / In progress / Blocked / Verified (gate passed) / Complete (all gates + approvals). Percent below 100 **never** permits "Complete." "Not tested" must be explicit; historical tests on other commits are not current proof.

## 2. Baseline and denominators

At G1, freeze a versioned inventory (include frontend Git SHA, normative plan version, backend architecture SHA, date) containing these sets:

- **Menu leaf pages (M):** Starting count = **42** distinct leaf destinations: **13** client main-menu leaf pages, **22** Settings leaf pages (7 Workspace, 6 Quality system, 9 Account), and **7** platform-menu leaf pages. Recount on the implementation baseline; list every path and its authorized role variants. Every authorized menu leaf page must expose **Play walkthrough**.
- **Reachable screens (S):** All permitted secondary routes, tabs, important record-detail views, forms, sheets, dialogs, and role variants, including external-only outcomes. No pre-stated count: discover from routes, source and real browser.
- **Workflow journeys (W):** Every business workflow and alternate valid path across those screens; a journey is one user goal with actor, prerequisites, start, decision branches, business transitions and verifiable end.
- **Actions/transitions (A):** Every user-visible control, conditional action, validation, state transition and error/recovery path in each guide's approved scope.
- **Roles/policy variants (R):** All relevant effective permission × process scope × classification × membership/assignment × lifecycle cases, using representative synthetic fixtures and negative test cases.
- **Onboarding requirements (O):** All initial configuration checks with required/optional/NA rules and authoritative completion predicates.
- **Test cases (T):** Traceability mapped to M, S, W, A, R and O plus all resilience, security, responsive, accessibility and system tests.

Each counted item has a **stable ID, expected outcome, owner, implemented/tested status, evidence link**. No silent omissions or denominator reductions. "Not applicable" requires owner-approved written reasons and is listed in the exclusion register **before execution**; skipped, failing and blocked items are **not** accepted as completed.

**Formula:** \`coverage = verified eligible items / all eligible items × 100\`. An eligible item is counted **Verified** only when its current-version proof passes; implementation or documentation alone counts **0** toward that numerator.

## 3. Required quantitative scorecard

| ID | KPI | Pass threshold | Evidence required |
|---|---|---|---|
| C01 | Menu Play availability | **100% of M** have accessible, actionable Play walkthrough entry, whenever page is permitted, even after tour is skipped/completed | Menu × role-route × viewport automated assertions, actual screenshots |
| C02 | Page-tour coverage | **100% of M** and all required S have complete approved walkthroughs or approved documented exclusions for non-menu S | Versioned guide and route-to-guide register; executed navigation tests |
| C03 | Workflow coverage | **100% of W**, including assigned-role branches, rejection/rework paths and cross-module transitions | Actual end-to-end test traces and state assertions |
| C04 | Step/action accuracy | **100% of A** mapped to real visible UI actions and transitions; **0** invented targets or incorrect copy | Locator-resolution/step execution and source-to-UI review |
| C05 | Role/policy coverage | **100% of R** pass positive and negative checks; **0** unauthorized guide content, data access or hidden-count leaks | Current authorization, tenant, process/classification and direct-link test results |
| C06 | Organization onboarding | **100% of O** have defined predicate, required/optional/NA handling, correct real completion state and safe reopening when data changes | Fresh-tenant and partially-configured tenant fixtures; persistence + re-evaluation tests |
| C07 | On-demand replay behavior | **100%** of Play-start/replay-on-same-page cases pass; works after completed/skipped and does not alter business data | Automated repeat-play cases per M, user-trigger evidence |
| C08 | Guidance navigation/recovery | **100%** of catalogued next/back/skip/close/resume/restart, refresh/logout/tab/failed-load/revocation/changed-target tests pass | Versioned resilience test results |
| C09 | Workflow truth | **0** false business completions; business-step completion only after authoritative verified state; never auto-approval/publish/issue | Server/state test assertions; negative and race tests |
| C10 | Persistence and version drift | **100%** of per-person and per-org resume, concurrency, version upgrade and invalidation tests pass | Cross-session, cross-browser-device where supported, conflict/version fixtures |
| C11 | Responsive + accessibility | **100%** of required UI-GUIDELINES §10 screenshots and a11y/keyboard/focus/reduced-motion/contrast cases pass; **0** horizontal page overflow at required widths | Desktop/tablet/mobile both themes, approved before/after screenshots, automated a11y + manual keyboard review |
| C12 | Build/automated quality | **100%** pass: \`npm run typecheck\`, \`npm run build\`, \`npm run e2e\`, and GitHub **Check** on the reviewed final commit | Commands, exit codes, test counts, build and workflow run URLs |
| C13 | Backend/security qualification | **100%** of changed schemas/relations/APIs/workflows/permissions/security/integrations/events/tests have documented disposition and approved backend sync; **0** unresolved permission/isolation vulnerabilities | Linked backend change PR, verified architecture and traceability, authorized negative tests |
| C14 | Defects / release readiness | **0** unresolved failures against any above acceptance condition and **0** unresolved high/critical security findings | Current defect register, retest links, owner review and merge approval |

**Hard acceptance behavior:** A Play button that is visible but inert fails C01/C07. A tour that only explains controls, when a workflow guide was promised, fails C03/C09. A skipped onboarding requirement is not a completed configuration (C06). A guide that works only for an administrator but is claimed to cover process owners fails C05. A tour that does not survive new-tab navigation where required fails C08.

## 4. Phase gates: what must be signed off

| Gate | Exit conditions (all mandatory) | Proof artifact |
|---|---|---|
| **G1 — Inventory** | 100% of M enumerated; all S/W/A/R/O classified and reconciled against source; no unknown/unassigned items; frozen denominators and explicit exclusions | Menu/route and control register; workflow/role/state matrices; owner-reviewed source hash |
| **G2 — Design** | 100% of eligible guides have approved ID/version, exact labels and targets, steps/branches, start/restart, validation, help text, security and recovery; all Play positions use existing UI tokens/components | UX specifications, content and UI guideline checklist, reviewed copy |
| **G3 — Engine** | Navigation, rendering, page Play button, target resolution, privacy and progress logic pass all engine/component/integration/negative tests; no unauthorized state mutations | Executed tests, browser recordings/screenshots, backend contracts |
| **G4 — Onboarding** | Every O requirement has persisted authoritative check, owner/quality-role restrictions, NA/defer handling, resume/version behavior, invalidation and honest completeness; linked-only imports shown only when actually released | Fresh-client and existing-client end-to-end checks and authoritative record evidence |
| **G5 — Coverage** | Release A/B/C/D guides for M/S/W complete with exact current implementation, every eligible menu has Play, every required workflow branch passes | Frozen 100% route/guide/action/role traceability; full E2E |
| **G6 — Final release** | C01–C14 all PASS on final reviewed heads; frontend PR Check green; UI-GUIDELINES §10 screenshots and views checked; backend change PR approved and synchronized where required; \`plan/progress.md\` last commit accurately states results; owner approval for merge/deploy | Final verification packet and separate approval records |

Each gate is binary **Pass / Fail / Not verified**. "Partial", "mostly passing", or "design reviewed" is not a Pass. A gate on superseded source is invalid and must be rechecked.

## 5. Minimum test families (with trace IDs before coding)

1. **Navigation:** Every menu Play activation across visible role variants; restart after prior completion; route changes and navigation breadcrumbs.
2. **UI targets:** Scrolled cards/tables, tabs, collapsible sidebar, dialogs/sheets, conditional buttons, removed or renamed DOM target, loading/empty states.
3. **Workflows:** All business start → finish and alternate/rejection loops; audit execution/forms/NC/report, document reviewer/approver/periodic review, management-review pack/signatures/changes/closure, process creation and links, objective results, risk treatment and verification.
4. **Onboarding:** Clean workspace, existing data, partially complete workspace, skipped optional, incomplete required, multi-administrator updates and invalidation.
5. **Security:** Wrong tenant, no permission, wrong process scope, confidentiality, revoked assignment, unauthorized direct URL, stale session and concurrent role update; guide data and counts may not leak.
6. **Resilience:** Refresh, sign out/in, offline/network errors, expiry, new-tab continuity, simultaneous sessions, version drift, incomplete external provider/integration.
7. **Accessibility/responsive:** Keyboard/Enter/Space/Escape, focus trapping/return, screen reader labels, touch targets, contrast, motion preferences, light/dark, screen widths and 150% scaling.
8. **Integrity/observability:** No false completion, no guide-triggered business mutation, retry/idempotency, safe telemetry (no titles/evidence links/secrets), no synthetic test data containing real identities.

The test suite must be **derived from the inventory** and expanded when routes, workflow contracts or permissions change. Do not use the currently available app E2E count as proof of walkthrough coverage.

## 6. Screenshot/CI acceptance contract

For **actual UI implementation PRs**, attach before/after screenshots at **1440×900, 1280×650 (150% scaling), 768×1024 and 390×844**, in **light and dark**, as a permitted quality/administrator role and a narrower permitted role, per \`app/UI-GUIDELINES.md\` §9–10. Check horizontal overflow additionally at 1920px; retain any required process/classification denial evidence. Screenshot requirements are not waived for Play-button UI changes.

Run and link the actual commands and GitHub Check on the **final PR head**. Include failure and rerun history without calling a previous green job "this PR passed." Keep \`plan/progress.md\` as the final commit **after substantive checks pass**, and recheck the final head. Never merge or deploy without separate owner approval.

For a **documentation-only planning PR**, UI screenshot, browser interaction, permission regression and workflow runtime verification are **Not applicable to changed files; NOT RUN**, not passing implementation proof. Required source/readback consistency checks should be recorded. Do not mark this planning PR as G1–G6 complete.

## 7. Final evidence pack and status template

Each release must include:
- Frontend and backend exact Git SHAs, current normative rules/ADR references.
- Inventory and traceability (eligible, verified, failed, blocked, excluded-with-approval counts) for M/S/W/A/R/O/T.
- Per-KPI C01–C14 verdict with tested evidence; no self-reported success.
- Exact test commands, environment, run links, pass/fail counts, non-run cases, UI screenshots and manual accessibility notes.
- Backend impact analysis including database, relationships, APIs, workflows, permissions, security, integrations, events and tests; linked backend PR where future changes actually affect the backend.
- Defect list, unresolved blockers, authorization/merge/deploy decisions, and truthful \`plan/progress.md\` update.

**Final status rule:** All gates and C01–C14 met = **Complete**. Any not-run requirement, pending backend sync or blocked/failed acceptance item = **In progress** or **Blocked**, with counts. No partial delivery may be labeled complete.

## 8. This documentation PR's verification status

This document only defines *future* KPIs and gates. It does **not** create the guides, implement Play, run application tests, or demonstrate any walkthrough. Current C01–C14 and G1–G6 therefore remain **Not verified / Not implemented**; current documentation-only PR checks must be reported separately in \`plan/progress.md\`.
