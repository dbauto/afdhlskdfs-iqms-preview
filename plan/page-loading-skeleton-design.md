# Page-specific skeleton loading states — design specification

Status: Design PR only. No loading behaviour is implemented by this document.

## Constraints
Follow `AGENTS.md`, `app/UI-GUIDELINES.md`, and the normative backend plan. The existing rendered page is the source of truth; do not reproduce generic dashboard mockups. Keep the sidebar, header, breadcrumbs, wording, colors, Public Sans, spacing, cards, tabs, actions, and responsive behavior exactly as they are. Skeletons use existing theme tokens only and must support light/dark modes and reduced motion.

## Component mapping
| Existing component | Loading representation |
|---|---|
| PageHeader / MetaLine | Preserve known page title, breadcrumb and available actions; skeletonize only unknown metadata |
| FigureGrid / FigureCard | Retain card count, icon tile, status badge position, value and label geometry; replace unresolved data only |
| DataTable | Preserve actual column widths, column headers, scroll container and 10-row viewport; replace cell values with differently sized neutral skeleton bars, not fabricated records; keep existing pagination layout |
| ScrollList | Preserve card heading, four-row viewport, dividers and footer; skeletonize list content |
| RecordLayout | Preserve main column and 340px side column; skeletonize KeyFacts, LinkedEvidence, remarks and lifecycle only where unresolved |
| LifecycleTrack / MiniTrack | Keep the actual track geometry, neutral segments until loaded |
| ViewChips / filters | Keep known filter names and selections; do not make controls look interactive when unavailable |
| Sheet / Dialog | Keep title, width, fields and buttons; skeletonize asynchronous record content without blanking the underlying page |
| Charts, readiness gauges and progress bars | Preserve the exact existing chart/gauge dimensions, legend positions and card geometry; neutral placeholders only |
| Forms | Keep visible Field labels and the existing controls; skeletonize unknown initial values only |

## Page coverage (all routes, not just four sample screens)
- Overview and Certification readiness: readiness card/gauge, figures, Needs Action, Recent Updates, clause evidence.
- Processes and QMS: process register, process details, organization, objectives, policies, process flow and context records.
- Documents and evidence: register, reviews, detail, revision history, linked evidence and evidence details.
- Audits: programme, plans, checklists, templates, questionnaires, invitations, responses, findings, reports and all record details.
- Management review: list, workspace, topics, inputs, meetings, outputs, actions, packs, review details and records.
- Risks, improvement, corrective actions, records, notifications, search and My Tasks: actual tables, figures, cards, record details and filters.
- Settings: roles, users, permissions, certification, profile, appearance, organization, integrations, security, and other settings screens; use field-aligned loading rather than generic tables.
- Platform administration: organizations, team, support, requests, reports, jobs and logs; respect role-specific layouts.
- Authentication and legal: only skeletonize genuinely asynchronous content; do not delay static text.

## Behavior
1. Show a skeleton only while data required for that component is pending. Do not flash skeletons for synchronous or cached data.
2. Prefer section-local skeletons during refresh; keep previously available content visible where safe and appropriate.
3. Distinguish loading, empty, denied/not found, and error states. Never reveal hidden record counts or metadata.
4. Do not change process scope, role checks, classification checks, link behavior, or data access to implement loading.
5. Provide `aria-busy` and an accessible loading status without repetitive announcements. Respect reduced-motion settings.
6. Preserve the page geometry to prevent layout shifts, including 390, 768, 1280 and 1920px widths.
7. Avoid fake skeleton actions, invented menu entries, and full-page overlays where a section-only state is sufficient.

## Backend impact assessment
Design only: **No backend impact**, because this PR changes no runtime behavior, APIs, schemas, relationships, workflows, permissions, security, integrations, events or tests. Implementation must separately evaluate asynchronous fetch/error semantics and backend synchronization, including open architecture change records. No backend PR is required for this design-only change.

## Implementation acceptance checklist (future PR)
- Inspect and capture every existing route in both appearances before replacing content.
- Implement shared skeleton primitives using existing components/tokens and map them to each route.
- Verify access scoping and classifications for broad/narrow roles.
- Run `npm run typecheck`, `npm run build`, `npm run e2e`, and the Check workflow.
- Complete UI-GUIDELINES §10 with screenshots of actual loading states at 390/768/1280/1920 and in light/dark modes.
- Update `plan/progress.md` as the final commit after verification, recording only checks actually run.
