import { addDays, addMonths, nextResultPeriod, parseDisplayDate, previousResultPeriod, resultPeriodRange, todayIso } from "@/lib/periods"
import type {
  Audit,
  Auditor,
  Remark,
  Requirement,
  ChecklistSection,
  Classification,
  DocRecord,
  DocStage,
  EvidenceFile,
  EvidenceItem,
  Nonconformity,
  Objective,
  ObjectiveResult,
  Policy,
  Risk,
  Severity,
} from "./types"

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

const REVIEW_ROUTE = {
  reviewers: ["Nina Flores"],
  approvalMode: "Everyone must approve" as const,
}

function doc(
  id: string,
  title: string,
  process: string,
  type: string,
  rev: string,
  stage: DocStage,
  owner: string,
  nextReview: string,
  o: { cls?: Classification; lateBy?: string; overdue?: boolean; description?: string; clauses?: string[] } = {}
): DocRecord {
  const cls = o.cls ?? "Internal"
  const lib = process.split(" ")[0]
  return {
    id,
    title,
    process,
    type,
    rev,
    stage,
    owner,
    nextReview,
    classification: cls,
    lateBy: o.lateBy,
    reviewOverdue: o.overdue,
    description: o.description ?? `${type} for ${process.toLowerCase()}. Says who does what and which records are kept.`,
    link: `https://arden.sharepoint.example/sites/QMS/${lib}/${id}.docx`,
    clauses: o.clauses ?? [],
    viewers: cls === "Highly confidential" ? [owner, "Eric Navarro", "Maria Santos"] : cls === "Confidential" ? [owner, "Maria Santos"] : [],
    reviewers: REVIEW_ROUTE.reviewers,
    approvers: [owner === "Maria Santos" ? "Eric Navarro" : "Maria Santos"],
    approvalMode: REVIEW_ROUTE.approvalMode,
  }
}

const FIXED_DOCS: DocRecord[] = [
  doc("QMS-MAN-001", "Quality manual and QMS scope", "Leadership & planning", "Manual", "07", "Published", "Maria Santos", "12 Mar 2027", { cls: "Public", clauses: ["4.3"] }),
  doc("QMS-POL-001", "Quality policy", "Leadership & planning", "Policy", "04", "Published", "Eric Navarro", "30 Jan 2027", { cls: "Public", clauses: ["5.2"] }),
  doc("SAL-REC-011", "Key account contracts", "Sales & customer", "Record", "03", "Published", "Grace Lim", "9 Jan 2027", {
    cls: "Highly confidential",
    description: "Signed pricing terms for key customer accounts. Used at contract review to confirm agreed prices before an order is accepted.",
    clauses: ["8.2.3"],
  }),
  doc("SAL-PRO-003", "Contract and order review", "Sales & customer", "Procedure", "05", "Approval", "Grace Lim", "18 Feb 2027", { clauses: ["8.2.3"] }),
  doc("DES-PRO-001", "Design and development control", "Design & development", "Procedure", "03", "Changes requested", "Daniel Reyes", "10 Feb 2027", { clauses: ["8.3"] }),
  doc("PUR-PRO-002", "Supplier selection and evaluation", "Purchasing & suppliers", "Procedure", "02", "Technical review", "Joy Aquino", "9 Oct 2026", { lateBy: "4 days late", overdue: true, clauses: ["8.4.1"] }),
  doc("PUR-FRM-004", "Approved supplier list", "Purchasing & suppliers", "Register", "11", "Published", "Joy Aquino", "1 Oct 2026", { overdue: true, cls: "Confidential", clauses: ["8.4.1"] }),
  doc("OPS-WI-014", "Line clearance", "Operations", "Work instruction", "03", "Approval", "Carlos Mendoza", "22 Apr 2027", {
    description: "How a production line is cleared of parts, labels and documents from the previous batch before the next batch starts.",
    clauses: ["8.5.1", "8.5.2"],
  }),
  doc("OPS-PRO-001", "Production planning and control", "Operations", "Procedure", "06", "Published", "Carlos Mendoza", "5 Jun 2027", { clauses: ["8.1", "8.5.1"] }),
  doc("INS-PRO-002", "Final inspection and release", "Inspection & release", "Procedure", "04", "Ready to publish", "Ana Cruz", "14 May 2027", { clauses: ["8.6"] }),
  doc("EQP-PRO-001", "Calibration of measuring equipment", "Infrastructure & equipment", "Procedure", "05", "Published", "Paolo Ramos", "20 Nov 2026", { clauses: ["7.1.5"] }),
  doc("EQP-WI-007", "Torque wrench calibration check", "Infrastructure & equipment", "Work instruction", "02", "Technical review", "Paolo Ramos", "24 Oct 2027", { clauses: ["7.1.5"] }),
  doc("HR-PRO-002", "Competence and training", "People & competence", "Procedure", "04", "Approval", "Rosa Tan", "30 Oct 2027", { clauses: ["7.2"] }),
  doc("HR-FRM-003", "Training needs assessment", "People & competence", "Form", "01", "Draft", "Rosa Tan", "Not set", { cls: "Confidential", clauses: ["7.2"] }),
  doc("IMP-PRO-001", "Nonconformity and corrective action", "Monitoring & improvement", "Procedure", "04", "Published", "Maria Santos", "8 Aug 2027", { clauses: ["10.2"] }),
]
// Daniel Reyes reviewed this procedure, so he shouldn't judge it in the Operations audit (shows the record-level check).
FIXED_DOCS.find((d) => d.id === "OPS-PRO-001")!.reviewers = ["Nina Flores", "Daniel Reyes"]
// Paul Reyes reviewed the last revision and has since left, so a new revision swaps in the default reviewer.
FIXED_DOCS.find((d) => d.id === "PUR-FRM-004")!.reviewers = ["Paul Reyes"]

const TYPE: Record<string, string> = { MAN: "Manual", PRO: "Procedure", FRM: "Form", WI: "Work instruction", REG: "Register", STD: "Standard" }
const POOL: [string, string, string, [string, string][]][] = [
  ["QMS", "Leadership & planning", "Maria Santos", [["MAN", "Process map"], ["PRO", "Control of documented information"], ["PRO", "Management review"], ["REG", "Context and interested parties"], ["PRO", "Internal communication"]]],
  ["SAL", "Sales & customer", "Grace Lim", [["PRO", "Customer feedback and complaints"], ["FRM", "Quotation request"], ["FRM", "Customer satisfaction survey"], ["PRO", "Order entry"], ["FRM", "Contract review checklist"], ["WI", "Customer property handling"], ["FRM", "Return authorisation"]]],
  ["DES", "Design & development", "Daniel Reyes", [["FRM", "Design input checklist"], ["FRM", "Design review record"], ["PRO", "Design verification and validation"], ["PRO", "Design change control"], ["STD", "Drawing standard"]]],
  ["PUR", "Purchasing & suppliers", "Joy Aquino", [["FRM", "Supplier evaluation form"], ["PRO", "Purchasing"], ["FRM", "Purchase order terms"], ["WI", "Goods-in inspection"], ["FRM", "Supplier corrective action request"]]],
  ["OPS", "Operations", "Carlos Mendoza", [["WI", "CNC machine setup"], ["WI", "First-off approval"], ["WI", "Deburring and finishing"], ["FRM", "Production traveller"], ["PRO", "Identification and traceability"], ["WI", "Packaging and labelling"], ["PRO", "Preservation and storage"], ["WI", "Tool change"]]],
  ["INS", "Inspection & release", "Ana Cruz", [["WI", "In-process inspection"], ["FRM", "Final inspection report"], ["PRO", "Control of nonconforming output"], ["FRM", "Concession request"], ["WI", "CMM measurement"]]],
  ["HR", "People & competence", "Rosa Tan", [["PRO", "Recruitment and induction"], ["FRM", "Training record"], ["REG", "Competence matrix"], ["FRM", "Induction checklist"]]],
  ["EQP", "Infrastructure & equipment", "Paolo Ramos", [["REG", "Equipment register"], ["PRO", "Preventive maintenance"], ["FRM", "Maintenance log"], ["WI", "Gauge handling and storage"], ["WI", "Compressed air system checks"]]],
  ["IMP", "Monitoring & improvement", "Maria Santos", [["PRO", "Internal audit"], ["FRM", "Audit checklist"], ["PRO", "Monitoring and measurement"], ["FRM", "Improvement suggestion"], ["REG", "KPI register"]]],
]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const LATE: Record<number, string> = { 3: "15 Sep 2026", 17: "28 Aug 2026", 29: "2 Oct 2026", 41: "20 Sep 2026" }

