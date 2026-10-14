# POL-05 Production and Support Access Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | Operations lead |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | Any access by iQMS staff to production systems or customer workspaces |

## Requirements
1. Customer workspaces: only with a support grant from the customer’s owner or administrator, 1–4 hours, read-only, excluding Confidential and Highly confidential records, tied to a support report number. No exports, approvals or permission changes.
2. Every action during a grant is logged in the customer’s activity log under the engineer’s real name.
3. Infrastructure emergency access (database console, cloud dashboards) is used only for maintenance, incident response or recovery, by named engineers, with a ticket opened before or within 1 hour after use. The customer is told if their personal data was viewed.
4. Production data is never copied to local machines, test environments, AI tools or support tickets.
5. All grants and emergency uses are reviewed monthly by someone other than the person who used them, or by the Managing Director if no one else is available.

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Support grant log; emergency access tickets; monthly review records.
