# ADR-044: Milestones, Settings › Storage and the sign-in product preview

Date: 28 October 2026 · Status: Accepted (designs approved by Danica on the design canvas, including the green milestone card, the Milestones tab, the Storage settings item and the website colours on sign-in)

## Decision
1. **Milestones.** 19 milestones in four stages (getting set up, building the system, running it, certification), each worked out from the records (`lib/milestones.ts`); nobody ticks them. A green strip at the foot of Certification readiness on the Overview shows the count, the latest reached and what is next; a newly reached milestone shows once as a notification. Certification readiness › Milestones lists them all with progress.
2. **Settings › Storage** (admins): used of the plan's allowance (Base 5 GB, Business 25 GB, Enterprise 100 GB), status (Healthy under 80%, Nearly full from 80% with an admin notification, Full at 100% when uploads pause), breakdown by documents, evidence, 24-hour exports and logos and photos, by process, and the largest files. Links take no space; Confidential and Highly confidential records stay links (D12).
3. **Sign-in.** The right side shows the illustrative Overview from the ThryveMS website (synthetic figures) with "Quality, made workable."

## Backend impact (Pending)
- `milestone_seen` (person, milestone, seen_at) so a new milestone is announced once.
- Storage totals per organization and kind from the uploads store, the 80% notification and the 100% upload block in the upload endpoint.