const GEN_DOCS: DocRecord[] = []
POOL.forEach(([pre, process, owner, items]) => {
  items.forEach(([t, title], k) => {
    const i = GEN_DOCS.length
    const id = `${pre}-${t}-${String(10 + k).padStart(3, "0")}`
    const rev = String(((i * 7) % 9) + 1).padStart(2, "0")
    const next = LATE[i] ?? `${((i * 5) % 28) + 1} ${MONTHS[(i * 7) % 12]} 2027`
    const cls: Classification =
      title === "Competence matrix" || title === "Training record" ? "Confidential" : title === "Customer satisfaction survey" ? "Public" : "Internal"
    GEN_DOCS.push(doc(id, title, process, TYPE[t], rev, "Published", owner, next, { overdue: !!LATE[i], cls }))
  })
})

export const DOCUMENTS: DocRecord[] = FIXED_DOCS.concat(GEN_DOCS).slice(0, 63)

export const DOC_TYPES = ["Manual", "Policy", "Procedure", "Work instruction", "Form", "Register", "Record", "Standard"]

/* ------------------------------------------------------------------ */
/* Nonconformities and corrective action                               */
/* ------------------------------------------------------------------ */

function nc(
  id: string,
  title: string,
  process: string,
  clause: string,
  source: string,
  severity: Severity,
  stage: number,
  owner: string,
  due: string,
  late = false
): Nonconformity {
  return {
    id,
    title,
    process,
    clause,
    source,
    severity,
    stage,
    owner,
    verifier: "Maria Santos",
    due,
    late,
    details: "",
    containment: "",
    rootCause: "",
    tasks: [],
    raised: "",
  }
}

export const NONCONFORMITIES: Nonconformity[] = [
  nc("NC-2026-007", "Approved supplier list not re-evaluated for 2026", "Purchasing & suppliers", "8.4.1", "Audit IA-2026-04", "Major", 2, "Joy Aquino", "4 Oct", true),
  {
    ...nc("NC-2026-005", "Torque wrenches used past their calibration date", "Infrastructure & equipment", "7.1.5", "Audit IA-2026-02", "Minor", 4, "Paolo Ramos", "17 Oct"),
    raised: "18 Jun",
    details:
      "During internal audit IA-2026-02, 3 of the 12 torque wrenches in Assembly were in use between 2 and 6 weeks after their calibration due date. Clause 7.1.5.2 requires measuring equipment to be calibrated at specified intervals before use.",
    containment:
      "The three wrenches were taken out of use and sent for calibration. All 41 joints assembled with them since their due dates were re-torqued and checked. No nonconforming product reached a customer.",
    rootCause:
      "Due dates were kept in a personal spreadsheet with no reminders, and no one was responsible for equipment in each area. When the coordinator was on leave in May, nobody checked the dates.",
    tasks: [
      { id: "t1", name: "Move calibration due dates into the equipment register with reminders", accountable: "Paolo Ramos", helpers: [], due: "15 Aug", done: true },
      { id: "t2", name: "Name an equipment owner for each production area", accountable: "Carlos Mendoza", helpers: ["Ben Castillo", "Ana Cruz"], due: "20 Aug", done: true },
      { id: "t3", name: "Brief supervisors on checking the calibration label before use", accountable: "Paolo Ramos", helpers: [], due: "2 Sep", done: true },
    ],
  },
  nc("NC-2026-008", "Wrong label revision shipped to customer", "Inspection & release", "8.6", "Customer complaint", "Major", 1, "Ana Cruz", "24 Oct"),
  nc("NC-2026-009", "Goods-in check skipped for two deliveries", "Purchasing & suppliers", "8.4.2", "Audit IA-2026-04", "Minor", 2, "Joy Aquino", "31 Oct"),
  nc("NC-2026-010", "Late resin delivery stopped line 2 for a shift", "Operations", "8.4.3", "Supplier", "Minor", 0, "Carlos Mendoza", "6 Nov"),
  nc("NC-2026-006", "Training record missing for new inspector", "People & competence", "7.2", "Process check", "Minor", 4, "Rosa Tan", "20 Oct"),
  nc("NC-2026-011", "Concessions released without customer signature", "Inspection & release", "8.7", "Audit IA-2026-06", "Minor", 1, "Ana Cruz", "10 Nov"),
  nc("NC-2026-004", "Design input checklist missed a load case", "Design & development", "8.3.3", "Audit IA-2026-11", "Minor", 6, "Daniel Reyes", "Closed 18 Sep"),
  nc("NC-2026-003", "Customer drawing revision not checked at order entry", "Sales & customer", "8.2.3", "Customer complaint", "Major", 6, "Grace Lim", "Closed 2 Sep"),
  nc("NC-2026-002", "Expired adhesive found in stores", "Operations", "8.5.4", "Process check", "Minor", 6, "Ben Castillo", "Closed 14 Aug"),
  nc("NC-2026-001", "Review minutes missing a resource decision", "Leadership & planning", "9.3.3", "Audit IA-2026-01", "Minor", 6, "Maria Santos", "Closed 30 Jun"),
  nc("NC-2025-014", "Packaging labels printed with the old logo", "Operations", "8.5.2", "Process check", "Minor", 6, "Carlos Mendoza", "Closed 12 Dec"),
  nc("NC-2025-013", "Supplier certificate of conformity not filed", "Purchasing & suppliers", "8.4.2", "Audit IA-2025-09", "Minor", 6, "Joy Aquino", "Closed 28 Nov"),
  nc("NC-2025-012", "Inspector signed off without a CMM report", "Inspection & release", "8.6", "Audit IA-2025-08", "Major", 6, "Ana Cruz", "Closed 6 Nov"),
  nc("NC-2025-011", "Late delivery to a key customer on three orders", "Operations", "8.5.1", "Customer complaint", "Minor", 6, "Carlos Mendoza", "Closed 20 Oct"),
  nc("NC-2025-010", "Training matrix not updated after reorganisation", "People & competence", "7.2", "Audit IA-2025-07", "Minor", 6, "Rosa Tan", "Closed 1 Oct"),
  nc("NC-2025-009", "Height gauge used without a calibration label", "Infrastructure & equipment", "7.1.5", "Process check", "Minor", 6, "Paolo Ramos", "Closed 15 Sep"),
  nc("NC-2025-008", "Quotation issued without contract review", "Sales & customer", "8.2.3", "Audit IA-2025-05", "Minor", 6, "Grace Lim", "Closed 22 Aug"),
  nc("NC-2025-007", "Obsolete work instruction found at line 3", "Operations", "7.5.3", "Audit IA-2025-04", "Minor", 6, "Carlos Mendoza", "Closed 30 Jul"),
  nc("NC-2025-006", "Wrong material grade received and used", "Purchasing & suppliers", "8.4.3", "Supplier", "Major", 6, "Joy Aquino", "Closed 9 Jul"),
  nc("NC-2025-005", "KPI results not reviewed for two months", "Monitoring & improvement", "9.1.3", "Process check", "Minor", 6, "Maria Santos", "Closed 18 Jun"),
]

