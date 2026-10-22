# G1 coverage reconciliation — current baseline

**22 Oct 2026. G1 IN PROGRESS / NOT APPROVED.** This report supersedes the earlier current-main counts after frontend PRs #42 and #43 merged.

## Baseline and scope

- Frontend main: `a0559d64a33181ec47f5e41d3ba8347f7fed0067`.
- Backend main: `b6f738f3258d84bf76662a2debd6361c0dda9a0b`.
- Frontend PRs #33, #34, #35 and #40 remain open drafts.
- Backend PRs #9 and #3 remain open drafts.
- Management Review walkthrough coverage is owner-excluded on 22 Oct 2026 while that feature is finalized. Its raw evidence remains in every applicable register.

## Reassessment result

| Register | Current count | Meaning |
|---|---:|---|
| Menu | 43 | Source-mapped destinations, including new Procedures and retained excluded Management Review |
| Routes | 88 | Declared React Route nodes, including organization/audit print, Procedures and audit-plan detail additions |
| Screen/surface observations | 263 | 88 route rows plus 175 contextual AST surfaces; not a deduplicated reachable denominator |
| Current source manifest | 190 | Exact current `app/src` TS/TSX Git blobs |
| Current AST observations | 2,628 | 1,324 target tags + 1,304 handlers across 123 UI TSX files |
| Control sites | 1,569 | Stable JSX sites; not yet unique business actions |
| Workflow candidates | 141 | Seven current-main candidates added; ten Management Review candidates explicitly excluded |
| Role/menu candidates | 387 | Nine role templates × 43 menu leaves; source prediction only |
| Planned policy scenarios | 86 | Candidate cases; do not claim 86 runtime passes |
| Onboarding requirements | 8 | Proposed predicates awaiting owner acceptance |

The reproducible reconciler passed a write/read-back cycle. It found 133/159 historical semantic anchors at their recorded literal locations. The 26 changed anchors are explicit reassessment work, not missing data hidden by the report.

## Gate verdict

| G1 criterion | Verdict | Blocking evidence |
|---|---|---|
| Version baseline | **PASS for source snapshot** | Recheck if main or an approved concurrent PR changes |
| Menu enumeration | **PASS for source inventory** | Revised-baseline browser run pending |
| Screens and variants | **PARTIAL** | 263 raw observations need reachability, deduplication and role/state dispositions |
| Actions and transitions | **PARTIAL** | 1,569 control sites need unique semantic dispositions and outcome proof |
| Workflows and branches | **PARTIAL** | 141 candidates need current behavior and alternate-path reconciliation; Management Review excluded |
| Authorization | **PARTIAL** | Matrices are source predictions; representative runtime cases do not prove every permutation |
| Onboarding | **PROPOSED** | Owner acceptance and authoritative state design pending |
| Frozen denominator/acceptance | **PENDING** | Exact eligible S/A denominators, final tests, and owner acceptance remain |

**G1 is not passed.** The approved Management Review exclusion narrows guide authoring only; it does not erase evidence or permit an artificial 100% denominator.

## Verification boundary

The companion PR #40 contains current UI source, route, policy, and responsive evidence tests. It does not contain a walkthrough engine, so it cannot prove guide targeting, replay, completion, persistence, or workflow truth. Before either PR is described as verified, run typecheck, production build, the complete Playwright suite with two workers, inspect the required screenshots, then run GitHub Check on the final heads. The `plan/progress.md` entry must be the last content commit.

These documentation and test changes have no backend runtime impact. Persistent walkthrough and onboarding behavior remains a future backend architecture change requiring separate review.
