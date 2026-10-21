# Phase 1 revision — updated Overview walkthrough baseline

**Date:** 21 Oct 2026. **Status:** Source-based G1 alignment, not an implemented walkthrough. **Frontend main:** `1ba4b704f09163fd8366facf339b6fce2d4df8b5`; **Overview blob:** `1b0423b2d6783ea68ba274ab569b774b5fe9ca42`. Existing Phase 1 source manifest and 1,506 action observations refer to **older frontend main** `96a199fee066cb4df041b2ad5dc27f246934f38f`, and remain historical; this document is the explicit Overview delta. Do not claim the whole app was re-inventoried.

## 1. Merged source changes

| Merged PR | UI adjustment | G1 guidance impact |
|---|---|---|
| [#36](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/36) | Replaces old readiness bars/tiles with a semicircle SVG gauge and legend based on requirement status | Explain the **current** gauge, statuses, derived percent, and no-data treatment; remove old gauge/bar steps |
| [#38](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/38) | Full clause-name rows with horizontal current/partial/missing bars fill the Overview readiness card | Map inside-card clause rows, *not* old mini cards. For narrower users the existing standalone Evidence by ISO 9001 clause card remains |
| [#39](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/39) | Gauge sweep, count-up, staggered legend/clauses/bars; respects reduced-motion | Walkthrough must locate stable controls despite entry animation and must neither replay as a business state change nor require animations to finish as "completion" |

**Backend impact of those merged visual revisions:** **No backend impact identified** from the merged Overview/stylesheet diffs. Existing `state.requirements`, `clauseCoverage`, `settings.certification`, permissions, linked evidence, and routing are read; no new database table/relationship, API contract, persistence write, permission policy, event, security integration or backend test is introduced. **This G1 revision itself is documentation-only and has no backend impact.** Future guide progress/completion still requires separate backend change-management/architecture review, **Pending**.

## 2. Authoritative UI behavior to describe

| Surface | Current code / behavior | Guide rule |
|---|---|---|
| Overview entry | `PageHeader` with dynamic greeting, task/health explanation (`overview.tsx:49`) | Start from existing header with proposed **Play walkthrough** once implemented; do not invent a current button |
| Readiness visibility | `seesReadiness = ["consultant","quality","admin"].includes(role.id)` (`:36`), and card rendered conditionally (`:61`) | Never show readiness-specific steps to other roles; per-page Play still available for any role permitted Overview |
| Readiness requirement source | Requirement list excludes `Not applicable` (`:254`); Done/total generates percent (`:256–259`) | Percentage indicates **completed applicable requirements**, NOT evidence-by-clause coverage nor an ISO conformity score |
| Readiness status | Five SVG segments: Done, Ready to confirm, In progress, Overdue, To do (`:342–351`) | Explain that overdue is defined as due date before today for non-Done records; legend notes overdue is part of To do; avoid double counting legend counts |
| Gauge judgment | "Ready" if 100% Done; otherwise "Behind" if any overdue or less than 50% Done, else "On track" (`:288–291`, `:384–390`) | These are presentation labels, **not** certification judgments. Explain empty requirements without inventing a 0%-certified claim |
| Gauge legend/tooltip | Accessible `svg[role="img"]` includes percent/status counts (`:364`); legend is static (`:393–401`) | Do **not** ask users to click segments/legend. Screen readers must get complete status without watching animation |
| Clause evidence | `EvidenceByClause bare` is rendered only if `can("Evidence")` within the hero (`:295–300`); rows show clause/name, current/partial/missing proportions and fraction (`:219–238`) | Guide one row as an **informational indicator**, not a link; evidence data scoped through `visibleRecords` and `clauseCoverage` |
| Evidence fallback | When no readiness hero and Evidence permitted, a separate `EvidenceByClause` card with **Open evidence** link is shown (`:150`, `:239–246`) | Different guide branch for viewer/owner/auditor etc. with Evidence permission. If Evidence denied, omit clause-evidence steps |
| Audit dates | `milestones(settings.certification)` plus Today shown in a timeline; next date/body optionally accented; unavailable shown as "Not booked" (`:259–277`, `:302–315`) | Timeline is not interactive; instruct users to navigate through existing permitted pages, do not imply a timeline click |
| Prioritized readiness work | Up to 3 non-Done tasks sorted overdue first then earliest due date, with `/readiness?item=<id>` links (`:262–265`, `:316–331`) | **Do these next** is conditional and item links open the authorized readiness item. `readiness.tsx:137–145` consumes the query and opens the item sheet |
| Main navigation cards | Overdue items → My tasks; conditional Open nonconformities, Documents in review, Next internal audit (`:63–70`) | Guide only cards currently rendered for effective `can(area)`, not placeholders |
| My tasks / Coming up | User's work (task group/overdue) and upcoming authorized date links; empty states handled (`:74–118`) | Do not claim opening link completes the business task |
| Conditional lower panels | Consultant remarks conditional on consultant presence/open remarks; Key results gated by Objectives & KPIs; NC source chart gated by Corrective Action and open NCs (`:119–174`) | Dynamic branches, no "N hidden", and totals/counts from scoped current data |
| Entrance motion | `useCountUp` checks reduced-motion (`:406–422`); CSS `sweep`, `rise-in`, `grow-x-stagger` explicitly disabled under `prefers-reduced-motion: reduce` (`app/src/index.css:348–362`) | Play tour must wait for mounted/visible target or use focusable static ancestor; reduced-motion must remain immediately readable |

## 2A. Open wording discrepancy for G1 review

**Potential UI status-label mismatch (not changed in this documentation PR):** `ReadinessGauge` classifies **any** overdue non-Done requirement into the Overdue arc, including an In progress or Ready to confirm requirement (`overview.tsx:255`, `:347–350`). The legend nevertheless labels this bucket **"Overdue, part of to do"** (`:358`) while the separate **To do** count includes only records whose original status is To do (`:357`). For an overdue In progress requirement, that legend wording could imply the wrong status hierarchy. **Walkthrough copy must describe Overdue as an overdue condition across applicable non-Done statuses, not assume every overdue record has status To do.** Flag the existing legend wording for separate owner review; never silently fix the UI in G1.

## 3. Phase 1 guide classification

- **MENU-001 / GUIDE-MENU-001:** retains the same Overview route `/`; proposed on-demand Play control remains a *future* UI requirement, not currently present. No change to 13 client / 22 Settings / 7 platform **menu counts** based on these Overview PRs.
- **FLOW-001:** Update to interpret the new gauge, five statuses, clause evidence, dates, no data and role branches; a navigation explanation is complete only when instructional steps have been viewed, **not** when a real requirement or audit is completed.
- **FLOW-002:** Investigate a real visible issue using the gauge's **Open certification readiness** link or scoped dashboard metrics; no click behavior on SVG arcs or clause bars.
- **FLOW-003:** Open My tasks, Coming up and **Do these next** (when rendered), follow the permitted record link, preserve existing new-tab/navigation rules.
- **New FLOW-130–134:** Separately capture evidence-coverage interpretation, certification dates, status/zero-data interpretation, conditional role variant and prioritized requirement deep link (see `workflow-candidates.csv` and `overview-acceptance.csv`).
- **No page redraw:** Do not add a new menu item, alternate gauge, animated tour background, or invent a modal. When G2 designs the Play action, place it within existing `PageHeader` using approved secondary/quiet action and one-primary-button rule. Users may replay it any time; closing/replaying makes no business writes.

## 4. G1 acceptance checks added

[Overview-specific acceptance matrix](./overview-acceptance.csv) captures the role/data/motion/target variants and their exact source location. Passing this *documentation* check requires line-to-source traceability; **actual G1 remains blocked** on full app semantic control-to-flow mapping, live browser under real roles/states, owner-approved exclusion/denominator freeze, and pending PR #35's additional Business-space navigation scope.

**Source audit result:** This document and the candidate matrix are static. No overview Play implementation, no walkthrough browser execution, no new UI tests or screenshots. Regular repo Check passing must not be labeled walkthrough acceptance.

## 5. Versioned and testable source alignment

Phase 1's original 185-file manifest / 1,506 heuristic observations remain **pinned to the older 96a199… commit** for repeatable audits. This revision does **not** silently replace their SHA or line-number evidence with new UI line numbers. It is a targeted delta for Overview at merged main `1ba4b704…`. The **32/32** conditions in `overview-acceptance.csv` now match exact current source lines; none has passed a browser role/state walkthrough. An eventual full G1 baseline freeze must rescan any files changed since the old snapshot and reconcile pending PR #35, rather than presenting this targeted delta as a whole-app rescan.
