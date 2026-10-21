# Update kit: Management review, 15 October 2026

Instructions for a coding agent (Codex) to turn Management Review into an evidence-backed review workspace. This kit is **separate from `plan/update-kit/`**, which is being implemented in parallel. Read "Working alongside the other kit" before you start.

| # | Task | File | Size |
|---|---|---|---|
| 1 | Groundwork: record pages, new-tab links, dates and periods, shared preview data | [01-groundwork.md](01-groundwork.md) | Medium |
| 2 | Management review workflow and supporting records | [02-management-review.md](02-management-review.md) | Large |

## Before you start

1. Read `AGENTS.md`. Its rules override anything in this kit. In short:
   - Never weaken client isolation, permission checks or classification rules.
   - Links only: no file uploads (plan v3 decisions D12–D13).
   - Sample data stays synthetic.
   - Changes go through branches and pull requests. Do not push to `main`.
   - UI wording is plain and in sentence case.
   - Keep `plan/progress.md` up to date.
2. Read `plan/iQMS-Consolidated-Backend-Plan-v3.md`, the normative spec. It matters here in these places:
   - **§22 Management review**: formats, stages, Finish and lock, sign-off ledger, amendments.
   - **§17 Objectives and KPI results**: results belong to periods; missing is "No data", never zero.
   - **§12**: the Management review tables (`review_snapshots` and others).
   - **§9**: access, including process scope D22, and "filter before counting".
3. The product is called **ThryveMS** from now on. Use that name in all new text. Renaming the existing text is task 2 of the other kit, so don't do it here.

## Working alongside the other kit

`plan/update-kit/` is being implemented at the same time, and both kits touch some of the same files. To avoid clashes:

- **Start from the latest `main`, and merge `main` into your branch often.**
- **Shared files:**
  - `app/src/lib/store.tsx`: both kits add collections.
  - `app/src/data/types.ts` and `app/src/data/records.ts`.
  - `app/src/pages/overview.tsx`.
  - `app/src/pages/evidence/evidence.tsx`.

  Add to these files; don't reorganise them.
- **The audit data comes from the other kit.** Input c6 (audit results) should list audit findings. If the other kit's task 3 has landed (`auditFindings`, `auditReports` in the store), use those collections. If not, list audits and the nonconformities whose `source` names an audit, and leave a `TODO(audit-kit)` comment where findings will plug in.
- **The other kit's task 4.1 also touches fixed figures.** It replaces fixed figures on Overview, Evidence and Readiness. This kit owns `app/src/lib/review-figures.ts`. If both need a calculation (for example, open nonconformities), put it in one shared helper in `app/src/lib/` rather than two copies.

## Branches and pull requests

- Use `mr/1-groundwork` and `mr/2-management-review`, each with its own pull request. Task 2 can be split further (see its file).
- Every pull request must pass the **Check** workflow (`npm run typecheck` and `npm run build` in `app/`).
- Say in each pull request what changed, what was tested, and what wasn't.

## Checking your work

```bash
cd app && npm install && npm run typecheck && npm run build && npm run dev
```

Use **View as** to test each role:

| Person | Role | In management review |
|---|---|---|
| Maria Santos | Quality manager | Prepares reviews (preparer) |
| Eric Navarro | Top management | Reviewer: evaluates, decides, signs off |
| Joy Aquino | Process owner, Purchasing | Gets input c7 handed to her to prepare |
| Rafael Ong | Consultant | Drafts notes; can't sign off or act as top management |
| Ben Castillo | Contributor, Operations | Not a participant; sees only Operations records |

Sample reviews are in `app/src/data/reviews.ts`: MR-2026-02 is being prepared, MR-2026-01 is recorded (Reviewed) and MR-2025-01 is closed.
