# POL-10 Backup and Continuity Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | Operations lead |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | Customer databases, platform database, configuration and logs |

## Requirements
1. Point-in-time restore of 30 days on every production database.
2. Nightly encrypted logical dump of each customer database to AWS S3 (Singapore) with 35-day Object Lock; encryption key held offline by two named people.
3. Infrastructure is reproducible from code (deployment manifests in git).
4. Quarterly restore test of one customer into an isolated environment, measuring recovery point and recovery time against targets (24 hours / 8 hours contractual; 1 hour / 4 hours internal).
5. Before cutting over a restore, current access revocations, legal holds and completed deletions are re-applied.
6. Provider outage and account compromise runbooks exist and are exercised yearly.

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Backup job logs; restore test reports; runbook exercise records.
