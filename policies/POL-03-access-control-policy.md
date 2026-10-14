# POL-03 Access Control Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | Security owner |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | Access to iQMS systems, infrastructure accounts and customer workspaces |

## Requirements
1. Least privilege: people get only the access their role needs, granted through named accounts. No shared accounts.
2. Joiners: access is requested by their manager and approved by the security owner. Movers: access is reviewed on role change. Leavers: all access is removed on the last working day; credentials they knew are rotated.
3. Privileged access (Cloudflare, Neon, AWS, GitHub admin, WorkOS, DNS) is limited to named engineers, requires phishing-resistant MFA (passkey or hardware key), and is reviewed monthly.
4. Customer workspace content is reached only through a customer-granted support session (POL-05).
5. Access to the platform console is protected by Cloudflare Access and application MFA.
6. Access reviews: monthly for privileged accounts, quarterly for all others. Findings are fixed within 5 working days.
7. In the product, access is deny-by-default and enforced on the server for every request (backend specification §5).

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Access request records; monthly privileged-access reviews; leaver checklists.
