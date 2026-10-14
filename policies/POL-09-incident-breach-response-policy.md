# POL-09 Incident and Breach Response Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | Incident lead (Danica Marie Boton); DPO for personal data |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | Security incidents and personal data breaches affecting iQMS or customer data |

## Severity
- **SEV1**: confirmed or likely exposure of customer data, cross-customer access, compromised production credentials, or full outage.
- **SEV2**: partial outage, contained security issue without data exposure.
- **SEV3**: minor issue.

## Steps
1. Detect and report to security@iqms.ph or the on-call phone at once.
2. Within 1 hour: incident lead appointed, severity set, evidence preserved, containment started (revoke tokens, disable feature, block traffic).
3. Assess whether personal data is involved, whose, and how many people.
4. Customers: initial notice when a breach of their personal data is suspected and they may need to act; full notice without undue delay and within 24 hours of confirmation (DPA §8).
5. Support customers’ NPC and individual notifications within 72 hours where NPC Circular No. 16-03 requires; iQMS notifies the NPC itself for data where iQMS is the controller.
6. Recover, monitor, and close only when the cause is fixed.
7. Post-incident review within 5 working days; actions tracked to completion.
8. All incidents are recorded in the breach and incident register; the annual security incident report to the NPC is prepared where required.

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Incident register; timelines; customer notices; NPC submissions; review reports.