export const NC_SOURCES = ["Internal audit", "Customer complaint", "Supplier", "Process check", "Other"]

/* ------------------------------------------------------------------ */
/* Risks and opportunities                                             */
/* ------------------------------------------------------------------ */

const risk = (
  id: string,
  title: string,
  kind: "Risk" | "Opportunity",
  process: string,
  likelihood: number,
  impact: number,
  treatment: string,
  owner: string,
  review: string,
  late = false
): Risk => ({ id, title, kind, process, likelihood, impact, treatment, action: treatment, owner, review, late })

export const RISKS: Risk[] = [
  risk("R-031", "Single source for packaging material", "Risk", "Purchasing & suppliers", 4, 4, "Reduce it", "Joy Aquino", "31 Oct"),
  risk("R-012", "Measuring equipment used out of calibration", "Risk", "Infrastructure & equipment", 3, 5, "Reduce it", "Paolo Ramos", "15 Jan"),
  risk("R-027", "Key inspector leaves with no trained cover", "Risk", "People & competence", 3, 4, "Reduce it", "Rosa Tan", "30 Sep", true),
  risk("R-019", "Customer drawings change after order acceptance", "Risk", "Sales & customer", 3, 3, "Reduce it", "Grace Lim", "20 Nov"),
  risk("O-004", "Digital goods-in checks cut inspection time", "Opportunity", "Purchasing & suppliers", 4, 3, "Pursue it", "Joy Aquino", "5 Dec"),
  risk("R-008", "Power cut stops curing ovens mid-batch", "Risk", "Operations", 2, 3, "Accept it", "Carlos Mendoza", "12 Feb"),
  risk("R-030", "Customer specification misread at quotation", "Risk", "Sales & customer", 2, 4, "Reduce it", "Grace Lim", "14 Jan"),
  risk("R-029", "Loss of design files kept on local drives", "Risk", "Design & development", 2, 4, "Reduce it", "Daniel Reyes", "3 Dec"),
  risk("R-028", "Coolant contamination affects surface finish", "Risk", "Operations", 3, 2, "Reduce it", "Carlos Mendoza", "22 Nov"),
  risk("R-026", "Late customer drawings delay planning", "Risk", "Sales & customer", 4, 2, "Reduce it", "Grace Lim", "9 Dec"),
  risk("R-025", "Subcontract plating quality varies", "Risk", "Purchasing & suppliers", 3, 3, "Reduce it", "Joy Aquino", "18 Nov"),
  risk("R-024", "CMM breakdown stops final inspection", "Risk", "Inspection & release", 2, 4, "Share or transfer it", "Ana Cruz", "6 Feb"),
  risk("R-023", "New staff start work before induction", "Risk", "People & competence", 2, 3, "Reduce it", "Rosa Tan", "11 Jan"),
  risk("R-022", "Wrong drawing revision used on the floor", "Risk", "Operations", 2, 4, "Reduce it", "Carlos Mendoza", "27 Jan"),
  risk("R-021", "Spare parts for the oldest CNC no longer made", "Risk", "Infrastructure & equipment", 3, 3, "Reduce it", "Paolo Ramos", "30 Nov"),
  risk("R-020", "Audit programme slips in busy months", "Risk", "Monitoring & improvement", 3, 2, "Reduce it", "Maria Santos", "15 Dec"),
  risk("R-018", "Currency swings raise material costs", "Risk", "Purchasing & suppliers", 3, 2, "Accept it", "Joy Aquino", "1 Mar"),
  risk("R-017", "Customer drawings shared by email without control", "Risk", "Sales & customer", 2, 3, "Reduce it", "Aaron Lim", "20 Jan"),
  risk("O-007", "Customer portal for order status", "Opportunity", "Sales & customer", 3, 3, "Explore further", "Grace Lim", "12 Dec"),
  risk("O-006", "Shared tooling library cuts setup time", "Opportunity", "Operations", 3, 3, "Pursue it", "Carlos Mendoza", "8 Jan"),
  risk("O-005", "Apprenticeship scheme with the local college", "Opportunity", "People & competence", 2, 4, "Explore further", "Rosa Tan", "20 Feb"),
  risk("O-003", "Energy savings from new compressors", "Opportunity", "Infrastructure & equipment", 3, 2, "Explore further", "Paolo Ramos", "14 Mar"),
  risk("O-002", "Supplier scorecards shared every month", "Opportunity", "Purchasing & suppliers", 4, 2, "Pursue it", "Joy Aquino", "30 Jan"),
  risk("O-001", "Automated KPI reports for review meetings", "Opportunity", "Monitoring & improvement", 3, 3, "Not now", "Maria Santos", "28 Feb"),
]
// Treatment details for the top risks
const ACTIONS: Record<string, string> = {
  "R-031": "Qualify a second packaging supplier",
  "R-012": "Register reminders in place",
  "R-027": "Cross-train two operators",
  "R-019": "Revision check at kickoff",
  "O-004": "Pilot on line 1",
  "R-008": "Accepted, monitor",
}
RISKS.forEach((r) => (r.action = ACTIONS[r.id] ?? r.treatment))
// ISO review dates: a late review fell due in the past, the others are still ahead. Risks are reviewed every six months.
RISKS.forEach((r) => {
  r.nextReviewDate = r.late ? parseDisplayDate(r.review, { notAfter: todayIso() }) : parseDisplayDate(r.review, { notBefore: todayIso() })
  if (r.nextReviewDate) r.reviewedDate = addMonths(r.nextReviewDate, -6)
})
// Nonconformities that changed the risk register (ISO 9001 clause 10.2.1 e)
const NC_RISKS: Record<string, string[]> = { "NC-2026-005": ["R-012"], "NC-2026-003": ["R-019", "R-030"], "NC-2026-008": ["R-022"], "NC-2026-007": ["R-025"] }
NONCONFORMITIES.forEach((n) => (n.risks = NC_RISKS[n.id]))
// ISO dates for the sample nonconformities. Due and closed dates come from the display strings; raised dates are set here.
const NC_RAISED: Record<string, string> = {
  "NC-2026-011": "2026-09-08", "NC-2026-010": "2026-10-08", "NC-2026-009": "2026-08-21", "NC-2026-008": "2026-10-02", "NC-2026-007": "2026-08-21", "NC-2026-006": "2026-09-10",
  "NC-2026-005": "2026-06-18", "NC-2026-004": "2026-04-20", "NC-2026-003": "2026-05-12", "NC-2026-002": "2026-06-05", "NC-2026-001": "2026-02-20",
}
NONCONFORMITIES.forEach((n) => {
  const year = Number(n.id.slice(3, 7))
  if (n.due.startsWith("Closed")) n.closedDate = parseDisplayDate(n.due, { year })
  else n.dueDate = parseDisplayDate(n.due, { year })
  n.raisedDate = NC_RAISED[n.id] ?? (n.closedDate ? addDays(n.closedDate, -75) : undefined)
})
NONCONFORMITIES.find((n) => n.id === "NC-2026-002")!.riskCheck = { note: "Stock rotation is already covered by the stores procedure. No new risk.", by: "Ben Castillo", when: "2 Aug" }

