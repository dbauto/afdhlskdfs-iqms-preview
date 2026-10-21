# Walkthrough Phase 1 — Source inventory and G1 acceptance review

**Date:** 21 Oct 2026 (Asia/Manila)  
**Status:** **G1 NOT VERIFIED / IN PROGRESS.** This is an auditable source-based inventory, not a completed implementation or accepted G1 gate.  
**Parent plan:** [Guided walkthrough plan](../guided-walkthrough-plan.md) and [success metrics](../guided-walkthrough-success-metrics.md), proposed in unmerged frontend PR #33.  
**Pinned source:** frontend `dbauto/afdhlskdfs-iqms-preview` main at `96a199fee066cb4df041b2ad5dc27f246934f38f`. Backend architecture main at `b6f738f3258d84bf76662a2debd6361c0dda9a0b`. These SHA pins do not imply source synchronization with later unmerged changes.

## 1. Deliverables and source metrics

| Inventory | Actual source-derived count | Meaning / limitation |
|---|---:|---|
| `source-manifest.csv` | **185** `app/src` TypeScript/TSX blob entries | Pinned source tree paths/SHA/size; not all files semantically inspected |
| Page and application-component TSX files scanned | **119 of 119** | All files under `app/src/pages` and `app/src/components/app` fetched successfully at the pinned commit |
| `action-observations-1.csv` … `-12.csv` | **1,506** candidate observations across **112** source files | JSX controls, navigation and handler occurrences with file/line; **not** 1,506 independently validated interactions; seven files contained no matched observation |
| `route-inventory.csv` | **84** declared Route nodes | 77 explicit screen routes, 3 index routes, 3 layouts, 1 fallback; 80 displayed screen/index routes; not browser exercised |
| `menu-inventory.csv` | **42 / 42** existing menu destinations traced to routes | 13 client main leaves + 22 Settings + 7 platform; IDs `GUIDE-MENU-001`–`042`; **Play not implemented** |
| `screen-dispositions.csv` | **84 / 84** route nodes given a proposed disposition | 42 menu Play, 32 secondary contextual workflows, 6 auth/invitation contextual help, 3 structural layouts, 1 fallback. Status is source-mapped, not approved/executed |
| `workflow-candidates.csv` | **122** draft journey candidates | 120 current-system-oriented, 2 explicitly future (bulk process import and Google sign-in). All paths and variants require further semantic reconciliation |
| `role-access-baseline.csv` | **117** source role/area grant combinations | 9 role templates × 13 areas in the current sample; actual access is additionally membership, scope, classification, assignment and state |
| `permission-scenarios.csv` | **86** candidate policy cases | 9 roles × 9 representative cases + 5 additional boundary cases; not exhaustive and **not executed** |
| `menu-role-eligibility.csv` | **378** source role × menu combinations | 9 role templates × 42 menus: 199 provisionally eligible, 179 ineligible from that role alone; no runtime proof; the actual membership/module/process/classification checks remain binding |
| `onboarding-requirements.csv` | **8** draft setup requirements | Real-data completion predicate and applicability proposed; not yet formally approved or implemented |
| `dependencies-and-exclusions.csv` | **19** documented dependencies/exclusions/blockers | Includes new open frontend Business-space PR #35, auth, D12 and backend sync |
| `semantic-command-anchors*.csv` | **71** source-confirmed command occurrences | 37 audit/document/review/action + 34 QMS/process/risks/evidence/complaint/users; mapped to candidate flows, exact source line confirmed, runtime still unverified |
| `critical-branch-guards.csv` | **29** source-line-confirmed guards | All 29 actual lines matched pinned source; state/role behavior still requires live negative tests |
| `tab-surfaces.csv` | **27** contextual tab targets | Scanned 10 selected module screens; not a comprehensive dynamic surface inventory |
| `reconciliation-findings.md` | **8** material findings | Adds omitted secondary journey scope, pending PR #35 and explicit G1 blockers |

**Capture method:** Retrieved the pinned Git tree; enumerated navigation, Settings, platform and `App.tsx` routes. Read 119 TSX sources on the same commit and captured source lines containing JSX link/button/input/tab/action components or `onClick`/`onChange`/`onSelect`/`onSubmit` and related event-handler attributes. Case-count observations are **heuristics** and may miss wrapped controls or count non-action inputs. Sources are linked by path and line. Current JSX child branches, backend state handlers and transitive component props still require semantic review; neither these counts nor the historical backend source mapping prove complete current user journeys.

## 2. G1 acceptance sub-gates, with honest verdicts

