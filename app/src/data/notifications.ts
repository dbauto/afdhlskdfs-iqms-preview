import type { AppNotification } from "./types"

const n = (id: string, to: string, kind: AppNotification["kind"], title: string, href: string, when: string, age: number, read = false, body?: string, from?: string): AppNotification => ({ id, to, kind, title, href, when, age, read, body, from })

/** Sample notifications for the people you can view the prototype as. */
export const NOTIFICATIONS: AppNotification[] = [
  // Aaron Lim, administrator
  n("nt-01", "Aaron Lim", "Remark", "New consultant remark on 04 Purchasing & suppliers", "/qms/processes/04", "Today, 09:40", 40, false, "Outsourced plating isn’t listed as an output of this process."),
  n("nt-02", "Aaron Lim", "Waiting on you", "Approve OPS-WI-014 Line clearance, rev 03", "/documents/OPS-WI-014", "Today, 08:15", 125, false, "Nina Flores sent it for approval. Due 15 Oct.", "Nina Flores"),
  n("nt-03", "Aaron Lim", "Overdue", "NC-2026-007 is 9 days overdue", "/corrective-action/NC-2026-007", "Today, 07:00", 220, false, "Approved supplier list not re-evaluated for 2026. Owner Joy Aquino."),
  n("nt-04", "Aaron Lim", "Shared", "Maria Santos shared HR-PRO-002 with you", "/documents/HR-PRO-002", "Yesterday, 16:40", 1100, true, "Competence and training procedure, view only.", "Maria Santos"),
  n("nt-05", "Aaron Lim", "Audit", "Internal audit IA-2026-05 planned for 21 Oct", "/audits/IA-2026-05", "Yesterday, 11:05", 1400, true, "Operations, lead auditor Daniel Reyes.", "Maria Santos"),
  n("nt-06", "Aaron Lim", "Comment", "Grace Lim commented on SAL-PRO-003", "/documents/SAL-PRO-003", "12 Oct", 2900, true, "“Section 5 still mentions the old quotation form.”", "Grace Lim"),
  n("nt-07", "Aaron Lim", "Policy", "Acknowledge the quality policy, revision 04", "/qms/policies", "10 Oct", 5800, true),
  // Maria Santos, quality manager
  n("nt-11", "Maria Santos", "Waiting on you", "Verify NC-2026-005 Torque wrenches", "/corrective-action/NC-2026-005", "Today, 09:10", 60, false, "Paolo Ramos marked the action done. Due 17 Oct.", "Paolo Ramos"),
  n("nt-12", "Maria Santos", "Remark", "New consultant remark on PUR-PRO-002", "/documents/PUR-PRO-002", "Today, 10:12", 20, false, "Section 4 says suppliers are re-evaluated “regularly”."),
  n("nt-13", "Maria Santos", "Overdue", "IA-2026-06 report is 6 days late", "/audits/IA-2026-06", "Today, 07:00", 220, false),
  n("nt-14", "Maria Santos", "Assigned", "You own the certification task “Record whether climate change is relevant”", "/readiness", "Yesterday, 15:20", 1150, true, undefined, "Rafael Ong"),
  // Joy Aquino, process owner
  n("nt-21", "Joy Aquino", "Overdue", "NC-2026-007 is 9 days overdue", "/corrective-action/NC-2026-007", "Today, 07:00", 220, false, "Add the root cause and the action plan."),
  n("nt-22", "Joy Aquino", "Assigned", "Task: re-evaluate all approved suppliers for 2026", "/readiness", "2 Oct", 17000, true),
  // Paolo Ramos
  n("nt-31", "Paolo Ramos", "Assigned", "You were added to NC-2026-005 as owner", "/corrective-action/NC-2026-005", "18 Jun", 170000, true, undefined, "Maria Santos"),
  // Rafael Ong, consultant
  n("nt-41", "Rafael Ong", "Comment", "Maria Santos replied to your remark on QMS-MAN-001", "/documents/QMS-MAN-001", "7 Oct, 16:00", 10000, false, "“Updated in revision 07.”", "Maria Santos"),
]
