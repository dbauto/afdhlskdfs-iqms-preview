# Walkthrough Phase 1 — refreshed inventory and G1 review

**Reassessment date:** 22 Oct 2026 (Asia/Irkutsk)

**Accepted frontend baseline:** `a0559d64a33181ec47f5e41d3ba8347f7fed0067`

**Backend architecture baseline:** `b6f738f3258d84bf76662a2debd6361c0dda9a0b`
**Status:** **G1 IN PROGRESS / NOT PASSED.** No walkthrough engine, Play control, onboarding UI, or guide content is implemented by this branch.

The current baseline was reassessed after merged frontend PRs #42 and #43 changed Organization & Scope, Processes, Audits, Procedures, and Management Review. The earlier 21 Oct counts are historical and must not be used as the current denominator.

## Owner-approved scope decision

Management Review is excluded from walkthrough coverage for this iteration because it is still being finalized. This is one written, owner-approved exclusion dated 22 Oct 2026. It is not removed from the raw inventory: its menu destination, routes, source controls, contextual surfaces, policy rows, and ten candidate workflows remain recorded. Inclusion requires a fresh reassessment when the feature is finalized.

## Current M/S/W/A/R/O/T scorecard

| Dimension | Current evidence | Verified or excluded | Still unverified |
|---|---:|---:|---:|
| M — menu leaves | 43 | 43 source-mapped; Management Review has an approved walkthrough exclusion | Browser audit of the revised 43-menu baseline |
| S — screens/variants | 263 raw observations = 88 route nodes + 175 contextual source surfaces | Management Review items retained and marked excluded | Exact reachable, deduplicated eligible denominator; role/state variants |
| W — workflows | 141 candidates | 10 Management Review candidates explicitly excluded | Semantic confirmation of the remaining candidates and alternate paths |
| A — actions/transitions | 2,628 lexical observations at 1,569 control sites | Source path, line, handler/visibility context, source blob, route and candidate-flow evidence recorded | Exact unique eligible action denominator and outcome verification |
| R — role/policy variants | 117 role-area cells; 387 role-menu candidates; 86 planned policy scenarios | Source matrices recorded; Management Review rows retained as excluded | Full effective policy, scope, classification, assignment and lifecycle runtime proof |
| O — onboarding requirements | 8 candidates | Completion/applicability/invalidation/accountability proposals recorded | Owner acceptance and authoritative backend predicates |
| T — verification cases | Runtime branch tests are being refreshed | Reconciler read-only integrity pass on current baseline | Final typecheck, build, two-worker E2E, screenshot review and GitHub Check |

These counts do not imply 100% walkthrough coverage. AST observations can duplicate a rendered action, represent internal callbacks, or omit behavior implemented outside JSX. `S` and `A` remain raw observation counts until semantic reconciliation freezes their eligible denominators.

## Reproducible source evidence

`reconcile.mjs` now regenerates the current-head evidence instead of trusting the old fixed counts:

```text
node plan/walkthrough-phase1/reconcile.mjs --source-root ../walkthrough-runtime --source-ref origin/main --write
node plan/walkthrough-phase1/reconcile.mjs --source-root ../walkthrough-runtime --source-ref origin/main
```

The refreshed run records:

- 190 current `app/src` TypeScript/TSX blobs with exact Git blob hashes;
- 123 page/application-component TSX files;
- 1,324 target-tag observations and 1,304 `on*` handler observations, including 90 callbacks outside the original allowlist;
- 1,569 stable control sites and 175 contextual source surfaces;
- 43 menu leaves, 88 Route nodes, 141 workflow candidates, and 387 role/menu candidates;
- 133 of 159 historical semantic anchors still matching literally. The 26 nonmatches require semantic relocation; they are not silently accepted.

The historical 1,506-observation and crosswalk datasets remain for provenance. The three `current-ast-crosswalk` files are the refreshed current-baseline census and use stable content-derived IDs.

## Exact remaining G1 work

1. Reconcile the 1,569 control sites into unique user actions, transitions, duplicates, presentation-only controls, and exclusions, including authorization, state, validation, outcomes, and recovery.
2. Deduplicate and runtime-check the 263 screen/surface observations, including sheets, dialogs, tabs, empty/error states, record variants, new-tab behavior, and external invitations.
3. Reconcile 141 workflow candidates against current behavior. Keep all Management Review items visible but excluded; do not author its guide yet.
4. Relocate or retire the 26 stale historical anchors introduced by current-source changes.
5. Execute representative positive and negative policy cases for all nine role templates without extrapolating those cases to the full 387-row matrix.
6. Obtain owner acceptance of onboarding predicates and the final frozen M/S/W/A/R/O/T denominators.

## Backend impact

The inventory and companion tests have **no backend runtime impact**: they do not change schemas, relationships, APIs, workflow enforcement, permissions, security, integrations, or events. Backend PRs #9 and #3 remain open proposals. Future persistent guide progress, authoritative onboarding completion, versioning, invalidation, telemetry, and concurrency require a separate linked backend change-management PR before implementation.

PR #35 remains open and unmerged, so Business-space behavior is tracked as pending and is not part of the accepted current-main denominator. PRs #34 and #40 remain separate and draft. No merge or deployment is authorized.