/* ------------------------------------------------------------------ */
/* Objectives and KPIs                                                 */
/* ------------------------------------------------------------------ */

export const OBJECTIVES: Objective[] = [
  { id: "OBJ-2026-01", name: "On-time delivery to customers", process: "Operations", frequency: "monthly", target: 95, unit: "%", values: [93.1, 94.0, 95.6, 96.0, 95.1, 96.2], owner: "Carlos Mendoza", nextResult: "31 Oct" },
  { id: "OBJ-2026-02", name: "Customer satisfaction score", process: "Sales & customer", frequency: "quarterly", target: 4.2, unit: "score", values: [4.0, 4.1, 4.3, 4.2, 4.3, 4.4], owner: "Grace Lim", nextResult: "15 Jan" },
  { id: "OBJ-2026-03", name: "First-pass yield", process: "Operations", frequency: "monthly", target: 94, unit: "%", values: [94.5, 93.8, 92.9, 93.1, 91.8, 91.0], owner: "Carlos Mendoza", nextResult: "31 Oct" },
  { id: "OBJ-2026-04", name: "Supplier on-time delivery", process: "Purchasing & suppliers", frequency: "monthly", target: 92, unit: "%", values: [93, 91, 89, 90, 87, 88.5], owner: "Joy Aquino", nextResult: "31 Oct" },
  { id: "OBJ-2026-05", name: "Goods received without defects", process: "Purchasing & suppliers", frequency: "monthly", target: 98, unit: "%", values: [98.4, 98.9, 99.2, 98.7, 99.0, 99.1], owner: "Joy Aquino", nextResult: "31 Oct" },
  { id: "OBJ-2026-06", name: "Corrective actions closed on time", process: "Monitoring & improvement", frequency: "monthly", target: 85, unit: "%", values: [80, 82, 86, 84, 87, 88], owner: "Maria Santos", nextResult: "31 Oct" },
  { id: "OBJ-2026-07", name: "Planned training completed", process: "People & competence", frequency: "quarterly", target: 90, unit: "%", values: [86, 88, 91, 90, 92, 93], owner: "Rosa Tan", nextResult: "15 Jan" },
]

// Supporting evidence for some objectives
OBJECTIVES[0].evidence = ["EV-0208", "EV-0214"]
OBJECTIVES[1].evidence = ["EV-0203"]
OBJECTIVES[3].evidence = ["EV-0200"]

// The management review inputs each objective feeds (clause 9.3.2). c2 covers every objective.
const FEEDS: Record<string, string[]> = { "OBJ-2026-01": ["c1", "c3"], "OBJ-2026-02": ["c1"], "OBJ-2026-03": ["c3"], "OBJ-2026-04": ["c7"], "OBJ-2026-05": ["c7"], "OBJ-2026-06": ["c4"], "OBJ-2026-07": ["d"] }
// Results by period: the six sample values are April to September 2026 (monthly) or Q2 2025 to Q3 2026 (quarterly).
OBJECTIVES.forEach((o) => {
  o.reviewInputs = FEEDS[o.id]
  let key = o.frequency === "quarterly" ? "2026-Q3" : "2026-09"
  const keys: string[] = []
  for (let i = 0; i < o.values.length; i++) {
    keys.unshift(key)
    key = previousResultPeriod(key)
  }
  o.results = o.values.map((value, i) => ({ period: keys[i], value, enteredOn: addDays(resultPeriodRange(keys[i]).end, 5), enteredBy: o.owner }))
})
// The September KPI pack is the evidence for September's results
OBJECTIVES.filter((o) => o.frequency === "monthly").forEach((o) => (o.results!.find((r) => r.period === "2026-09")!.evidence = ["EV-0208"]))
OBJECTIVES[1].results!.find((r) => r.period === "2026-Q2")!.evidence = ["EV-0203"]

/** Results in period order, oldest first. */
export const resultsOf = (o: Objective): ObjectiveResult[] => [...(o.results ?? [])].sort((a, b) => (resultPeriodRange(a.period).end < resultPeriodRange(b.period).end ? -1 : 1))

/** Adds or replaces the result for one period, and keeps the last six values for the charts. */
export function withResult(o: Objective, r: ObjectiveResult): Pick<Objective, "results" | "values"> {
  const results = [...(o.results ?? []).filter((x) => x.period !== r.period), r]
  const sorted = resultsOf({ ...o, results })
  return { results: sorted, values: sorted.slice(-6).map((x) => x.value) }
}

/** The period the next result is for: the one after the latest result, or the current one. */
export const nextPeriodFor = (o: Objective, fallback: string) => {
  const rs = resultsOf(o)
  return rs.length ? nextResultPeriod(rs[rs.length - 1].period) : fallback
}

/** Missing results are "No data", never zero. New objectives have no history. */
export const latest = (o: Objective): number | undefined => o.values[o.values.length - 1]
export const hasData = (o: Objective) => o.values.length > 0
export const onTarget = (o: Objective, v = latest(o)) => v !== undefined && v >= o.target
export const belowTarget = (o: Objective, v = latest(o)) => v !== undefined && v < o.target
export const fmtKpi = (o: Objective, v = latest(o)) => (v === undefined ? "No data" : o.unit === "%" ? `${v.toFixed(1)}%` : v.toFixed(1))
/** Text colour for the latest result. */
export const kpiTone = (o: Objective) => (!hasData(o) ? "text-muted-foreground" : onTarget(o) ? "text-done" : "text-overdue")
export const fmtTarget = (o: Objective) => `≥ ${o.unit === "%" ? `${o.target}%` : o.target}`

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

export const POLICIES: Policy[] = [
  { id: "QMS-POL-001", title: "Quality policy", summary: "Our commitment to customers, to meeting requirements and to continual improvement.", rev: "04", approvedBy: "Eric Navarro", approvedOn: "30 Jan 2026", acknowledged: 152, appliesTo: 152, state: "Current" },
  { id: "QMS-POL-002", title: "Supplier code of conduct", summary: "What we expect from suppliers on quality, ethics and delivery.", rev: "02", approvedBy: "Eric Navarro", approvedOn: "12 Nov 2025", acknowledged: 18, appliesTo: 18, state: "Review due", reviewDue: "30 Nov" },
  { id: "QMS-POL-003", title: "Product safety and conformity", summary: "How we make sure every part released is safe and meets its specification.", rev: "03", approvedBy: "Eric Navarro", approvedOn: "4 Mar 2026", acknowledged: 101, appliesTo: 112, state: "Current" },
  { id: "QMS-POL-004", title: "Information security for customer data", summary: "How customer drawings and data are stored, shared and destroyed.", rev: "01", approvedBy: "Aaron Lim", approvedOn: "18 Aug 2026", acknowledged: 49, appliesTo: 52, state: "Current" },
  { id: "QMS-POL-005", title: "Training and competence", summary: "Who decides what training each role needs and how it is recorded.", rev: "01", approvedBy: "", approvedOn: "", acknowledged: 0, appliesTo: 152, state: "Draft" },
]

/* ------------------------------------------------------------------ */
/* Audits                                                              */
/* ------------------------------------------------------------------ */

