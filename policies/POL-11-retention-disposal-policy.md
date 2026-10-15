# POL-11 Retention and Disposal Policy

| | |
|---|---|
| Version | 1.0 draft |
| Owner | DPO |
| Approved by | Managing Director, [Operator legal name] |
| Effective | On approval |
| Next review | 12 months after approval, and after any major incident or change |
| Applies to | Data ThryveMS holds as processor and as controller |

## Requirements
1. Customer data is kept as the customer’s retention rules set, then deleted by the nightly retention job, which logs what was removed.
2. Legal holds stop deletion of the records they cover until released.
3. At contract end: 30 days for export, deletion from live systems within 30 days, from backups within a further 35 days, written confirmation on request.
4. ThryveMS’s own data follows the retention table in the Privacy Notice.
5. Deleted data is removed from search indexes and exports as well; backups expire rather than being edited.

## Exceptions
Exceptions need a written reason, a compensating control, the risk owner’s approval and an end date no later than 6 months away. They are listed in `policies/exceptions.md` and reviewed monthly.

## Evidence
Retention job logs; hold register; deletion confirmations.
