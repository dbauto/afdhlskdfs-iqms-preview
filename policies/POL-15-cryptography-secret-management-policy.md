# POL-15 Cryptography and Secret Management Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | Security owner |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | Keys, certificates, tokens and passwords used by iQMS |

## Requirements
1. TLS 1.2 or later for all traffic; HSTS with preload.
2. Data at rest encrypted by providers (Neon, S3, R2); backup dumps encrypted with `age` keys held offline by two named people.
3. Secrets live in Worker secrets, GitHub environment secrets or the cloud provider’s secret store; never in code, logs or tickets.
4. Rotation: database roles every 90 days and on staff change; API tokens yearly and on staff change; immediate rotation on suspected exposure.
5. Tokens are scoped to one environment and the minimum permissions available; no global API keys.
6. Session and invitation tokens are random (at least 128 bits), stored as hashes, single-use where applicable.

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Secret inventory with owners and rotation dates; rotation records.
