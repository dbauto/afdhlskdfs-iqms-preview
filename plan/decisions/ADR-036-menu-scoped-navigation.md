# ADR-036: Keep same-menu navigation in the current tab

24 October 2026. Product owner decision (supersedes the blanket new-tab direction in ADR-027).

## Decision

Opening a subpage, record, checklist, form, report, review, or another linked record in the **same menu section** stays in the current browser tab. For example, Documents → document detail, Audits → an audit's Results, or Settings → another settings page. Linked records that take someone to a **different section** open in a separate browser tab; for example, Documents → linked Evidence.

The shared ContentLink and RecordLink implementations use the same route-section comparison. Structural sidebar links and breadcrumbs remain same-tab. Explicit targets, including secure external HTTPS links, are respected. Cross-section links have a visible/accessible new-tab cue and `noopener noreferrer` protection. The existing user permission, process scope and classification checks remain mandatory in the destination; link behavior does not change rights or business state.

## Related interface decisions

Overview's Evidence by ISO 9001 clause group has a keyboard-accessible collapse/expand control and starts collapsed. Native select inputs keep their semantic form controls but offer a keyword-search chooser; reusable people, process, clause, evidence and record multiselects offer substring search. No new menu items or design tokens.

## Backend impact and rollout

**No backend impact** to database schemas, relationships, APIs, workflows, authorization, security, integrations, events or backend tests. These are frontend presentation and navigation changes. The normative plan §20 is updated; ADR-027 remains historical. No backend functionality should be implemented for this change.

The static Pages preview must be rebuilt and verified as a separate reviewed PR artifact. Merging source-only changes without the generated Pages HTML does not publish the new interface. PR #52 addresses the preview regeneration gap observed after PR #51; deployment still requires owner approval.
