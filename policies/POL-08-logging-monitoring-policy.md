# POL-08 Logging and Monitoring Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | Operations lead |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | Application, infrastructure and security logs |

## Requirements
1. Three log classes with separate access and retention:
   - Business activity log (customer database, append-only, retention set by the customer, daily hash checkpoints to S3 Object Lock for 7 years).
   - Security and access events (sign-ins, grants, admin actions): 1 year.
   - Technical telemetry (errors, performance): 90 days.
2. Logs contain identifiers, not record contents, passwords, tokens or secrets. Redaction is tested in CI.
3. Alerts for authentication anomalies, cross-customer denials, failed jobs, backup failures and integrity-check failures reach the on-call engineer; critical alerts page a person within 15 minutes.
4. Log access is limited to operations staff and reviewed quarterly.

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Alert configuration; redaction test results; integrity check reports.
