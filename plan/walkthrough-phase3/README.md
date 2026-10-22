# Walkthrough Phase 3 — reusable engine

Date: 22 October 2026  
Implementation version: `1.0.0`  
Stage 2 dependency: PR #46  
Stage 3 implementation: PR #48

## Delivered contract

The shared walkthrough engine is implemented in `app/src/components/app/walkthrough.tsx`, with its versioned guide registry in `app/src/lib/walkthroughs.ts`.

- The existing `PageHeader` and `PlatformHeader` action areas render one shared **Play walkthrough** control.
- The registry contains the 42 approved menu routes from the Phase 2 guide-design register.
- `/management-review` has no registered guide and therefore no Play control. This is the owner-directed temporary exclusion while Management Review is finalized.
- The guide panel supports resume, restart, Back, Next, Skip, Finish, Close, and Escape.
- Progress is scoped by current user, guide ID, and guide version. The preview stores only step and status metadata in browser-local storage.
- Each step resolves a currently visible target. When no target exists in the current view, the panel gives a safe recovery message and allows the user to continue.
- The current route and active-user status are re-evaluated while the guide runs. Existing route/module/role guards remain authoritative because the Play control is injected only into the header that the authorized page renders.
- Steps explain controls but do not click them or call the application store, so guide progress cannot complete a business workflow or mutate a business record.
- The guide is a non-modal responsive panel. The page target remains visible, the panel stays within compact viewports, focus enters the panel on open and returns to Play on close, and target scrolling respects reduced-motion preferences.

## Verification coverage

`app/e2e/walkthrough-engine.spec.ts` adds focused coverage for:

- Play availability on all 42 approved routes;
- Management Review exclusion;
- opening, target highlighting, Back, Next, and restart;
- isolation from the `thryvems.preview.v1` business-data snapshot;
- compact viewport containment;
- Escape dismissal and focus restoration.

Local production build and manual browser inspection passed. The full clean-environment typecheck, build, Playwright suite, and final GitHub Check are recorded in `plan/progress.md` after the substantive branch check completes.

## Backend impact

There is no backend runtime change in Stage 3. Browser-local progress is appropriate only for this frontend prototype. A production implementation still requires the pending backend architecture contract for organization/user-scoped guide versions, resumable progress, audit-safe telemetry, retention, and authorization enforcement. No production backend functionality is implied by this PR.

## Deferred scope

Stage 3 supplies the reusable engine and route integration. Page-specific walkthrough content and real workflow journeys remain G5 work. Guided organization onboarding remains G4 work. Management Review remains excluded until its product surface is finalized and re-inventoried.
