# Task 4: Follow-ups

Smaller items found while making tasks 1 and 3. Do them after task 3, or fold them into it where they touch the same files.

## 4.1 Figures that are still fixed sample numbers

Some figures are typed into the pages instead of being worked out from records. They don't change when people add records, and they ignore process access (task 1), so a contributor can see company-wide totals. Work each one out from `state` (already filtered for the signed-in person). Where there's no data, show "No data" as the KPI cards already do.

| Page | File | Fixed values |
|---|---|---|
| Evidence | `app/src/pages/evidence/evidence.tsx` | Figure cards ("71%", "29 of 41", 4, 9, "18 this month") and the "By ISO clause" tab, which reads `EVIDENCE_GROUPS` from `app/src/data/records.ts` |
| Overview | `app/src/pages/overview.tsx` | The fixed "needs your attention" items (`OPS-WI-014`, `MR-2026-02`…) and "Evidence by ISO 9001 clause" |
| Readiness | `app/src/pages/readiness.tsx` | "Readiness by clause" |
| Processes | `app/src/pages/qms/processes.tsx` | `PROCESS_FLAG` and `PROCESS_WEEKS` (sample status and 12-week history) |

Coverage per clause should come from evidence clause links, plus document clauses from task 1 where the plan allows (plan §12, typed record–clause mappings). Count after filtering, and never show "N hidden" messages (plan §9).

## 4.2 Rebuild the GitHub Pages preview

`index.html` and `docs/index.html` are a single-file build of the app, and nothing in the repo shows how they are produced. Add a script, e.g. `npm run build:preview` using `vite-plugin-singlefile`, that writes one self-contained HTML file. Copy it to both places. Rebuild after each merged task so https://dbauto.github.io/afdhlskdfs-iqms-preview/ shows the current app. Note it in `README.md`.

## 4.3 Technical identifiers still named iQMS

After task 2, list the remaining identifiers (domains, cookie name, storage keys, bucket names, file names) in `plan/progress.md` under "Next", for a product decision. Don't rename them without that decision.

## Done when
- No fixed figures remain on the pages above; each matches the records it summarises for the person viewing.
- The preview build script exists and the published preview matches `main`.
