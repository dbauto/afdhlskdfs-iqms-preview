import type { Area, AccessLevel, ContextIssue, InterestedParty, Person, Process, Role } from "./types"

export const ORG = {
  name: "Arden & Co.",
  short: "AC",
  domain: "arden.example",
  workspaceId: "ws_7f3a21",
  plan: "Business",
  seats: 160,
}

export const AREAS: Area[] = [
  "Overview",
  "QMS",
  "Organization & Scope",
  "Policies",
  "Processes",
  "Objectives & KPIs",
  "Documents",
  "Risks & Opportunities",
  "Evidence",
  "Audits",
  "Management Review",
  "Corrective Action",
  "Settings",
]

const access = (levels: AccessLevel[]): Record<Area, AccessLevel> =>
  Object.fromEntries(AREAS.map((a, i) => [a, levels[i]])) as Record<Area, AccessLevel>

//                              Ov      QMS     Org     Pol     Proc          Obj           Docs          Risks         Evid          Audits   MR       CA            Settings
export const ROLES: Role[] = [
  { id: "viewer", name: "Viewer", purpose: "Reads published documents and records.", scope: "All processes", system: true, access: access(["View", "View", "View", "View", "View", "View", "View", "View", "View", "View", "None", "View", "None"]) },
  { id: "contributor", name: "Contributor", purpose: "Adds records for the processes they work in.", scope: "Processes they are assigned to", system: true, access: access(["View", "View", "View", "View", "View", "View", "Add and edit", "Add and edit", "Add and edit", "View", "None", "Add and edit", "None"]) },
  { id: "owner", name: "Process owner", purpose: "Runs a process: its documents, risks, objectives and actions.", scope: "Processes they own", system: true, access: access(["View", "View", "View", "View", "Add and edit", "Add and edit", "Approve", "Add and edit", "Add and edit", "View", "View", "Approve", "None"]) },
  { id: "top", seesReadiness: true, confidentialRead: true, name: "Top management", purpose: "Directors. See every process and its records, run the processes they own and take part in management review.", scope: "All processes", access: access(["View", "View", "View", "View", "Add and edit", "Add and edit", "Approve", "Add and edit", "Add and edit", "View", "View", "Approve", "None"]) },
  { id: "auditor", name: "Auditor", purpose: "Plans and runs internal audits and raises findings.", scope: "Not their own process", system: true, access: access(["View", "View", "View", "View", "View", "View", "View", "View", "View", "Manage", "View", "Add and edit", "None"]) },
  { id: "guest-auditor", name: "Guest auditor", purpose: "Outside auditor. Sees only the audits they’re assigned to. Access ends on a set date.", scope: "Not their own process", access: access(["View", "View", "View", "View", "View", "View", "View", "View", "View", "Add and edit", "None", "View", "None"]) },
  { id: "consultant", seesReadiness: true, name: "Consultant", purpose: "Outside ISO consultant helping you get certified. Sees the QMS, leaves remarks, drafts records and lists what’s needed. Can’t approve or publish. Access ends on a set date.", scope: "All processes", system: true, access: access(["View", "View", "Add and edit", "Add and edit", "View", "Add and edit", "Add and edit", "Add and edit", "View", "View", "View", "View", "None"]) },
  { id: "quality", seesReadiness: true, confidentialRead: true, name: "Quality manager", purpose: "Looks after the whole QMS.", scope: "All processes", system: true, access: access(["View", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "View"]) },
  { id: "admin", seesReadiness: true, confidentialRead: true, name: "Administrator", purpose: "Full access: manages people, roles and workspace settings, and can see and change every record.", scope: "All processes", system: true, access: access(["View", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage", "Manage"]) },
]

export const PEOPLE: Person[] = [
  { id: "p-ms", name: "Maria Santos", title: "Quality & Compliance Manager", email: "maria.santos@arden.example", roleId: "quality", scope: "All processes", status: "Active", lastActive: "Now" },
  { id: "p-al", name: "Aaron Lim", title: "IT & Systems Administrator", email: "aaron.lim@arden.example", roleId: "admin", scope: "Workspace settings", status: "Active", lastActive: "Now" },
  { id: "p-en", name: "Eric Navarro", title: "Managing Director", email: "eric.navarro@arden.example", roleId: "top", scope: "All processes", status: "Active", lastActive: "Today" },
  { id: "p-nf", name: "Nina Flores", title: "Document Control Coordinator", email: "nina.flores@arden.example", roleId: "quality", scope: "All processes", status: "Active", lastActive: "12 min ago" },
  { id: "p-gl", name: "Grace Lim", title: "Sales Manager", email: "grace.lim@arden.example", roleId: "owner", scope: "Sales & customer", status: "Active", lastActive: "1 h ago" },
  { id: "p-dr", name: "Daniel Reyes", title: "Design Engineer, lead auditor", email: "daniel.reyes@arden.example", roleId: "owner", scope: "Design & development", status: "Active", lastActive: "Today" },
  { id: "p-ja", name: "Joy Aquino", title: "Purchasing Manager", email: "joy.aquino@arden.example", roleId: "owner", scope: "Purchasing & suppliers", status: "Active", lastActive: "1 h ago" },
  { id: "p-cm", name: "Carlos Mendoza", title: "Operations Manager", email: "carlos.mendoza@arden.example", roleId: "owner", scope: "Operations", status: "Active", lastActive: "Today" },
  { id: "p-ac", name: "Ana Cruz", title: "Inspection Supervisor", email: "ana.cruz@arden.example", roleId: "owner", scope: "Inspection & release", status: "Active", lastActive: "Yesterday" },
  { id: "p-rt", name: "Rosa Tan", title: "HR & Training Lead", email: "rosa.tan@arden.example", roleId: "owner", scope: "People & competence", status: "Active", lastActive: "2 days ago" },
  { id: "p-pr", name: "Paolo Ramos", title: "Equipment Coordinator", email: "paolo.ramos@arden.example", roleId: "owner", scope: "Infrastructure & equipment", status: "Active", lastActive: "Today" },
  { id: "p-kd", name: "Kim Dela Cruz", title: "Design Engineer, auditor", email: "kim.delacruz@arden.example", roleId: "auditor", scope: "Not her own process", status: "Active", lastActive: "Today" },
  { id: "p-bc", name: "Ben Castillo", title: "Production Supervisor", email: "ben.castillo@arden.example", roleId: "contributor", scope: "Operations", status: "Active", lastActive: "Yesterday" },
  { id: "p-ec", accessEndsOn: "2026-11-30", name: "Elena Cruz", title: "Consultant, North Audit Partners", email: "elena.cruz@northaudit.example", roleId: "guest-auditor", scope: "Ends 30 Nov 2026", status: "Guest", lastActive: "3 days ago" },
  { id: "p-ro", name: "Rafael Ong", title: "ISO consultant, QualiPro Consulting", email: "rafael.ong@qualipro.example", roleId: "consultant", scope: "Ends 31 Mar 2027", status: "Guest", lastActive: "Today" },
  { id: "p-pre", name: "Paul Reyes", title: "Former buyer", email: "paul.reyes@arden.example", roleId: "viewer", scope: "All processes", status: "Deactivated", lastActive: "2 Sep 2026" },
]

// More people so the users table has realistic length (146 seats used).
const FIRST = ["Jessa", "Mark", "Rina", "Dennis", "Faith", "Jun", "Lea", "Rico", "Sheila", "Vince", "Bea", "Noel", "Tess", "Arnel", "Kris", "Mylene", "Oscar", "Pia", "Ruel", "Celine"]
const LAST = ["Lopez", "Torres", "Castillo", "Uy", "Navarro", "Morales", "Ocampo"]
const SCOPES = ["All processes", "Operations", "Inspection & release", "Purchasing & suppliers", "Infrastructure & equipment"]
// every first and last name pair at most once, so no two people share a name (records refer to people by name)
for (let i = 0; PEOPLE.length < 148 && i < FIRST.length * LAST.length; i++) {
  const name = `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`
  if (PEOPLE.some((p) => p.name === name)) continue
  PEOPLE.push({
    id: `p-x${i}`,
    name,
    title: i % 4 ? "Production operator" : "Quality inspector",
    email: `${name.toLowerCase().replace(" ", ".")}@arden.example`,
    roleId: i % 4 ? "viewer" : "contributor",
    scope: SCOPES[i % SCOPES.length],
    status: "Active",
    lastActive: `${(i % 28) + 6} days ago`,
  })
}

export const CURRENT_USER_ID = "p-al"

export const PROCESSES: Process[] = [
  { id: "leadership", name: "Leadership & planning", owner: "Eric Navarro", clauses: "4.1–4.4, 5, 6.2, 9.3", band: "Management", purpose: "Sets direction, the quality policy and objectives, and reviews how the QMS is doing.", inputs: ["Context and interested parties", "Results of the previous review"], activities: ["Set policy and objectives", "Plan changes", "Run management review"], outputs: ["Quality policy", "Objectives", "Review decisions"], involved: "Directors, Quality manager", feeds: "Every process" },
  { id: "sales", name: "Sales & customer", owner: "Grace Lim", clauses: "8.2, 9.1.2", band: "Core", purpose: "Agrees what the customer needs before an order is accepted, and listens to feedback.", inputs: ["Enquiries and drawings", "Customer feedback"], activities: ["Quote", "Review the contract", "Handle complaints"], outputs: ["Accepted orders", "Satisfaction results"], involved: "Sales team", feeds: "Design & development, Operations" },
  { id: "design", name: "Design & development", owner: "Daniel Reyes", clauses: "8.3", band: "Core", purpose: "Turns customer requirements into verified designs and drawings.", inputs: ["Accepted orders with design work", "Standards"], activities: ["Plan design", "Review, verify and validate", "Control changes"], outputs: ["Released drawings", "Design records"], involved: "Design engineers", feeds: "Purchasing & suppliers, Operations" },
  { id: "purchasing", name: "Purchasing & suppliers", owner: "Joy Aquino", clauses: "8.4", band: "Core", purpose: "Makes sure everything bought in, from materials to outsourced services, comes from suppliers that have been evaluated and meet our requirements.", inputs: ["Purchase requisitions", "Material and service specifications", "Supplier performance data"], activities: ["Select and evaluate suppliers", "Place purchase orders", "Check goods and services received", "Re-evaluate suppliers each year"], outputs: ["Approved supplier list", "Purchase orders", "Supplier evaluations"], involved: "Buyers, Goods-in inspectors", feeds: "Operations, Inspection & release" },
  { id: "operations", name: "Operations", owner: "Carlos Mendoza", clauses: "8.1, 8.5", band: "Core", purpose: "Plans and makes parts to the released drawings, with traceability.", inputs: ["Accepted orders", "Released drawings", "Materials"], activities: ["Plan production", "Set up and run machines", "Identify and trace parts"], outputs: ["Finished parts", "Production records"], involved: "Supervisors, operators", feeds: "Inspection & release" },
  { id: "inspection", name: "Inspection & release", owner: "Ana Cruz", clauses: "8.6, 8.7", band: "Core", purpose: "Checks parts before release and controls anything that doesn’t conform.", inputs: ["Finished parts", "Inspection plans"], activities: ["Inspect", "Release", "Control nonconforming output"], outputs: ["Released parts", "Inspection reports"], involved: "Inspectors", feeds: "Sales & customer" },
  { id: "people", name: "People & competence", owner: "Rosa Tan", clauses: "7.1.2, 7.2, 7.3", band: "Support", purpose: "Makes sure people are competent and aware of the QMS.", inputs: ["Role requirements", "Training needs"], activities: ["Recruit and induct", "Train", "Check competence"], outputs: ["Training records", "Competence matrix"], involved: "Managers, HR", feeds: "Every process" },
  { id: "infrastructure", name: "Infrastructure & equipment", owner: "Paolo Ramos", clauses: "7.1.3–7.1.5", band: "Support", purpose: "Keeps machines, buildings and measuring equipment fit for use.", inputs: ["Equipment register", "Maintenance plans"], activities: ["Maintain", "Calibrate", "Replace"], outputs: ["Maintenance logs", "Calibration certificates"], involved: "Maintenance team", feeds: "Operations, Inspection & release" },
  { id: "improvement", name: "Monitoring & improvement", owner: "Maria Santos", clauses: "9.1, 9.2, 10", band: "Management", purpose: "Measures, audits and improves the QMS.", inputs: ["KPI results", "Audit findings", "Nonconformities"], activities: ["Monitor and measure", "Audit", "Correct and improve"], outputs: ["Audit reports", "Corrective actions", "Improvements"], involved: "Quality team, auditors", feeds: "Leadership & planning" },
]

// Process memberships: the people who work in each process besides its owner. People whose role
// covers only assigned processes see just these processes and their records (plan v3 §9).
for (const p of PROCESSES) p.members = PEOPLE.filter((x) => x.scope === p.name && x.name !== p.owner && x.roleId !== "owner").map((x) => x.name)

/** ISO dates each issue and interested party was last changed (synthetic). */
const CHANGED: Record<string, string> = {
  "ip-1": "2026-07-01", "ip-2": "2025-11-04", "ip-3": "2026-09-15", "ip-4": "2026-03-02", "ip-5": "2026-08-18", "ip-6": "2025-10-20", "ip-7": "2026-01-12", "ip-8": "2025-09-30", "ip-9": "2026-02-27",
  "ci-1": "2026-06-12", "ci-2": "2026-08-03", "ci-3": "2026-09-22", "ci-4": "2026-03-10", "ci-5": "2025-11-20", "ci-6": "2026-05-28",
}

export const PARTIES: InterestedParty[] = [
  { id: "ip-1", name: "Customers", needs: "Parts to drawing, on time, with traceable inspection records", howMonitored: "Satisfaction survey, complaints, on-time delivery" },
  { id: "ip-2", name: "Employees", needs: "Safe work, clear instructions, training for their role", howMonitored: "Training records, team meetings" },
  { id: "ip-3", name: "Suppliers and subcontractors", needs: "Clear specifications, fair evaluation, timely payment", howMonitored: "Supplier evaluations", reviewDue: true },
  { id: "ip-4", name: "Certification body", needs: "Access to records and people during audits", howMonitored: "Audit plans and reports" },
  { id: "ip-5", name: "Regulators and local authority", needs: "Compliance with product safety and environmental permits", howMonitored: "Permit register" },
  { id: "ip-6", name: "Owners and directors", needs: "A profitable business with a good reputation", howMonitored: "Management review" },
  { id: "ip-7", name: "Insurers", needs: "Evidence that risks are controlled", howMonitored: "Annual renewal" },
  { id: "ip-8", name: "Local community", needs: "Quiet operation and responsible waste handling", howMonitored: "Complaints log" },
  { id: "ip-9", name: "Banks", needs: "Stable finances and accreditation", howMonitored: "Quarterly reports" },
]

export const ISSUES: ContextIssue[] = [
  { id: "ci-1", kind: "External", issue: "Customers moving to digital drawings and portals", effect: "Need controlled exchange of drawings" },
  { id: "ci-2", kind: "External", issue: "Rising cost and lead time of packaging materials", effect: "Single-source risk, R-031" },
  { id: "ci-3", kind: "External", issue: "New product safety rules for industrial equipment", effect: "Update product safety policy" },
  { id: "ci-4", kind: "Internal", issue: "Two experienced inspectors retiring in 2027", effect: "Cross-training plan, R-027" },
  { id: "ci-5", kind: "Internal", issue: "Oldest CNC machine near end of life", effect: "Replacement planned, R-021" },
  { id: "ci-6", kind: "Internal", issue: "Move of design files to SharePoint", effect: "Better control of documented information" },
]

for (const x of [...PARTIES, ...ISSUES]) x.changedDate = CHANGED[x.id]

// Operations' inputs: one linked to Sales' output, one from outside the company
PROCESSES.find((p) => p.id === "operations")!.inputLinks = [
  { id: "in-1", fromProcess: "sales", docId: "SAL-REC-011" },
  { id: "in-2", outside: "Customer drawings and specifications" },
]
