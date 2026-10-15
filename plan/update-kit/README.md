# Update kit, 15 October 2026

Instructions for a coding agent (Codex) to bring this repository up to date. Work through the tasks **in order**. Each task file says what to do, where the code is, and how to check it.

| # | Task | File | Size |
|---|---|---|---|
| 1 | Land the two open pull requests (document clauses, process access) | [01-land-open-pull-requests.md](01-land-open-pull-requests.md) | Small |
| 2 | Rename the product from iQMS to **ThryveMS** | [02-rename-to-thryvems.md](02-rename-to-thryvems.md) | Medium |
| 3 | Audit checklist, auditee questionnaire and audit execution workflow | [03-audit-workflow.md](03-audit-workflow.md) | Large |
| 4 | Follow-ups found along the way | [04-follow-ups.md](04-follow-ups.md) | Small |

## Before you start

1. Read `AGENTS.md`. Its rules override anything in this kit. In short:
   - Never weaken client isolation, permission checks or classification rules.
   - Links only: no general file uploads (plan v3 decisions D12–D13).
   - No secrets, real client data or personal data. Sample data stays synthetic.
   - Changes go through branches and pull requests. Do not push to `main`. Production deploys need Danica's approval.
   - Keep the UI wording plain, in sentence case, matching the existing front end.
   - Update `plan/progress.md` with what was done, what was tested and what is next.
2. Read `plan/iQMS-Consolidated-Backend-Plan-v3.md`, the only normative backend specification. Sections that matter here: §9 (authorisation, including process scope D22 once task 1 lands), §12 (data model), §19 (audit workflow).
3. The front end in `app/` is the behaviour specification for screens and wording. Sample data is in `app/src/data`, and the in-memory store is in `app/src/lib/store.tsx`.

## Branches and pull requests

- One branch and one pull request per task: `kit/1-land-prs`, `kit/2-thryvems`, `kit/3-audit-workflow`, `kit/4-follow-ups`. Start each from the latest `main` after the previous task is merged. Task 3 can be split into several pull requests (see its file).
- Every pull request must pass the **Check** workflow (`.github/workflows/check.yml`, added in task 1), which runs `npm run typecheck` and `npm run build` in `app/`.
- Describe in each pull request what changed, what was tested, and anything not tested.

## Checking your work

```bash
cd app
npm install
npm run typecheck
npm run build
npm run dev   # then open the app and use "View as" to switch people
```

Use the **View as** switcher to test each role. Useful people in the sample data:

| Person | Role | What they should see |
|---|---|---|
| Aaron Lim | Administrator | Everything (default signed-in person) |
| Maria Santos | Quality manager | Everything |
| Eric Navarro | Top management (after task 1) | Every process |
| Joy Aquino | Process owner | Purchasing & suppliers only |
| Ben Castillo | Contributor | Operations only |
| Daniel Reyes | Process owner, lead auditor | Design & development; leads audits |
| Kim Dela Cruz | Auditor | Every process; not independent of Design & development |
| Elena Cruz | Guest auditor | Assigned audits only (access ends 30 Nov 2026) |
| Rafael Ong | Consultant | Public and Internal records; remarks; can't approve |

The GitHub Pages preview (`index.html` and `docs/index.html` at the repo root) is a built single file. Don't edit it by hand. See task 4.
