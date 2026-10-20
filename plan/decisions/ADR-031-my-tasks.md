# ADR-031: My tasks, everything waiting on you

20 October 2026. Danica asked for a My tasks page in the menu so each person can see the work assigned to them across modules. She chose the design and asked for it to be implemented.

## Decision

My tasks sits under Overview in the menu, with a count of the person's tasks (marked when any are overdue). It gathers work that already exists in the other modules. People don't create free-standing tasks there, because a second to-do list beside the records would split the evidence trail.

The rule is **the record is waiting on you**: a task appears for the person whose turn it is and leaves their list as soon as they have done their part, even while the record stays open. Owning or managing a record is not, by itself, a task.

| Module | Who has the task |
| --- | --- |
| Nonconformity | The owner at every step except verification, which is the verifier's. The effectiveness check is the owner's. |
| Document | Each technical reviewer and approver whose decision is still missing (only the next approver when approval is one after another; never the person who started the revision). The author when changes are requested or a draft is unfinished. People who can publish when a revision is ready to publish. The owner when a scheduled review is due within 30 days. |
| Risk or opportunity | The owner when the review date is within 30 days. |
| Audit | The auditee until the questionnaire is submitted (or a clarification answered). Each auditor with checklist questions still to record. The lead when results are complete and the report is not yet issued. |
| Management review | The preparer until the pack is sent and the review recorded, and to answer change requests with an amendment. Contributors for inputs handed to them. Each reviewer until they sign or ask for changes. Each action owner until the action is done. |
| Consultant remark | The owner of the record until they reply; then the consultant, to answer or resolve. |
| Certification task | The owner until it is ready to confirm; then quality managers and administrators, to confirm. |

Tasks are grouped as Overdue, Due this week and Later or no date, can be filtered by type, and show "Your step" and a button to the real record, where the work is done. A separate, collapsed "Waiting on others" list shows the person's own records where someone else has the next step. Lists only include records the person can see (plan v3 §9: filter before counting).

The Overview's "Needs your attention" list is replaced by the first five tasks with a link to See all, so there is one rule and one list. This also stops two earlier behaviours: quality managers no longer get every open nonconformity, and a management review no longer stays on everyone involved until it closes.

## Boundary

This changes the synthetic, browser-local preview and the matching backend specification text. It adds no server persistence or production authorization. No deployment is authorized by this decision.
