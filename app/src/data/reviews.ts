import type { ManagementReviewRecord, ReviewAction, ReviewInput } from "./types"

/** The inputs ISO 9001 clause 9.3.2 asks top management to consider. */
export const REVIEW_INPUTS: Omit<ReviewInput, "note" | "noteBy">[] = [
  { ref: "a", name: "Actions from previous reviews", source: "Management Review" },
  { ref: "b", name: "Changes in issues and interested parties", source: "Organization & Scope" },
  { ref: "c1", name: "Customer satisfaction and feedback", source: "Objectives & KPIs, complaints" },
  { ref: "c2", name: "Quality objectives", source: "Objectives & KPIs" },
  { ref: "c3", name: "Process performance and product conformity", source: "Processes" },
  { ref: "c4", name: "Nonconformities and corrective actions", source: "Corrective Action" },
  { ref: "c5", name: "Monitoring and measurement results", source: "Objectives & KPIs, KPI pack" },
  { ref: "c6", name: "Audit results", source: "Audits" },
  { ref: "c7", name: "Performance of external providers", source: "Purchasing & suppliers" },
  { ref: "d", name: "Adequacy of resources", source: "People, equipment, infrastructure" },
  { ref: "e", name: "Actions on risks and opportunities", source: "Risks & Opportunities" },
]

/** Figures as they were at past reviews (frozen when each review was recorded). */
const APRIL: Record<string, [string, string]> = {
  a: ["6 / 6", "done"], b: ["5", "issues, 8 interested parties"], c1: ["4.3", "target ≥ 4.2"], c2: ["5 / 7", "objectives on target"], c3: ["6", "healthy, 2 to watch, 1 at risk"],
  c4: ["5", "open, 1 major"], c5: ["7", "KPIs measured"], c6: ["4 / 4", "reports issued"], c7: ["89.0%", "supplier on-time, target ≥ 92%"], e: ["15", "open risks, 2 high"],
}
const OCT25: Record<string, [string, string]> = {
  a: ["None", "first review"], b: ["4", "issues, 7 interested parties"], c1: ["4.0", "target ≥ 4.2"], c2: ["3 / 6", "objectives on target"], c3: ["5", "healthy, 3 to watch, 1 at risk"],
  c4: ["9", "open, 3 major"], c5: ["6", "KPIs measured"], c6: ["3 / 3", "reports issued"], c7: ["86.0%", "supplier on-time, target ≥ 90%"], e: ["12", "open risks, 3 high"],
}
const frozen = (m: Record<string, [string, string]>, ref: string) => (m[ref] ? { value: m[ref][0], detail: m[ref][1] } : { value: "", detail: "No figure" })

const inputs = (notes: Record<string, Partial<ReviewInput>>): ReviewInput[] => REVIEW_INPUTS.map((i) => ({ ...i, ...notes[i.ref] }))
const MS = "Maria Santos"

