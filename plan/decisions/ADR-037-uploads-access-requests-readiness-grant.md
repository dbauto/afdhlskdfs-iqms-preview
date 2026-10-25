# ADR-037: File uploads for shared documents and evidence, access requests, and the readiness grant

25 October 2026. Requested by Danica for the client: (1) top management should see the Overview as the administrator does; (2) someone who opens a record they can't see should be able to ask its owner for access; (3) Public and Internal documents and evidence can be uploaded to ThryveMS storage, evidence as several files in folders and subfolders. Videos and .exe files are refused; Confidential records stay as links.

This revises decision **D12** (links only) and narrows the "not found" rule in plan v3 §9 for Public and Internal records. It needs Danica's approval of this pull request before any backend work starts.

## 1. Certification readiness is a role grant

The Overview showed the certification readiness section to three fixed roles (consultant, quality manager, administrator) whatever the role editor said. It is now a role grant, **Sees certification readiness** (`overview.readiness.read`), next to "Can open Confidential records" in Settings › Roles. Built-in defaults: administrator, quality manager, consultant and top management.

The grant is view only. Listing, editing and confirming certification requirements stay with the quality manager, administrator and consultant (unchanged).

The role editor's help text now says what each control means: Shown and Hidden are View and None; "Applies to" decides which records a role sees.

## 2. Access requests

- A person whose role covers only some processes who opens a **Public or Internal** document or evidence item outside them sees "You don't have access to <number>" and **Request access**, instead of "not found". The page shows the number only, never the title or contents.
- Two kinds of request:
  - **This record only** goes to the record owner (document owner; for evidence, who added it). If that person isn't active, it goes to the process owner.
  - **Shared records in <process>** goes to the process owner, who ticks which of the process's Public and Internal documents and evidence to open, or Select all.
- The decider gets a notification and a My tasks item (Decide). They share or decline with an optional reason; the person asking is notified either way and can follow the request under Waiting on others.
- A grant (`access_grants`: person, record, granted by, date, request) opens one record for viewing. It never changes the person's role, never gives edit rights, and classification still applies on top. The backend evaluates grants in the same scope check as process membership (plan v3 §9, D22), on every request.
- **Confidential and Highly confidential records never offer a request.** They still answer "not found", so their existence isn't revealed. Records in a section the role has None for, deleted records and wrong links also stay "not found".
- One waiting request per person per record or process.

## 3. Uploads (revises D12)

- **Documents:** Public and Internal documents can be linked (as before) or uploaded. One file per revision. Confidential and Highly confidential documents stay links only; the server refuses a file on them and refuses changing an uploaded document's classification to Confidential until the file is replaced by a link.
- **Evidence:** Public and Internal evidence can hold uploaded files, links, or both, arranged in folders and subfolders. People can pick several files or a whole folder (its subfolders are kept), or type a folder path for the next files and links. Confidential evidence stays links only.
- **Limits:** up to 25 MB a file. Refused: videos (any `video/*` type or video extension such as .mp4, .mov, .avi, .mkv, .webm) and .exe files. The server checks the type from the file's content, not only its name or the browser's claim.
- **Storage:** R2 bucket `iqms-files-<env>`, keys under the client prefix, server-generated object keys (never the file name). Files are scanned for malware before they can be opened; a file that fails the scan is quarantined and the uploader is told. Downloads go through an authenticated Worker route after the same access checks as the record (no bare presigned URLs). Retention follows the record; deleting a draft deletes its files; published revisions keep theirs.
- **Folders** are a `folder` path on each file in the evidence pack, not storage objects. Paths are cleaned (no empty, "." or ".." parts).

## Consequences

- New storage purpose and breach surface: uploaded file contents are client data held by ThryveMS. The Security Overview, Privacy Notice and Subprocessors list are updated in this pull request; POL-15 (data retention) and the Privacy Impact Assessment need review before release.
- Acceptance tests 3 and 11 in plan v3 §41 change: upload endpoints exist for Public and Internal documents and evidence only, and refuse Confidential records, videos, .exe files and files over 25 MB.

## Boundary

Browser-local preview only: uploaded files keep their name, size and type in the preview store, and the browser keeps the contents for the current session so Open works. No server persistence, upload endpoint or R2 object is created. No deployment is authorized by this decision.
