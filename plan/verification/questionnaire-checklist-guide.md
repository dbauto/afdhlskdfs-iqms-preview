# Using questionnaires and auditor checklists

The checklist is the auditor's work plan. The questionnaire collects auditees' answers. They share versioned questions, while auditee responses and auditor assessments are separate records.

1. Open **Audits**, plan or open an audit, then open **Checklist**. The lead and assigned audit team can prepare it; administrators and quality managers can help prepare it. Only that audit's lead can mark it ready.
2. Add sections and questions. **Text notes** is a multiline open-ended answer. **Multiple choice** and **Yes / No / N/A** use radio buttons. **Multiple select** uses checkboxes; enter one choice per line. **Answer required** is separate from evidence requirements.
3. Turn on **Use pre-audit questionnaire**. For each question people should answer, choose **Auditee** or **Both** under **Who should respond?**. Set **Allow evidence links** off, or set links to Optional, Required or When No. The answer preview shows the actual answer control.
4. The lead selects **Mark checklist ready**. A released version is read-only; **Start checklist revision** retains it and makes a separate version. Selecting questions remains possible while reading a released version.
5. Open **Questionnaires**. Choose a workspace respondent, questions and deadline, then select **Assign questionnaire**. Repeat for other respondents. Each person's answers and progress stay separate. Their Overview and notification link open their own assignment, including when it is outside their usual process scope.
6. Respondents answer, add allowed HTTPS evidence links and submit. Required answers/evidence and N/A reasons are checked. Submitted answers are read-only; auditors can request clarification and respondents can revise only the requested questions. Earlier submitted versions remain available.
7. The assigned auditor opens **Conduct audit**, selects a checklist question, reads relevant responses and records an assessment, objective evidence, sampling/interview details and notes. **Use response as evidence** links the exact submitted version. The response can be opened in a new tab without losing the assessment draft. Verification of the response or its links is a separate deliberate decision.
8. Tick **Checklist item completed** after recording the assessment, or select **Complete assessment**. A checked box means the examination is complete. Conforms, Observation, Minor nonconformity, Major nonconformity and Not applicable describe its result. Invalid completion remains unchecked with an explanation. Reassessment appends history rather than replacing another contribution.
9. Raise an observation or nonconformity finding from the completed assessment. **Raise corrective action** opens the existing nonconformity form; creation links one durable case to the finding. Retrying cannot create another case. Findings appear in the audit, the Findings tab and management review sources.

## Respondents without workspace accounts

The lead can prepare a **Questionnaire-only invitation** or an **Interview recorded by auditor** from the questionnaire page. An interview visibly records both the respondent and the person entering their answers.

**Open respondent preview** demonstrates the invitation journey with synthetic data in the same browser. It has no workspace navigation or evidence-library picker, accepts HTTPS links only, and is revoked/expired when the invitation is. Its identity is labelled **Unverified preview**. It sends no email or code and does not provide a secure, cross-device invitation. Name and email alone are not proof of identity.

Production invitations require the provider-backed verification, restricted membership/session and server enforcement described in ADR-023. That integration and the unfinished versioned report/consolidation workflow remain separate backend/audit-stage work. Report issuance is disabled rather than displaying a false successful issue.
