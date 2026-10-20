# ADR-028: Questionnaire responses, checklist results and a linked findings paper

20 October 2026. Danica reviewed the audit flow and found the difference between results and findings narrow and confusing: a finding repeated the result it came from, with its own review and disposition steps. She defined the intended model and approved this change. This supersedes the finding records, auditee finding review and report editorial decisions in ADR-026.

## Decision

An audit has three distinct parts:

- **Questionnaire: responses.** The auditee answers. A questionnaire form needs submitted responses only; it has no auditor results, does not appear in Conduct audit and never marks the audit held. Submitted responses show on the checklist question with the same clause (and on the question itself when a checklist uses a pre-audit questionnaire), and can be used as evidence.
- **Checklist: results.** The assigned, independent auditor records one result per question: Conforms, Observation, Minor NC, Major NC or Not applicable, with objective evidence. A changed result adds a new record and keeps the earlier one.
- **Findings: a paper.** The audit team writes its findings in one document and links it to the audit report draft: a controlled document, an evidence record or a full https:// link. There is no file upload (D12–D13). The lead cannot issue the report without it; issuing freezes the links with the report.

A Minor NC or Major NC result raises corrective action directly from its checklist question, or links an existing nonconformity for the same process. The link is idempotent and is carried to later results for the same question, so correcting a result never asks for a second record. A form cannot be completed while a current nonconformity result has no corrective action. Changing a result to Conforms needs no corrective action; the earlier nonconformity result stays in the history.

Withdrawing a form or replacing it with a revision cannot hide a nonconformity result: it stays listed on the audit and report, and the report cannot be issued until it has corrective action. Corrective action can still be linked on that form until the form is completed. Observations need no corrective action.

The audit lifecycle is unchanged in storage; the stage stored as Findings agreed is shown as Results complete and is reached when every current form is completed. Report issue requires completed forms, corrective action for every nonconformity result, the findings paper, contributions from each auditor who recorded results, and the narrative. Management review input c6 counts recorded observations and nonconformities and flags nonconformity results without corrective action.

## Removed

Audit finding records and their page, auditee agree/dispute on findings, lead finalization and withdrawal of findings, finding edits, and report Include/Merge/Exclude editorial decisions. The auditee's view of an audit shows their own questionnaires only.

## Boundary

This changes the synthetic, browser-local preview and the matching backend specification text. It adds no server persistence, upload endpoint or production authorization. No deployment is authorized by this decision.
