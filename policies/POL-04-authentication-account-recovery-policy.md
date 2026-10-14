# POL-04 Authentication and Account Recovery Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | Security owner |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | Staff accounts and the iQMS product’s sign-in design |

## Requirements
1. Staff use MFA everywhere it is offered; phishing-resistant MFA for privileged systems.
2. Product sign-in follows backend specification §4: Microsoft Entra OIDC with tenant checks, WorkOS for email sign-in with breached-password checks and MFA, session cookies `__Host-` prefixed, idle timeout 15–60 minutes, absolute limit 8–12 hours, re-authentication for sensitive actions.
3. MFA is mandatory for customer owners, administrators, quality managers and platform admins.
4. Accounts are never linked by matching email alone.
5. Recovery of a customer owner account requires a request from another active owner or administrator, or a written request on company letterhead verified by phone call to a number already on file, and is logged.
6. Staff password managers are required; passwords are never sent by chat or email.

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Identity provider settings exports; recovery log; authentication test results.