export const AUDITS: Audit[] = [
  { id: "IA-2026-01", process: "Leadership & planning", month: 1, date: "18 Feb 2026", lead: "Kim Dela Cruz", auditors: [], state: "Report issued", kind: "Planned", clauses: ["5", "6.2", "9.3"] },
  { id: "IA-2026-09", process: "People & competence", month: 2, date: "12 Mar 2026", lead: "Daniel Reyes", auditors: [], state: "Report issued", kind: "Planned", clauses: ["7.1.2", "7.2", "7.3"] },
  { id: "IA-2026-11", process: "Design & development", month: 3, date: "16 Apr 2026", lead: "Maria Santos", auditors: ["Kim Dela Cruz"], state: "Report issued", kind: "Planned", clauses: ["8.3"] },
  { id: "IA-2026-03", process: "Sales & customer", month: 4, date: "20 May 2026", lead: "Kim Dela Cruz", auditors: [], state: "Report issued", kind: "Planned", clauses: ["8.2", "9.1.2"] },
  { id: "IA-2026-02", process: "Infrastructure & equipment", month: 5, date: "16 Jun 2026", lead: "Maria Santos", auditors: [], state: "Report issued", kind: "Planned", clauses: ["7.1.3", "7.1.4", "7.1.5"] },
  { id: "IA-2026-04", process: "Purchasing & suppliers", month: 7, date: "19 Aug 2026", lead: "Daniel Reyes", auditors: ["Kim Dela Cruz"], state: "Report issued", kind: "Planned", clauses: ["8.4.1", "8.4.2", "8.4.3"] },
  { id: "IA-2026-06", process: "Inspection & release", month: 8, date: "4 Sep 2026", lead: "Maria Santos", auditors: ["Kim Dela Cruz"], state: "Report late", kind: "Planned", clauses: ["7.1.5", "7.2", "7.5.3", "8.6", "8.7", "9.1.1"] },
  { id: "IA-2026-05", process: "Operations", month: 9, date: "21 Oct 2026", lead: "Daniel Reyes", auditors: ["Kim Dela Cruz"], state: "Checklist ready", kind: "Planned", clauses: ["8.1", "8.5.1", "8.5.2", "8.5.4", "7.5.3"] },
  { id: "IA-2026-07", process: "Purchasing & suppliers", month: 10, date: "12 Nov 2026", lead: "Kim Dela Cruz", auditors: [], state: "Follow-up", kind: "Follow-up", clauses: ["8.4.1"] },
  { id: "IA-2026-10", process: "People & competence", month: 10, date: "18 Nov 2026", lead: "Daniel Reyes", auditors: [], state: "Planned", kind: "Planned", clauses: ["7.2"] },
  { id: "IA-2026-13", process: "Monitoring & improvement", month: 10, date: "25 Nov 2026", lead: "Kim Dela Cruz", auditors: [], state: "Planned", kind: "Planned", clauses: ["9.1", "9.2", "10"] },
  { id: "IA-2026-08", process: "Design & development", month: 11, date: "8 Dec 2026", lead: "Maria Santos", auditors: [], state: "Planned", kind: "Planned", clauses: ["8.3"] },
  { id: "IA-2026-12", process: "Infrastructure & equipment", month: 11, date: "15 Dec 2026", lead: "Kim Dela Cruz", auditors: [], state: "Follow-up", kind: "Follow-up", clauses: ["7.1.5"] },
]

// ISO dates: held for audits that have happened, report issued about ten days later
AUDITS.forEach((a) => {
  const d = parseDisplayDate(a.date)
  if (!d || ["Planned", "Checklist ready"].includes(a.state) || d > todayIso()) return
  a.heldDate = d
  if (a.state === "Report issued") a.reportDate = addDays(d, 10)
})

export const AUDIT_CHECKS = [
  { clause: "8.6", q: "Is product released only after planned checks are done?", note: "Sampled 12 release records from August; all had a signed final inspection report.", result: "Conforms" },
  { clause: "8.6", q: "Is the person who authorised release recorded?", note: "Release signature and name present on all 12 records.", result: "Conforms" },
  { clause: "8.7", q: "Are nonconforming parts identified and kept apart?", note: "Red reject bins in place at both benches. Labels on bin 2 faded and hard to read.", result: "Observation" },
  { clause: "8.7", q: "Are concessions agreed with the customer when required?", note: "Two of five concessions in 2026 had no customer signature on file.", result: "Minor nonconformity" },
  { clause: "7.1.5", q: "Is measuring equipment in date and labelled?", note: "All 9 gauges at final inspection labelled and in date.", result: "Conforms" },
  { clause: "7.2", q: "Are inspectors trained for the checks they sign?", note: "Competence matrix matched for all four inspectors on shift.", result: "Conforms" },
  { clause: "7.5.3", q: "Are the current inspection instructions at the bench?", note: "INS-WI-010 rev 04 at both benches, matches the library.", result: "Conforms" },
  { clause: "9.1.1", q: "Are reject rates monitored and reported?", note: "Monthly first-pass yield reported to Operations and in the KPI register.", result: "Conforms" },
]

export const ANSWER_TYPES = ["Audit assessment", "Yes / No / N/A", "Text notes", "Multiple choice", "Multiple select", "Number", "Date", "Evidence review", "Document reference", "Instruction"]
export const ANSWER_PREVIEW: Record<string, string[]> = {
  "Audit assessment": ["Conforms", "Observation", "Minor nonconformity", "Major nonconformity"],
  "Yes / No / N/A": ["Yes", "No", "Not applicable"],
  "Text notes": ["Free text"],
  "Multiple choice": ["Option 1", "Option 2", "Option 3"],
  Number: ["Enter a number"],
  Date: ["Pick a date"],
  "Evidence review": ["Evidence seen", "Evidence missing", "Not applicable"],
  "Document reference": ["Pick a document from the library"],
  Instruction: ["Read-only, no answer"],
}

export const CHECKLIST: ChecklistSection[] = [
  { id: "s0", clause: "Start", title: "Opening meeting", items: [{ id: "q1", type: "Instruction", text: "Confirm the scope, timetable and guides with Carlos Mendoza before starting.", askedBy: "Daniel Reyes", required: false, evidence: [], guidance: "" }] },
  {
    id: "s1",
    clause: "8.1",
    title: "Operational planning and control",
    items: [
      { id: "q2", type: "Audit assessment", clause: "8.1", text: "Is production planned against confirmed customer orders?", askedBy: "Daniel Reyes", required: true, evidence: ["OPS-PRO-001 Production planning and control"], guidance: "Pick three orders from September and follow them into the plan." },
      { id: "q3", type: "Number", clause: "8.1", text: "How many orders were sampled?", askedBy: "Daniel Reyes", required: true, evidence: [], guidance: "" },
    ],
  },
  {
    id: "s2",
    clause: "8.5.1",
    title: "Control of production",
    items: [
      { id: "q4", type: "Audit assessment", clause: "8.5.1", text: "Are current work instructions available at each machine?", askedBy: "Kim Dela Cruz", required: true, evidence: ["OPS-WI-010 CNC machine setup", "OPS-WI-011 First-off approval"], guidance: "Compare the revision at the machine with the library." },
      { id: "q5", type: "Yes / No / N/A", clause: "8.5.1", text: "Was first-off approval recorded for the sampled batches?", askedBy: "Kim Dela Cruz", required: true, evidence: ["OPS-FRM-013 Production traveller"], guidance: "" },
      { id: "q6", type: "Audit assessment", clause: "8.5.1", text: "Is line clearance done and signed before every batch change?", askedBy: "Kim Dela Cruz", required: true, evidence: ["OPS-WI-014 Line clearance, rev 02", "CA-2026-03 Mixed labels on line 2"], guidance: "Follow up on the corrective action for mixed labels. Check the second-person sign-off if rev 03 is published by then." },
    ],
  },
  {
    id: "s3",
    clause: "8.5.2",
    title: "Identification and traceability",
    items: [
      { id: "q7", type: "Evidence review", clause: "8.5.2", text: "Can a finished part be traced back to its material certificate?", askedBy: "Daniel Reyes", required: true, evidence: ["OPS-PRO-014 Identification and traceability"], guidance: "Pick one part from dispatch and trace it backwards." },
      { id: "q8", type: "Text notes", clause: "8.5.2", text: "Batch numbers sampled", askedBy: "Daniel Reyes", required: false, evidence: [], guidance: "" },
    ],
  },
  {
    id: "s4",
    clause: "8.5.4",
    title: "Preservation",
    items: [{ id: "q9", type: "Audit assessment", clause: "8.5.4", text: "Are parts protected from damage and contamination while stored?", askedBy: "Kim Dela Cruz", required: true, evidence: ["OPS-PRO-016 Preservation and storage"], guidance: "" }],
  },
]

