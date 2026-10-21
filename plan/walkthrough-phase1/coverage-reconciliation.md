# G1 inventory reconciliation and acceptance evidence

**21 Oct 2026. Status: G1 IN PROGRESS — NOT APPROVED.** Companion current-UI browser proof: [PR #40](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/40). This is **Phase 1 planning only**, not a working Play walkthrough.

## 1. Version boundary — checked against GitHub trees

- Frontend current main: `1ba4b704f09163fd8366facf339b6fce2d4df8b5`.
- Original Phase 1 source pin: `96a199fee066cb4df041b2ad5dc27f246934f38f`.
- Backend architecture main: `b6f738f3258d84bf76662a2debd6361c0dda9a0b` (further backend revisions pending).
- [Current source manifest](./source-manifest-current.csv): **185 / 185** TS/TSX files retained between baseline and current main, **184 unchanged, 1 changed** (`app/src/pages/overview.tsx`). New stylesheet motion rules also exist in `app/src/index.css`, which is **not TS/TSX** and is covered in [Overview delta](./overview-baseline-revision.md).
- GitHub commit comparison confirms other source TS/TSX files in current main are unchanged. Thus older line references for those TS/TSX files remain valid. **The updated Overview has a separate 32-row assertion inventory, not a silently recycled old source-line map.**
- Future PR [#35](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/35) proposes additional Business-space routes and role rules, but is **unmerged**, so it is a tracked change request, not silently included as live behavior.

## 2. Inventory counters — exact meaning

| Register / proof | Captured | Verified status |
|---|---:|---|
| Menu inventory | 42 = 13 client + 22 Settings + 7 platform | 42 route identities source mapped. Current-UI 42-route browser audit in companion PR #40 (see its GitHub Check); prototype platform authorization must not be mistaken for production permission proof |
| Route inventory | 84 route nodes | Source extracted; includes 42 menu pages, secondary, index/layout/fallback. Full dynamic content/modal/role coverage pending |
| Current TS/TSX manifest | 185 | SHA comparison verified, 1 Overview file changed |
| Original JSX/control observations | 1,506 | Lexical **candidates**, not 1,506 validated distinct business actions; see 6 crosswalk files |
| Direct flow candidate mappings | 1,030 / 1,506 | Exact source path or inferred module match; **not** individually verified outcome/permission |
| Shared/contextual dispositions | 476 / 1,506 | All explicitly identified in `shared-control-dispositions-01.csv` / `-02.csv`, not silently dropped. Each needs its calling workflow and actor checked before guide content is accepted |
| Candidate workflows | 134 | 131 current-oriented and 3 future/pending. **134 / 134 valid source paths** after fixing malformed FLOW-127/128/129 rows. Business paths, outcomes and alternate branches not exhaustively runtime proven |
| Source-traced command sites | 71 | 71/71 line anchors valid at pinned source |
| Source-traced safety / business guards | 29 | 29/29 line anchors valid at pinned source |
| Overview acceptance cases | 32 | 32/32 anchors match merged current code. *These are not 32/32 executed browser scenarios* |
| Contextual tab targets | 27 | 27/27 source anchors valid in the sampled screens, not exhaustive DOM targets |
| Role × area source matrix | 117 | 9 role templates × 13 areas extracted, but all effective policy combinations need runtime verification |
| Role × menu candidate matrix | 378 | 9 role templates × 42 menu destinations documented; only a subset executable as active sample users |
| Permission scenarios | 86 | Planned cases, not 86 executed negative-path tests |
| Onboarding requirements | 8 | Proposed predicates; owner approval and authoritative backend-state design pending |
| Dependencies and exceptions | 20 | Includes merged Overview PRs and pending Business-space and backend updates |

**Source classification coverage (not verification):** `1,030 + 476 = 1,506`; neither bucket can count as semantically verified controls merely because it is assigned to a guide or shared component. Crosswalk statuses explicitly state **outcome/visibility unverified**.

## 3. Observed current-UI browser checks (separate PR #40)

Companion tests on current main contain:
- Navigability of all **13 client + 22 Settings + 7 platform** menu leaves by eligible prototype context;
- Deep-link denial in Settings for contributor, plus quality-vs-admin settings boundaries;
- Eight active sample profiles across 13 client leaves (**104 role-route visits**, including expected Management Review denials);
- Current Overview role visibility, static gauge legend, evidence-by-clause appearance, reduced-motion, and the permitted evidence link;
- Screenshots of Overview for quality and narrower contributor roles in both light/dark at 1440×900, 1280×650, 768×1024, 390×844 (16 files under GitHub Check's `test-results` artifact);
- Browser horizontal overflow assertions for those screenshots.

**Important:** Current prototype platform pages do not yet constitute a secure platform-login test. The stricter account/authority separation is proposed in PR #35 and must be reflected after merge. The walkthrough Play control is deliberately **not implemented**; no false replay, completion, role-conditioned guide visibility, or workflow navigation claims can be made. Check results and screenshots are test evidence only on their **actual tested commit**.

## 4. G1 gate audit

| G1 criterion | Verdict | Evidence needed to close |
|---|---|---|
| G1.1 Version/PR baseline | **Source VERIFIED** | Approved treatment of pending PR #35 and backend architecture reconciliation |
| G1.2 Menu source coverage | **42/42 source VERIFIED** | Current browser run verifies routes, but future menu drift requires reconciliation |
| G1.3 All current screens/variants classified | **PARTIAL** | Tab/sheet/dialog and role/state variants of remaining record/detail routes need semantic signoff |
| G1.4 All real actions and transitions mapped | **PARTIAL** | 1,506 lexical candidates are classified, but exact action meanings, disabled states, side effects and owner-approved exclusions still require review |
| G1.5 All workflows/branches fully reconciled | **PARTIAL** | 134 valid source references, high-risk anchors checked; complete branch/readiness/action mapping and backend PR #9 reconciliation pending |
| G1.6 Role, process, classification variants | **PARTIAL** | Current UI route tests cover eight active roles and Settings; cannot extrapolate to all 378 or production tenant isolation |
| G1.7 Onboarding requirements | **PROPOSED** | Required/optional/N/A and authoritative completion predicates need owner approval and eventual backend design |
| G1.8 Frozen denominator and owner signoff | **PENDING** | Confirm 42 current menu baseline, 134 candidate journeys and role/exception decisions; update for any merged PR #35 |

**Final G1 verdict: NOT PASSED.** The quantified inventory is materially improved, but the metric contract explicitly disallows claiming a complete gate with unknown dynamic branches or unapproved exclusions. Do not auto-complete G1, start Phase 2 or merge the PR.

## 5. Backend impact

**Current changes:** G1 CSV/Markdown source analysis and companion frontend browser tests; **no backend runtime impact** on database schema/relations, APIs, workflows, auth/permission enforcement, security, integrations or events. Existing frontend tests are expanded in PR #40; backend tests are unchanged. Under the project rules, no backend PR is required for these documentation/test-only changes.

**Future implementation:** Guide progress, authoritative onboarding checks, versioning, tenant/process and classification filtering, authorization, telemetry, event invalidation and concurrency are **backend-impacting**. Open backend PR #9 and #3 are still pending; future guide design needs a linked change-management PR and architecture/traceability approval before calling synchronization complete.

## 6. Finish criteria

G1 requires an accepted and frozen *current* inventory, with all eligible controls and business state paths either semantically proven or explicitly approved out of scope, verified access cases, source pin, browser evidence and owner approval. **Do not downgrade these requirements for a numerical 100% label.**