| G1 check | Required | Current evidence | Verdict |
|---|---|---|---|
| G1.1 Version baseline | Exact frontend/backend source pins and open PR impacts | Both SHAs and named open dependencies captured | **Source snapshot recorded** |
| G1.2 Menu coverage | 100% of current eligible menu leaves listed, with guide IDs and routed targets | **42/42** matched; all Play controls specified as requirements only | **Source inventory PASS** |
| G1.3 Route disposition | All declared routes and variants classified | **84/84** source routes classified; dynamic tab/sheet/role variants still require review | **Source route PASS; screen completeness NOT VERIFIED** |
| G1.4 Action mapping | All user actions, decisions, validations and transitions mapped to workflow guides | 1,506 **candidate** occurrences; 0 independently reviewed against business outcomes | **NOT VERIFIED** |
| G1.5 Workflow mapping | 100% current journeys/branches reconciled to action, roles, states and completion | 120 current-oriented candidates and 2 future exclusions; end-to-end semantics not reviewed across source + runtime | **NOT VERIFIED** |
| G1.6 Role/state/exclusion mapping | All effective permission/process/classification/lifecycle cases plus exclusion decisions | 117 grant cells, 378 menu/role candidate combinations and 86 planned policy cases; runtime effective-role proof missing | **NOT VERIFIED** |
| G1.7 Onboarding mapping | Each required/optional/N/A predicate and invalidation agreed | Eight proposed requirements; owner approval of details pending | **NOT VERIFIED** |
| G1.8 Freeze and approval | Zero unassigned/excluded-without-reason cases; owner accepts complete denominators on target commit | Static inventories proposed; UI-browser reconciliation, stable control-to-flow links and owner sign-off pending | **NOT VERIFIED** |

**G1 verdict: NOT PASSED.** See [continued semantic source reconciliation](./reconciliation-findings.md). The exact 42 menu entrypoints and static route count are established; they are not the full denominator for live page variants, real workflow paths, or meaningful user actions. It would be false to claim 100% coverage merely because all scanned files have candidate control observations.

## 3. Required reconciliation before declaring Phase 1 complete

1. **Semantic action review:** Reconcile each relevant `OBS-*` source observation to stable business action IDs, conditions, disabled/hidden states, current UI labels, modal/tab navigation, validation, specific FLOW ID and terminal state. Mark pure presentation/no-op controls explicitly (with rationale). Address seven TSX sources with no matched controls and shared handlers in `lib`.
2. **Full runtime screen audit:** Visit all **42** menu destinations and all applicable secondary routes/tabs/sheets/dialogs under actual permitted roles, desktop/mobile and target organization state. Fix mismatches between source mapping and rendered/authorized controls; include link/deep-link and collapsed-nav behavior.
3. **Workflow and state enumeration:** Reconcile 126 current-oriented FLOW candidates with actual audit/checklist/questionnaire/report, document/review, management-review, KPI, risk, evidence, CA, complaints and Settings workflows. Verify accepted, rejected, reworked, expired, locked and concurrent states from source, backend stage amendments and runtime. Add missing journeys and record removed ones.
4. **Complete authorization variants:** Expand beyond the initial 86 policy cases using real role grants, process membership/ownership, named classification access, lifecycle assignment and platform/client boundary; approve exclusion rationale and test conditions.
5. **Onboarding acceptance:** Review eight setup predicates for correctness, requiredness, not-applicable options, authoritative server state, revocation and changes after initial completion. Keep certification/readiness separate.
6. **Unmerged-PR reconciliation:** Resolve pending frontend PR #33 (plan) and #14 (guidelines); review backend PR #9 and #3. This branch is stacked on #33, not merged to main.
7. **Owner approval:** Freeze accepted guide, route, workflow, control, role and onboarding denominators with signed-off changed-source SHA; G1 Pass requires all above evidence, not just the artifacts created here.

No workflow/UI feature may be described as implemented based on Phase 1 documentation. On completion of G1, Phase 2 specifies Play position, target selectors, UX copy and recovery behaviors. G3 later implements Play; G4 onboarding; G5 full guides; G6 final acceptance.

## 4. Backend impact and synchronization

**This Phase 1 PR: No backend runtime impact.** It changes documentation/inventory only, not database schemas/relationships, APIs, workflow enforcement, permissions, security, integrations, events, or tests. No backend PR is needed for these static files.

**Future implementation: Backend-impacting.** Per-person/per-org progress, guide versions, authoritative completion predicates, state-change events, permissions, client isolation, classification and telemetry need a separate linked backend architecture/traceability change-management PR, then appropriate stage synchronization and approval. Audit/Process/Management Review architecture updates are still pending in backend PR #9. Do not auto-implement migrations, cloud resources or new auth.

## 5. Test boundaries and source-of-truth rules

This is **planning/source discovery only**. There is no Play button, no onboarding engine, no guide content rendered, and no runtime guide completion to test. Source reads and GitHub metadata checks are real evidence; current CI results (if reported) belong to this docs PR only. No proof exists yet for guide target accuracy, interactive permissions, browser states, screenshot checklists, or the C01–C14 final metrics.

Follow `AGENTS.md`, `app/UI-GUIDELINES.md` and normative plan v3. No menu/tokens/font/card redesign, direct push to main, role/classification weakening, direct file upload, merge or deployment. Update `plan/progress.md` accurately in the last commit **after checks**. Do not mark G1 complete without the owner-reviewed denominator and semantic proof.
