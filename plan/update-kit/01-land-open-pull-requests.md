# Task 1: Land the two open pull requests

Two pull requests are open and reviewed by the product owner. Both pass the Check workflow (type check and build).

| PR | Branch | What it does |
|---|---|---|
| [#2](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/2) | `process-access` | Process access by assignment (plan decision D22), removes the 01–09 process numbers, adds the Check workflow and a Top management role |
| [#1](https://github.com/dbauto/afdhlskdfs-iqms-preview/pull/1) | `documents-by-iso-clause` | ISO 9001 clauses on documents, and a "By ISO clause" tab in Documents |

## Steps

1. **Merge #2 first** (squash). It merges cleanly into `main`.
2. **Update #1 from the new `main`.** Expect one conflict, in `plan/progress.md`: both pull requests add a row at the end of the table. Keep both rows, #2's first. There are no code conflicts: `app/src/pages/documents/doc-sheet.tsx` combines cleanly (clauses from #1, `takenIds` and `startProcess` from #2).
3. Wait for Check to pass on #1, then merge it (squash).
4. If you can't merge (no permission), do steps 1–3 on a branch `kit/1-land-prs` and open one pull request containing both.

## What landed, for reference in later tasks

**Process access (D22).** `app/src/lib/store.tsx`:
- `scopeState()` narrows `state` to the processes the signed-in person may see. Records follow their process: documents, risks, objectives, audits, nonconformities, evidence (visible when any of its processes is in scope) and remarks. Every page reads `state` from `useStore()`, so lists, counts and search are already filtered.
- `inProcess(process, person, role)` answers "may this person see this process".
- `takenIds(collection)` returns all IDs, including hidden ones. Use it whenever you number a new record; never number from `state`.
- `startProcess(processes)` gives a form's starting process.
- `Process.members` lists the people in a process besides the owner. They are edited on the process page with "Assign people", which needs Manage on Processes.
- Roles scoped to "All processes" or "Not their own process" see everything.

**Process numbers are gone.** Process IDs are now short internal keys (`leadership`, `sales`, `design`, `purchasing`, `operations`, `inspection`, `people`, `infrastructure`, `improvement`). Never show them in the UI; show `process.name`.

**Document clauses.** `DocRecord.clauses: string[]` is set in Add/Edit document. It starts from the process's clauses, and at least one clause is needed before Submit for review.

## Done when
- Both pull requests are merged into `main`, Check passes on `main`, and both rows are in `plan/progress.md`.
