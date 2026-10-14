# POL-06 Secure Development and Change Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | Engineering lead |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | All code, infrastructure configuration and database migrations |

## Requirements
1. All changes go through pull requests on protected branches with at least one review. Changes to authentication, permissions, logging, support access, migrations and deployment workflows need a security review.
2. CI must pass: typecheck, lint, unit, integration on real PostgreSQL, isolation tests, permission matrix, end-to-end tests, dependency and secret scanning, static analysis.
3. Build once; release to staging, then a pilot customer, then everyone, with gradual rollout and automatic halt on error rise.
4. Production deploys need approval in the GitHub `production` environment by a named approver.
5. Migrations are forward-only and backward compatible (expand, migrate, contract).
6. Secrets never appear in code, logs or tickets; actions are pinned by commit SHA.
7. AI coding tools work only on branches and the sandbox with synthetic data and no production credentials; their changes follow the same review.
8. Emergency fixes may shorten review time but not skip tests; a retrospective review follows within 2 working days.

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Pull request history; CI results; release records; deployment approvals.
