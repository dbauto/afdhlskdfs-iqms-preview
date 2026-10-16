# ADR-027: Keep the working page open when following content links

16 October 2026. Danica requested consistent new-tab behavior across pages, using Overview → Documents as the example.

## Decision

Cross-page links in content open another browser tab. This includes Overview figures and attention/upcoming cards, search results, register titles and Open menu items, checklists/questionnaires, audit Results/Report/findings, review actions, linked records/evidence, notifications and legal references. They are real router-generated anchors, preserving hash/base-path routes and native keyboard, middle-click, context-menu and browser behavior. `noopener noreferrer` protects the source tab. An accessible description and title identify the new-tab behavior without changing control names or the design system. Existing record/external-link indicators are retained; related record links consistently use them.

Structural navigation (sidebar, settings/platform sections and breadcrumbs), authentication/recovery, same-page filters/anchors and completion of an action keep their existing navigation behavior. Saving, approving, submitting, publishing or deleting remains a command, never a side effect of following a link. A create/revision command can continue into its editor in its current tab. A notification is marked read in its source inbox while its record opens separately.

The shared ContentLink component defines this policy rather than intercepting clicks globally or using programmatic window.open. Row menus expose navigation as anchors too. All content imports use that policy; existing RecordLink references open new tabs consistently. Destination pages apply the same permissions, process scope and classification checks. Links do not grant access.

## Preview persistence correction

New tabs exposed a pre-existing race in browser-local preview synchronization: an older tab could reserialize an imported snapshot and write it back while another tab was typing. Local commands now persist their computed state synchronously. Storage listeners ignore queued values that have already been superseded and import the current peer snapshot without persisting it again. React state and the command reference receive the same state. This preserves sequential edits across opened tabs and stops feedback from older snapshots.

Unsaved component text stays in the source tab. Saved records remain visible in other open tabs through the existing browser-local store. This is not multi-user backend persistence or a transactional concurrency guarantee; genuinely simultaneous edits still require the server/version-conflict contracts in the normative plan.

## Validation

Tests follow actual popup tabs and verify that the opener URL and unfinished inputs remain intact, the destination has no window.opener, links carry safe attributes, notification read state updates, restricted routes stay unavailable, and rapid typing and independent form edits survive reload with other tabs open. Existing business-flow tests follow the opened tabs instead of assuming content links replace their current page. Generated-preview checks repeat Overview → Reviews and saved audit/back links on disk and under the Pages subpath.
