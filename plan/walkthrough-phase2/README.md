# Walkthrough Phase 2 — interaction and content design

**Date:** 22 Oct 2026  
**Baseline:** frontend `a0559d64a33181ec47f5e41d3ba8347f7fed0067`, Phase 1 reassessment `fa1461f`  
**Status:** **G2 IN PROGRESS / NOT APPROVED.**

This package specifies the shared walkthrough interaction, content contract, recovery behavior, responsive/accessibility behavior, and all 43 current menu destinations. Management Review is retained as an owner-approved excluded row and receives no guide script while the feature is finalized.

G2 cannot pass until the owner approves the guide copy and targets against a frozen G1 inventory. Starting this work does not waive that gate or authorize engine implementation.

## Artifacts

- `interaction-spec.md`: shared Play placement, state machine, security, accessibility and target rules.
- `guide-designs.csv`: one versioned disposition for every current menu leaf.
- `recovery-matrix.csv`: required navigation, missing-target, permission and lifecycle behavior.
- `ui-guideline-checklist.md`: design review checklist tied to existing components and tokens.
- `generate-guide-designs.mjs`: deterministic generation of the menu-level design register from the Phase 1 menu inventory.

## G2 acceptance status

| Requirement | Current state |
|---|---|
| 43 current menu leaves have a design disposition | Generated; 42 guide candidates and one approved Management Review exclusion |
| Exact Play label and placement | Specified |
| Start/restart/back/next/skip/close/resume | Specified |
| Target resolution and missing-target behavior | Specified |
| Authorization and privacy reevaluation | Specified |
| Responsive, keyboard, focus and reduced-motion behavior | Specified |
| Per-page reviewed copy and exact step targets | Candidate copy/targets generated; owner review pending |
| G1 frozen denominator dependency | Not satisfied |
| Owner approval | Pending |

No application UI or backend behavior is changed by this design branch.
