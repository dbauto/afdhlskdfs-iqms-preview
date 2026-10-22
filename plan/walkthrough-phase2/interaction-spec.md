# Shared walkthrough interaction specification

## Entry control

Every permitted menu page except the approved Management Review exclusion exposes an existing secondary/outline button in the page-header action area. Its visible and accessible label is **Play walkthrough**. At compact widths the existing icon-button form may be used with the same accessible name and a tooltip. It never becomes a sidebar destination and never displaces the page’s single primary action.

Activation always starts the current page guide at its first currently eligible step. If a prior run exists, the opening panel offers **Start again** and **Resume where I left off**. Starting again clears guide progress only; it never changes business records or onboarding completion.

## Guide controls

The anchored guide surface uses existing popover/sheet/dialog primitives and tokens. Controls are **Back**, **Next**, **Skip step** when the step is explicitly safe to skip, **Close**, and **Start again**. The final passive step uses **Finish walkthrough**. A business action step never becomes complete merely because Next was pressed.

Next is enabled only when the step is explanatory or its declared observation predicate is true. The guide never invokes Submit, Approve, Publish, Issue, Sign off, Delete, role changes, or other business transitions. Users perform those actions through the existing UI after reading the guidance.

## Target contract

Each step declares:

- a stable guide/step ID and content version;
- route pattern and required record context;
- accessible target contract, preferring role + exact accessible name;
- an optional stable application-owned `data-walkthrough` key for ambiguous repeated controls;
- eligibility predicates for membership, area permission, process scope, classification, assignment, lifecycle and workflow state;
- explanatory copy, expected user outcome and observation predicate;
- missing, disabled, hidden, stale-record and denied recovery text;
- whether navigation or a new tab is expected.

CSS position, generated class names and DOM ancestry are not stable target identities. A target must resolve to exactly one visible authorized element. Zero or multiple matches enter recovery and do not silently advance.

## Authorization and privacy

Effective authorization is reevaluated before opening a guide, resolving every target, navigating, resuming, or accepting an observed transition. Guide definitions contain no confidential record titles, values, counts or hidden-role instructions. Copy may describe a control category but receives record text only from the already-authorized rendered page.

A permission, membership, assignment, process-scope, classification, deactivation or expiry change closes the active target and shows: **Your access changed. This walkthrough can’t continue on this record.** The user may close or return to the permitted page. The guide never deep-links around a denial.

Platform and client guides use separate registries and authority checks. External invitation guides reveal only the assigned questionnaire context.

## Navigation and persistence

Same-tab navigation resumes only when the expected route and record identity match. For existing safe new-tab record links, the guide binds to the newly opened authorized tab and leaves the source tab unchanged. It never attaches to the first arbitrary tab.

Refresh and browser restart may restore the last eligible step. Sign-out stores no sensitive rendered copy. Resume data contains organization ID, person ID, guide ID/version, step ID and timestamps only. A guide-version change runs the declared migration or restarts with an explanation; it never marks new steps complete automatically.

## Missing and changing targets

- Loading: wait for the declared ready landmark, then resolve.
- Collapsed section or inactive tab: ask the user to open it, or use an explicitly safe UI-only reveal action.
- Disabled target: explain the current prerequisite; do not click.
- Missing target in current state: show the declared alternate branch or safe skip.
- Source/version mismatch or ambiguous target: stop and offer **Close** and **Start again**; record a redacted diagnostic.
- Deleted/inaccessible record: stop and return to the permitted list page.
- Failed navigation/network: retain the last confirmed step and offer **Try again**.

## Accessibility and responsive behavior

Opening moves focus to the guide heading; closing returns focus to Play or the last triggering control when it still exists. Focus remains within a modal sheet, while an anchored nonmodal popover preserves direct access to the highlighted control. Escape closes after an accessible confirmation when unsaved guide-only choices exist. All controls are keyboard reachable, have visible focus, and meet existing target sizes.

At 390 and 768 pixels the guide uses an existing bottom/side Sheet when an anchored popover would cover the target. At 1280, 1440 and 1920 pixels it may use an anchored popover when collision checks pass. It must not create horizontal page overflow. Dark/light themes use existing semantic tokens. Reduced motion disables spotlight and position animations; target movement never scroll-janks the page.

## Content style

Titles name the task in plain language. Body copy explains what the current control does, who can use it, what must already be true, and what successful application state looks like. Copy does not claim ISO certification, legal compliance, automatic approval, automatic persistence, or backend synchronization.