export const CHECKLIST_TEMPLATES: { id: string; name: string; process: string; questions: number; owner: string; updated: string; used: number; sections?: ChecklistSection[]; version?: number; usesQuestionnaire?: boolean }[] = [
  { id: "CT-01", name: "Operations", process: "Operations", questions: 14, owner: "Daniel Reyes", updated: "2 Oct 2026", used: 4 },
  { id: "CT-02", name: "Purchasing & suppliers", process: "Purchasing & suppliers", questions: 12, owner: "Kim Dela Cruz", updated: "11 Aug 2026", used: 3 },
  { id: "CT-03", name: "Inspection & release", process: "Inspection & release", questions: 8, owner: "Maria Santos", updated: "28 Aug 2026", used: 3 },
  { id: "CT-04", name: "Design & development", process: "Design & development", questions: 16, owner: "Maria Santos", updated: "3 Apr 2026", used: 2 },
  { id: "CT-05", name: "People & competence", process: "People & competence", questions: 9, owner: "Daniel Reyes", updated: "1 Mar 2026", used: 2 },
  { id: "CT-06", name: "Infrastructure & equipment", process: "Infrastructure & equipment", questions: 11, owner: "Maria Santos", updated: "9 Jun 2026", used: 3 },
  { id: "CT-07", name: "Leadership & management review", process: "Leadership & planning", questions: 10, owner: "Kim Dela Cruz", updated: "5 Feb 2026", used: 2 },
  { id: "CT-08", name: "Sales & customer", process: "Sales & customer", questions: 10, owner: "Kim Dela Cruz", updated: "12 May 2026", used: 2 },
  { id: "CT-09", name: "Monitoring & improvement", process: "Monitoring & improvement", questions: 12, owner: "Daniel Reyes", updated: "20 Jan 2026", used: 1 },
  { id: "CT-10", name: "Supplier audit, on site", process: "Purchasing & suppliers", questions: 18, owner: "Joy Aquino", updated: "14 Jul 2026", used: 5 },
  { id: "CT-11", name: "Layered process audit, daily", process: "Operations", questions: 6, owner: "Carlos Mendoza", updated: "30 Sep 2026", used: 22 },
  { id: "CT-12", name: "Calibration spot check", process: "Infrastructure & equipment", questions: 5, owner: "Paolo Ramos", updated: "2 Sep 2026", used: 7 },
]
// Synthetic template content is copied into each audit; later edits cannot change that copy.
for (const template of CHECKLIST_TEMPLATES) {
  template.version = 1
  template.sections = template.id === "CT-01" ? structuredClone(CHECKLIST) : [{
    id: `TS-${template.id}`, clause: "9.2", title: template.process,
    items: [{ id: `TQ-${template.id}`, type: "Audit assessment", clause: "9.2", text: `What records show that ${template.process.toLowerCase()} follows its planned controls?`, askedBy: template.owner, required: true, evidence: [], guidance: "Interview the process owner and record the sample reviewed." }],
  }]
  template.questions = template.sections.flatMap(s => s.items).filter(q => q.type !== "Instruction").length
}


/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export type EvidenceState = "Evidence current" | "Partial" | "Older than 12 months" | "No evidence"

export interface ClauseRow {
  no: string
  name: string
  process: string
  items: number
  latest: string
  state: EvidenceState
}

export interface ClauseGroup {
  no: string
  name: string
  ok: number
  part: number
  gap: number
  frac: string
  rows: ClauseRow[]
}

/** ISO 9001 clauses 1 to 3: informative, no requirements, so no evidence */
export const INFORMATIVE_CLAUSES = [
  {
    no: "1",
    name: "Scope",
    summary: "Says what ISO 9001 covers: a QMS for any organisation that wants to consistently meet customer and legal requirements and improve customer satisfaction. Your own company’s QMS scope is a required document under clause 4.3.",
    link: { label: "Open your QMS scope, clause 4.3", to: "/qms/organization" },
  },
  {
    no: "2",
    name: "Normative references",
    summary: "Points to ISO 9000:2015, Fundamentals and vocabulary, which is needed to apply ISO 9001. Nothing to record.",
    link: null,
  },
  {
    no: "3",
    name: "Terms and definitions",
    summary: "Says the terms in ISO 9000 apply. Your company’s own terms can be kept in the glossary.",
    link: { label: "Open the glossary", to: "/qms/organization?tab=terms" },
  },
]