export const REVIEWS: ManagementReviewRecord[] = [
  {
    id: "MR-2026-02",
    title: "November 2026 management review",
    format: "No meeting",
    stage: "Preparing",
    date: "4 Nov 2026",
    reviewers: ["Eric Navarro"],
    others: ["Carlos Mendoza", "Grace Lim", "Joy Aquino"],
    preparedBy: MS,
    inputs: inputs({
      a: { note: "One action still open: supplier re-evaluation, now linked to NC-2026-007.", noteBy: MS },
      b: { note: "New customer in the automotive sector; climate change added as an external issue for the 2026 edition.", noteBy: MS },
      c1: { note: "Score up to 4.4. Three complaints, all about delivery dates.", noteBy: MS },
      c2: { note: "Two objectives missed for the second quarter running. Propose keeping the targets and asking Operations and Purchasing for action plans.", noteBy: "Rafael Ong", draft: true },
      c3: { note: "Purchasing and Inspection need attention; the rest are on track.", noteBy: MS },
      c4: { note: "Seven open, two major. Root causes for supplier issues still weak.", noteBy: MS },
      c5: { note: "All KPIs measured on time. KPI pack attached as evidence EV-0208.", noteBy: MS },
      c7: { handedTo: "Joy Aquino" },
      d: { note: "Only one trained CMM operator. Cross-training under way.", noteBy: MS },
    }),
    status: { "Eric Navarro": "Not opened", "Carlos Mendoza": "Not opened", "Grace Lim": "Not opened", "Joy Aquino": "Not opened" },
    comments: [],
  },
  {
    id: "MR-2026-01",
    title: "April 2026 management review",
    format: "Meeting",
    stage: "Reviewed",
    date: "22 Apr 2026",
    place: "Board room",
    reviewers: ["Eric Navarro"],
    others: [MS, "Carlos Mendoza", "Joy Aquino", "Grace Lim"],
    preparedBy: MS,
    inputs: inputs({}).map((i) => ({ ...i, note: "Covered at the meeting. See the signed minutes.", noteBy: MS, frozen: frozen(APRIL, i.ref) })),
    packSentOn: "15 Apr 2026",
    status: { "Eric Navarro": "Present", [MS]: "Present", "Carlos Mendoza": "Present", "Joy Aquino": "Present", "Grace Lim": "Apologies" },
    comments: [
      { ref: "c2", author: MS, when: "22 Apr", text: "First-pass yield and supplier on-time below target. Agreed to keep targets; actions in Operations and Purchasing." },
      { ref: "c7", author: MS, when: "22 Apr", text: "Supplier list overdue for re-evaluation. Joy to complete by 30 Jun." },
      { ref: "d", author: MS, when: "22 Apr", text: "Only one trained CMM operator. Cross-training approved." },
    ],
    conclusion: {
      suitable: "Yes",
      adequate: "Partly",
      effective: "Yes",
      aligned: "Yes",
      reasons: { adequate: "One CMM operator; cover needed", effective: "5 of 7 objectives met", aligned: "Supports the 2026 export growth plan" },
      summary: "The QMS works and objectives are mostly met. Supplier control is the weak point: the approved list was not re-evaluated and on-time delivery from suppliers is below target. Final inspection depends on one person.",
    },
    signOff: { how: "Signed scan", by: "Eric Navarro", when: "25 Apr 2026", file: "https://arden.sharepoint.example/sites/QMS/Management%20review/MR-2026-01-minutes-signed.pdf" },
    notesFile: "https://arden.sharepoint.example/sites/QMS/Management%20review/notes-22-apr.docx",
    recordedOn: "25 Apr 2026",
    evidenceId: "EV-0202",
  },
  {
    id: "MR-2025-01",
    title: "2025 management review",
    format: "Several meetings",
    stage: "Closed",
    date: "16 Oct 2025",
    reviewers: ["Eric Navarro"],
    others: [MS, "Carlos Mendoza"],
    preparedBy: MS,
    inputs: inputs({}).map((i, k) => ({ ...i, note: "Reviewed and minuted.", noteBy: MS, frozen: frozen(OCT25, i.ref), coveredIn: ["Management meeting 14 Aug", "Management meeting 11 Sep", "Management meeting 16 Oct"][k % 3] })),
    packSentOn: "1 Aug 2025",
    status: { "Eric Navarro": "Signed off", [MS]: "Commented", "Carlos Mendoza": "Read" },
    comments: [],
    conclusion: { suitable: "Yes", adequate: "Yes", effective: "Partly", aligned: "Yes", reasons: { effective: "Three objectives missed" }, summary: "Ready to go for certification once the 2026 objectives are set and internal audits are complete." },
    signOff: { how: "In iQMS", by: "Eric Navarro", when: "20 Oct 2025" },
    recordedOn: "20 Oct 2025",
  },
]

export const REVIEW_ACTIONS: ReviewAction[] = [
  { id: "RA-01", reviewId: "MR-2026-01", text: "Approve budget for a second packaging supplier", type: "Resource need", owner: "Eric Navarro", due: "31 May", linked: "R-031", state: "Done", doneOn: "20 May" },
  { id: "RA-02", reviewId: "MR-2026-01", text: "Run refresher training for all inspectors", type: "Improvement", owner: "Rosa Tan", due: "30 Jun", state: "Done", doneOn: "28 Jun" },
  { id: "RA-03", reviewId: "MR-2026-01", text: "Move the calibration schedule into the equipment register", type: "Change to the QMS", owner: "Paolo Ramos", due: "31 May", linked: "EQP-PRO-001", state: "Done", doneOn: "30 May" },
  { id: "RA-04", reviewId: "MR-2026-01", text: "Re-evaluate all approved suppliers", type: "Improvement", owner: "Joy Aquino", due: "30 Jun", linked: "NC-2026-007", state: "Open", late: true },
  { id: "RA-05", reviewId: "MR-2026-01", text: "Check the customer drawing revision at order entry", type: "Change to the QMS", owner: "Grace Lim", due: "31 Oct", linked: "NC-2026-003", state: "Open" },
  { id: "RA-06", reviewId: "MR-2026-01", text: "Train a second CMM operator", type: "Resource need", owner: "Rosa Tan", due: "30 Nov", linked: "R-024", state: "Open" },
  ...["Set 2026 quality objectives", "Complete the internal audit cycle", "Choose a certification body", "Add supplier on-time delivery as a KPI", "Write the calibration procedure", "Brief staff on the quality policy"].map(
    (text, i): ReviewAction => ({ id: `RA-${String(i + 7).padStart(2, "0")}`, reviewId: "MR-2025-01", text, type: i % 2 ? "Change to the QMS" : "Improvement", owner: [MS, "Daniel Reyes", "Eric Navarro", "Joy Aquino", "Paolo Ramos", MS][i], due: "Dec 2025", state: "Done", doneOn: "Jan 2026" }),
  ),
]
