# ADR-045: Action-level permissions, settings per role, role limits, Deleted items

Date: 29 October 2026 · Status: Accepted (Danica approved the design and the merge)

## Context
Roles had one level per menu part plus two switches. About 55 places in the code decided behaviour by role name (consultant, guest auditor, top management, quality manager, viewer), so custom roles never got those rules and nothing could be changed. Top management couldn't start a management review. Settings were split into fixed "admin" and "quality" groups, anyone who managed settings could make an Administrator, and nothing deleted could be restored.

## Decision
1. **Actions per part** (`lib/permissions.ts`). Each part keeps its level; each level ticks a set of actions; a role can switch single actions on or off (shown as Custom). Rules that were tied to role names are actions: Management Review start, prepare, reviewer, sign off, amend, close actions, delete; readiness see, list and confirm; Documents review, approve, publish, archive, return to use, classify, share, upload, delete, restore, delete for good, route override, "Quality manager" rule, decide access requests, Confidential and Highly confidential; audits see all, plan, manage and release, templates; work can be assigned; remarks as the consultant, write and resolve, alerts. Built-in roles keep today's behaviour through defaults; the only change is that Top management can start and prepare reviews.
2. **Role-name checks replaced** by `allows(role, action)` and `peopleAllowed(...)` throughout (reviewers, sign-off, approval rule, default verifier and preparer, consultant limits, guest-auditor scope, assignable people, remark alerts, readiness confirmation, document review and approval).
3. **Settings per role**: a role can list the settings pages it opens; without a list the old defaults apply.
4. **Role limits**: nobody can give, or change, a role with more access in any part than their own; a role can be set to give no roles at all.
5. **Deleted**: removed records (documents, evidence, risks, nonconformities, objectives, policies, audit plans, reviews and more) and files deleted in Settings › Storage are kept 30 days in Storage › Deleted with Restore and Delete for good, then removed. Archived documents can be returned to use with a reason. Workspace restores stay with ThryveMS operations (D14).

## Backend impact (Pending)
- `role_actions` (role, action, allowed), `role_settings_pages`, `roles.assign_up_to`; the API checks actions, not role names.
- `deleted_items` with a nightly purge after 30 days; file objects kept until purged; restore and purge events in the business log.
- Return to use writes a document event.