export const GLOSSARY = [
  { id: "g1", term: "Nonconformity", meaning: "Not meeting a requirement.", source: "ISO 9000, 3.6.9", ours: "Raised in Corrective Action. Minor or major." },
  { id: "g2", term: "Corrective action", meaning: "Action to remove the cause of a nonconformity and stop it happening again.", source: "ISO 9000, 3.12.2", ours: "Has tasks, one accountable person per task." },
  { id: "g3", term: "Correction", meaning: "Action to remove a detected nonconformity. We call it containment.", source: "ISO 9000, 3.12.3", ours: "Recorded within 2 working days." },
  { id: "g4", term: "Documented information", meaning: "Information an organisation must control and keep, and the medium it is on.", source: "ISO 9000, 3.8.6", ours: "Shown as Documents in ThryveMS." },
  { id: "g5", term: "Controlled document", meaning: "A document whose current revision is approved and published, and old revisions withdrawn.", source: "Company term", ours: "Published in the Documents register." },
  { id: "g6", term: "Concession", meaning: "Permission to use or release a product that doesn’t conform to requirements.", source: "ISO 9000, 3.12.5", ours: "Needs a customer signature." },
  { id: "g7", term: "Process owner", meaning: "The person accountable for a process, its documents, risks and objectives.", source: "Company term", ours: "One per process." },
  { id: "g8", term: "Interested party", meaning: "A person or organisation that can affect, be affected by, or think they are affected by a decision or activity.", source: "ISO 9000, 3.2.3", ours: "Listed in Organization & Scope." },
  { id: "g9", term: "Line clearance", meaning: "Removing parts, labels and documents of the previous batch before the next batch starts.", source: "Company term", ours: "OPS-WI-014." },
  { id: "g10", term: "Effectiveness check", meaning: "Checking, some time after an action, that the problem has not come back.", source: "Company term", ours: "90 days after verification." },
]

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  { id: "EV-0214", clauses: ["8.5.1"], title: "Production plan, week 41", kind: "Link", processes: ["Operations"], addedBy: "Carlos Mendoza", added: "11 Oct", classification: "Internal" },
  { id: "EV-0213", clauses: ["7.5.2", "7.5.3"], title: "Document register export, October", kind: "Record", processes: ["Leadership & planning", "Operations", "Inspection & release"], addedBy: "Nina Flores", added: "12 Oct", classification: "Internal" },
  { id: "EV-0212", clauses: ["6.1.1", "6.1.2", "9.3"], title: "Risk register review minutes", kind: "File", processes: ["Leadership & planning", "Monitoring & improvement"], addedBy: "Maria Santos", added: "11 Oct", classification: "Internal" },
  { id: "EV-0211", clauses: ["8.2"], title: "Contract review checklist, order 8841", kind: "File", processes: ["Sales & customer"], addedBy: "Grace Lim", added: "9 Oct", classification: "Confidential" },
  { id: "EV-0210", clauses: ["7.1.3"], title: "Compressor service report", kind: "File", processes: ["Infrastructure & equipment"], addedBy: "Paolo Ramos", added: "2 Oct", classification: "Internal" },
  { id: "EV-0209", clauses: ["8.3"], title: "Design review record, bracket rev C", kind: "Link", processes: ["Design & development"], addedBy: "Daniel Reyes", added: "30 Sep", classification: "Internal" },
  { id: "EV-0208", clauses: ["9.1.3"], title: "KPI pack, September", kind: "File", processes: ["Monitoring & improvement"], addedBy: "Maria Santos", added: "30 Sep", classification: "Internal" },
  { id: "EV-0207", clauses: ["9.2"], title: "Audit report IA-2026-04", kind: "Record", processes: ["Monitoring & improvement"], addedBy: "Daniel Reyes", added: "11 Sep", classification: "Internal" },
  { id: "EV-0206", clauses: ["7.1.5"], title: "Calibration certificates, torque wrenches", kind: "File", processes: ["Infrastructure & equipment"], addedBy: "Paolo Ramos", added: "26 Jun", classification: "Internal" },
  { id: "EV-0205", clauses: ["10.2"], title: "Supervisor briefing record", kind: "File", processes: ["Infrastructure & equipment"], addedBy: "Paolo Ramos", added: "2 Sep", classification: "Internal" },
  { id: "EV-0204", clauses: ["8.7"], title: "Concession log, 2026", kind: "Link", processes: ["Inspection & release"], addedBy: "Ana Cruz", added: "24 Aug", classification: "Internal" },
  { id: "EV-0203", clauses: ["9.1.2"], title: "Customer satisfaction survey results, H1", kind: "File", processes: ["Sales & customer"], addedBy: "Grace Lim", added: "15 Jul", classification: "Internal" },
  { id: "EV-0202", clauses: ["5.1"], title: "Management review minutes MR-2026-01", kind: "Record", processes: ["Leadership & planning"], addedBy: "Maria Santos", added: "22 Apr", classification: "Confidential" },
  { id: "EV-0201", clauses: ["7.2"], title: "Competence matrix snapshot", kind: "Link", processes: ["People & competence"], addedBy: "Rosa Tan", added: "14 Sep 2025", classification: "Confidential" },
  { id: "EV-0200", clauses: ["8.4.1"], title: "Supplier evaluations 2025", kind: "File", processes: ["Purchasing & suppliers"], addedBy: "Joy Aquino", added: "1 Oct 2025", classification: "Internal" },
]

// Files in each evidence item. Some are packs of several files; the rest are a single file or link.
const EV_FILES: Record<string, EvidenceFile[]> = {
  "EV-0206": [
    { name: "TW-01 calibration certificate.pdf", kind: "File", size: "220 KB" },
    { name: "TW-04 calibration certificate.pdf", kind: "File", size: "218 KB" },
    { name: "TW-07 calibration certificate.pdf", kind: "File", size: "224 KB" },
  ],
  "EV-0208": [
    { name: "KPI pack September.xlsx", kind: "File", size: "96 KB" },
    { name: "KPI pack September.pdf", kind: "File", size: "410 KB" },
  ],
  "EV-0212": [
    { name: "Risk review minutes 11 Oct.pdf", kind: "File", size: "140 KB" },
    { name: "Risk register export.xlsx", kind: "File", size: "58 KB" },
    { name: "Attendance sheet.pdf", kind: "File", size: "80 KB" },
  ],
  "EV-0213": [
    { name: "Document register, October", kind: "Link", url: "https://arden.sharepoint.example/sites/QMS/register-oct" },
    { name: "Master list signed off.pdf", kind: "File", size: "120 KB" },
  ],
}
// Evidence reused on several records
const EV_USED: Record<string, string[]> = {
  "EV-0213": ["QMS-MAN-001", "IMP-PRO-001"],
  "EV-0212": ["QMS-MAN-001"],
  "EV-0202": ["QMS-MAN-001"],
  "EV-0206": ["EQP-PRO-001", "EQP-WI-007", "NC-2026-005"],
  "EV-0210": ["EQP-PRO-001"],
  "EV-0205": ["NC-2026-005"],
  "EV-0200": ["PUR-PRO-002", "NC-2026-007"],
}
EVIDENCE_ITEMS.forEach((e) => {
  // links only: files stay in the client's SharePoint
  e.files = (EV_FILES[e.id] ?? [{ name: e.kind === "Link" ? e.title : `${e.title}.pdf`, kind: e.kind === "Link" ? "Link" : "File" }]).map((f) => ({ ...f, size: undefined, url: f.url ?? `https://arden.sharepoint.example/sites/QMS/Evidence/${encodeURIComponent(f.name)}` }))
  e.usedIn = EV_USED[e.id] ?? []
  e.addedDate = parseDisplayDate(e.added, { notAfter: todayIso() })
})

/* ------------------------------------------------------------------ */
/* Management review                                                   */
/* ------------------------------------------------------------------ */

export const MR_INPUTS = [
  { ref: "a", name: "Status of actions from previous reviews", source: "MR-2026-01 actions, 4 of 5 done", state: "Ready" },
  { ref: "b", name: "Changes in external and internal issues", source: "Organization & Scope, context", state: "Ready" },
  { ref: "c1", name: "Customer satisfaction and feedback", source: "KPI customer satisfaction, complaints log", state: "Ready" },
  { ref: "c2", name: "Extent quality objectives were met", source: "Objectives & KPIs, Q3 results", state: "In progress" },
  { ref: "c3", name: "Process performance and product conformity", source: "Process summaries, 9 processes", state: "Ready" },
  { ref: "c4", name: "Nonconformities and corrective actions", source: "Corrective Action, 7 open", state: "Ready" },
  { ref: "c5", name: "Monitoring and measurement results", source: "Objectives & KPIs", state: "Ready" },
  { ref: "c6", name: "Audit results", source: "Audits, 6 reports issued", state: "Missing" },
  { ref: "c7", name: "Performance of external providers", source: "Supplier evaluations 2026", state: "Missing" },
  { ref: "d", name: "Adequacy of resources", source: "People & competence, equipment", state: "Ready" },
  { ref: "e", name: "Effectiveness of actions on risks and opportunities", source: "Risks & Opportunities, 11 treatments", state: "Ready" },
] as const

export const MR_ACTIONS = [
  { name: "Approve budget for a second packaging supplier", who: "Eric Navarro", state: "Done" },
  { name: "Run refresher training for all inspectors", who: "Rosa Tan", state: "Done" },
  { name: "Move calibration schedule into the equipment register", who: "Paolo Ramos", state: "Done" },
  { name: "Publish revised quality objectives for 2026", who: "Maria Santos", state: "Done" },
  { name: "Re-evaluate all approved suppliers", who: "Joy Aquino", state: "Overdue" },
] as const

export const MR_ATTENDEES = [
  { name: "Eric Navarro", role: "Managing Director, chair" },
  { name: "Maria Santos", role: "Quality & Compliance Manager, secretary" },
  { name: "Carlos Mendoza", role: "Operations Manager" },
  { name: "Grace Lim", role: "Sales Manager" },
  { name: "Joy Aquino", role: "Purchasing Manager" },
  { name: "Rosa Tan", role: "HR & Training Lead" },
]

