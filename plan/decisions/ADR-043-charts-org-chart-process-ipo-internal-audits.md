# ADR-043: Chart values, org chart on the canvas, process descriptions and links, internal audit frequency

Date: 28 October 2026 · Status: Accepted (designs approved by Danica on the design canvas)

## Context
Client feedback: chart bars had no values and no axis labels; the org chart needed an "Add box" button and a side sheet; "What we do" repeated the scope statement; inputs, activities and outputs were bullet lines that couldn't be described or linked; process covers were not wanted; internal audits could not be planned by frequency, and the New audit plan window mixed internal and external audits without templates, copying or a blank start.

## Decision
1. **Charts.** The charts that already exist keep their size and place. Each bar, bar part or gauge segment opens a value tooltip on hover, keyboard focus or tap (`components/app/chart-tip.tsx`). Bar charts get y-axis labels with units, x-axis labels and a dashed target line where there is a target. No new charts. The console charts get the same treatment.
2. **Org chart.** Everything happens on the canvas: select a box for its toolbar (Edit, Add under, Add beside, Delete); new boxes and renames are typed in place; Edit opens a small window beside the box that saves as you type; Delete asks whether the boxes under it move up a level or are deleted too, with Undo. The "Add box" button and the side sheet are removed. A box can hold optional responsibilities.
3. **Organization & Scope.** "What we do" is removed from the profile, the edit form and the export. The scope statement (QMS-MAN-001) is the single description.
4. **How the process works.** Inputs, Activities and Outputs are each one description, with Link buttons: inputs link feeding processes, documents or something from outside; activities link procedures, work instructions and risks; outputs link receiving processes, forms and records, and objectives. Process links show on both processes. Until someone links by hand, a process's own procedures and forms are linked for them.
5. **Process covers** are removed: the cover on the process page, the "Cards with covers" layout and the cover data. A saved "covers" layout reads as "Cards with actions".
6. **New audit plan.** Step 1: internal or external. External offers Mock audit, Stage 1, Stage 2, Surveillance and Recertification. Internal offers Quarterly, Bi-annual or Annual, and creates the series of plans from the first date to a repeat-until date. Step 3: start from a template (built in or saved), a copy of a past plan (without its results) or a blank plan. Any plan can be saved as a template (timetable, areas, auditor roles and checklist; never dates, names, results or findings). The plan list filters All, External and Internal.

## Backend impact (Pending)
- `org_chart_nodes.duties` (text, optional).
- `process_links` (process_id, column, kind, ref, label) with the organization check; the reverse view for process links.
- `audit_plans.series_id`, `series_frequency`, `series_n`, `series_of`; `audit_plan_templates` per organization.
- Drop `processes.cover`.

## Consequences
The "Checklist templates" page keeps its name; saved plan templates are chosen in New audit plan. Changing a series' frequency after creation is not built yet: plans are edited one by one.
