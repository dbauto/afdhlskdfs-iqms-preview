# Security Overview

How iQMS protects your company’s quality records. This summary is part of the Data Processing Agreement.

## Separate by design

- **Your own database.** Every company gets a separate database and a separate application deployment at its own web address. Requests for one company can’t reach another company’s database, and every record also carries your company’s identifier, checked by the database itself.
- **Links, not files.** Controlled documents and evidence stay in your SharePoint or OneDrive. iQMS stores descriptions and links, so a breach of iQMS would not expose your document contents.

## Signing in

- Microsoft 365 sign-in for your staff, limited to your company’s Microsoft tenant, following your own Microsoft security rules.
- Email-and-password sign-in for outside users, with passwords at least 12 characters, checked against known-breached passwords, and two-step sign-in or passkeys.
- Two-step sign-in is always required for owners, administrators and quality managers.
- A human check on sign-in pages, account lockout after repeated wrong passwords, and sign-out after 30 minutes of inactivity (your company can set 15 to 60 minutes) and after 8 hours in total (your company can allow up to 12).

## Who can see what

- Roles and permissions per area (view, add and edit, approve, manage), set by your administrators.
- Four classifications: Public (everyone in your workspace), Internal, Confidential (named people and authorised roles) and Highly confidential (named people only). Lists, search, counts and emails respect them.
- Separation of duties: authors can’t approve their own documents, action owners can’t verify their own corrective actions, and auditors can’t audit their own work without a recorded reason.
- Outside consultants see only what your administrator approves, never Highly confidential records.
- **iQMS staff can’t open your workspace** unless your administrator grants support access: 1 to 4 hours, read-only, no confidential records, ended at any time, and every step recorded under the staff member’s real name.

## Records you can trust

- Every change, approval and share is recorded in an activity log the application can’t edit or delete. Daily integrity checkpoints are kept in write-once storage for 7 years.
- Approvals are tied to the exact revision that was reviewed. A management review is frozen when recorded; later changes need a new version with a reason.

## Data protection

- Encryption in transit (TLS 1.2 or later, HSTS) and at rest.
- Data stored in Singapore. Point-in-time restore for 30 days, plus encrypted nightly backups kept for 35 days in write-once storage.
- Restore tests every quarter.

## Building and running iQMS

- Every change is reviewed, tested (including tests that try to read another company’s data) and scanned for vulnerable dependencies and leaked secrets before release.
- Releases go to a test environment, then a pilot customer, then everyone, with automatic halt if errors rise.
- Production releases need approval by a named person. Automated tools, including any AI coding assistant, can’t deploy to production or access customer data.
- Independent penetration test before launch and every year.
- Named on-call engineers; critical vulnerabilities are fixed or mitigated within 72 hours.

## If something goes wrong

We follow a written incident procedure. If a personal data breach affects your data, we tell your administrators and Data Protection Officer within 24 hours of confirming it, and help you notify the National Privacy Commission within 72 hours where required.

Report a security issue: **security@iqms.ph**. Please don’t test against live customer workspaces; ask us for a test environment.