/** The company's auditor list (Audits › Auditors). */
export const AUDITORS: Auditor[] = [
  { id: "aud-kd", name: "Kim Dela Cruz", level: "Lead auditor", training: "ISO 9001:2015 internal auditor course, TÜV Rheinland", trainedOn: "Mar 2025", certificate: "https://arden.sharepoint.example/sites/HR/Training/kim-dela-cruz-ia.pdf", recheckBy: "Mar 2027", extraExclusions: ["Design & development"], status: "Active" },
  { id: "aud-dr", name: "Daniel Reyes", level: "Lead auditor", training: "ISO 9001:2015 lead auditor (IRCA), SGS Philippines", trainedOn: "Jun 2024", certificate: "https://arden.sharepoint.example/sites/HR/Training/daniel-reyes-la.pdf", recheckBy: "Jun 2026", extraExclusions: [], status: "Active" },
  { id: "aud-ms", name: "Maria Santos", level: "Lead auditor", training: "ISO 9001:2015 lead auditor (IRCA), Bureau Veritas", trainedOn: "Nov 2023", recheckBy: "Nov 2026", extraExclusions: [], status: "Active" },
  { id: "aud-bc", name: "Ben Castillo", level: "Auditor", training: "ISO 9001:2015 internal auditor course, in-house", trainedOn: "Feb 2026", recheckBy: "Feb 2027", extraExclusions: [], status: "Active" },
  { id: "aud-nf", name: "Nina Flores", level: "In training", training: "Observed 2 audits; course booked for Nov 2026", trainedOn: "Sep 2026", recheckBy: "Dec 2026", extraExclusions: [], status: "Active" },
  { id: "aud-ec", name: "Elena Cruz", external: { organisation: "North Audit Partners", email: "elena.cruz@northaudit.example" }, level: "Lead auditor", training: "ISO 9001:2015 lead auditor (IRCA), certificate 4471-QMS", trainedOn: "2019", recheckBy: "Jan 2027", extraExclusions: [], status: "Active" },
]

const R = (id: string, kind: Remark["kind"], targetId: string, targetLabel: string, to: string, area: Remark["area"], text: string, when: string, extra: Partial<Remark> = {}): Remark => ({ id, kind, targetId, targetLabel, to, area, author: "Rafael Ong", text, when, status: "Open", replies: [], ...extra })

/** Remarks from the consultant (Rafael Ong, QualiPro Consulting). */
export const REMARKS: Remark[] = [
  R("rm-1", "Document", "PUR-PRO-002", "PUR-PRO-002 Supplier selection and evaluation", "/documents/PUR-PRO-002", "Documents", "Section 4 says suppliers are re-evaluated “regularly”. The certification auditor will ask how often. Say once a year, and who does it.", "Today, 10:12"),
  R("rm-2", "Process", "purchasing", "Purchasing & suppliers", "/qms/processes/purchasing", "Processes", "Outsourced plating isn’t listed as an output of this process. ISO 9001 clause 8.4.1 needs control of outsourced processes to be defined. Add it to the activities and link the supplier controls.", "Today, 09:40"),
  R("rm-3", "Risk", "R-031", "R-031 Single source for packaging material", "/risks", "Risks & Opportunities", "Good risk. The action has no due date and the review is late. Add a date for qualifying the second supplier so the auditor sees it is managed.", "Yesterday, 16:05", { replies: [{ author: "Joy Aquino", text: "Second supplier trial booked for 4 Nov. I’ll add the date.", when: "Yesterday, 17:20" }] }),
  R("rm-4", "Audit", "IA-2026-06", "IA-2026-06 Inspection & release", "/audits/IA-2026-06", "Audits", "The report is 6 days late. Certification bodies check that internal audit reports are issued and findings followed up. Please issue it before the Stage 1 audit.", "Yesterday, 11:30"),
  R("rm-5", "Evidence", "EV-0201", "EV-0201 Competence matrix snapshot", "/evidence", "Evidence", "This snapshot is from September 2025. Upload the current matrix; evidence older than 12 months is usually questioned.", "12 Oct, 15:00"),
  R("rm-6", "Nonconformity", "NC-2026-007", "NC-2026-007 Approved supplier list not re-evaluated for 2026", "/corrective-action/NC-2026-007", "Corrective Action", "The root cause says “oversight”. Auditors don’t accept that. Ask why it was missed: was there no reminder, no owner, no schedule? Then the action will fix the real cause.", "12 Oct, 14:10"),
  R("rm-7", "Document", "QMS-MAN-001", "QMS-MAN-001 Quality manual and QMS scope", "/documents/QMS-MAN-001", "Documents", "Scope statement now names the products and sites. Looks good for Stage 1.", "8 Oct, 10:00", { status: "Resolved", resolvedBy: "Rafael Ong", replies: [{ author: "Maria Santos", text: "Updated in revision 07.", when: "7 Oct, 16:00" }] }),
]

const Q = (id: string, clause: string, title: string, owner: string, due: string, status: Requirement["status"], extra: Partial<Requirement> = {}): Requirement => ({ id, clause, title, owner, due, status, addedBy: "Rafael Ong", ...extra })

/** What the consultant listed as needed before certification. */
export const REQUIREMENTS: Requirement[] = [
  Q("rq-1", "4.3", "Scope statement names products, sites and any clause that doesn’t apply", "Maria Santos", "30 Sep", "Done", { evidence: "QMS-MAN-001 revision 07" }),
  Q("rq-2", "5.2", "Quality policy acknowledged by all staff", "Eric Navarro", "31 Oct", "In progress"),
  Q("rq-3", "6.2", "Every objective has a target, owner and monthly results", "Maria Santos", "31 Oct", "Ready to confirm", { evidence: "Objectives & KPIs, Q3 results" }),
  Q("rq-4", "7.1.5", "Calibration register covers every measuring tool, with due dates", "Paolo Ramos", "15 Nov", "In progress"),
  Q("rq-5", "7.2", "Current competence matrix, signed off", "Rosa Tan", "15 Nov", "To do"),
  Q("rq-6", "8.4.1", "Re-evaluate all approved suppliers for 2026", "Joy Aquino", "4 Oct", "To do"),
  Q("rq-7", "9.2", "Complete the audit cycle: all 9 processes audited, reports issued", "Daniel Reyes", "25 Nov", "In progress"),
  Q("rq-8", "9.3", "Hold the management review with every required input", "Eric Navarro", "4 Nov", "To do"),
  Q("rq-9", "10.2", "Root cause analysis for each open major nonconformity", "Maria Santos", "15 Nov", "To do"),
  Q("rq-11", "4.1", "Record whether climate change is a relevant issue, and why (new in the 2026 edition)", "Maria Santos", "15 Nov", "To do"),
  Q("rq-12", "6.1.3", "List opportunities separately from risks, each with an action and owner (new in the 2026 edition)", "Maria Santos", "15 Nov", "In progress"),
  Q("rq-13", "7.3", "Brief staff on quality culture and ethical behaviour, and keep the attendance (new in the 2026 edition)", "Rosa Tan", "30 Nov", "To do"),
  Q("rq-10", "8.5.5", "Post-delivery activities", "Grace Lim", "", "Not applicable", { note: "Parts are made to customer drawings; no installation, servicing or warranty work is done." }),
]

/** Certification audit dates, set by the certification body. */
export const CERTIFICATION = { body: "SGS Philippines", stage1: "20 Nov 2026", stage2: "15 Jan 2027", daysToStage1: 37 }
