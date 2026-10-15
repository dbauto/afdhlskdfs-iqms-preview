import { parseDisplayDate } from "@/lib/periods"
import type { FrozenFigure, ManagementReviewRecord, ReviewAction, ReviewAnalysis, ReviewEvaluation, ReviewInput, ReviewRecordCheck } from "./types"

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

/** Clause 9.3.2 item for each input. */
export const REVIEW_CLAUSE: Record<string, string> = { a: "9.3.2 a", b: "9.3.2 b", c1: "9.3.2 c 1", c2: "9.3.2 c 2", c3: "9.3.2 c 3", c4: "9.3.2 c 4", c5: "9.3.2 c 5", c6: "9.3.2 c 6", c7: "9.3.2 c 7", d: "9.3.2 d", e: "9.3.2 e" }

/** "About this input": what it means, why management reviews it and where the data comes from. One or two sentences each. */
export const REVIEW_GUIDE: Record<string, { what: string; why: string; from: string }> = {
  a: {
    what: "What happened to the actions top management decided at earlier reviews.",
    why: "Decisions only count if they are carried out. Open actions carry forward until they’re done.",
    from: "Actions from every earlier review that are still open, or were finished in this period, with their owner, due date and completion evidence.",
  },
  b: {
    what: "Changes to the internal and external issues that affect the QMS, and to what interested parties need.",
    why: "The QMS has to keep fitting the company’s situation. A change may need new risks, objectives or controls.",
    from: "Context issues and interested parties changed during the period. ThryveMS keeps only the last change date, so describe what changed.",
  },
  c1: {
    what: "How satisfied customers are, and what they told you: survey results, compliments and complaints.",
    why: "Customer satisfaction is the main test of whether the QMS works.",
    from: "Objectives tagged for customer satisfaction, and nonconformities raised from customer complaints. Survey reports can be linked by hand.",
  },
  c2: {
    what: "How far each quality objective was met in the period.",
    why: "Objectives turn the quality policy into measurable results. Missed objectives need a decision.",
    from: "Every objective’s latest result for a month or quarter in the period, against its target, with its owner and trend.",
  },
  c3: {
    what: "How each process performed, and whether products and services met requirements.",
    why: "It shows which processes need help, before problems reach customers.",
    from: "Each process’s objectives and the nonconformities raised in it during the period. Inspection results can be linked by hand.",
  },
  c4: {
    what: "Nonconformities found and the corrective actions taken: open, overdue, major, recurring, and whether actions worked.",
    why: "Recurring or overdue problems point to causes that need management action or resources.",
    from: "Nonconformities open now, and those raised or closed in the period, with their stage, due date and effectiveness checks.",
  },
  c5: {
    what: "The results of monitoring and measuring: the measurements actually taken in the period.",
    why: "Decisions need data. Gaps in measurement are a finding in themselves.",
    from: "Objective results entered for months or quarters in the period. Other measurement reports can be linked by hand.",
  },
  c6: {
    what: "What internal audits found in the period, and whether reports were issued.",
    why: "Audits are management’s independent check that the QMS works as planned.",
    from: "Audits held in the period, reports issued or pending, and nonconformities raised from audits.",
  },
  c7: {
    what: "How suppliers and outsourced processes performed: delivery, quality and their nonconformities.",
    why: "Poor supplier performance shows up later as late or nonconforming output.",
    from: "Objectives tagged for suppliers, nonconformities in Purchasing & suppliers or from a supplier, and supplier evidence under clause 8.4.",
  },
  d: {
    what: "Whether there are enough people, skills, infrastructure and equipment to run the QMS.",
    why: "Resource gaps are a common cause of missed objectives and repeated problems.",
    from: "There’s no resource module, so this is prepared by hand. Records from People & competence and Infrastructure & equipment are listed to help.",
  },
  e: {
    what: "Whether the actions taken on risks and opportunities worked.",
    why: "Clause 6.1 actions should reduce risk or take the opportunity. If they didn’t, they need changing.",
    from: "The risk register: actions, review dates and nonconformities that show a risk happened. Effectiveness isn’t recorded in ThryveMS yet.",
  },
}

const blank: ReviewAnalysis = { summary: "", observations: "", attention: "", recommendations: "" }
export const emptyAnalysis = (): ReviewAnalysis => ({ ...blank })
export const hasAnalysis = (i: ReviewInput) => !!(i.analysis && [i.analysis.summary, i.analysis.observations, i.analysis.attention, i.analysis.recommendations].join("").trim())

/** Figures as they were at past reviews, frozen before the calculation method and sources were kept. */
const APRIL: Record<string, [string, string]> = {
  a: ["6 / 6", "done"], b: ["5", "issues, 8 interested parties"], c1: ["4.3", "target ≥ 4.2"], c2: ["5 / 7", "objectives on target"], c3: ["6", "healthy, 2 to watch, 1 at risk"],
  c4: ["5", "open, 1 major"], c5: ["7", "KPIs measured"], c6: ["4 / 4", "reports issued"], c7: ["89.0%", "supplier on-time, target ≥ 92%"], e: ["15", "open risks, 2 high"],
}
const OCT25: Record<string, [string, string]> = {
  a: ["None", "first review"], b: ["4", "issues, 7 interested parties"], c1: ["4.0", "target ≥ 4.2"], c2: ["3 / 6", "objectives on target"], c3: ["5", "healthy, 3 to watch, 1 at risk"],
  c4: ["9", "open, 3 major"], c5: ["6", "KPIs measured"], c6: ["3 / 3", "reports issued"], c7: ["86.0%", "supplier on-time, target ≥ 90%"], e: ["12", "open risks, 3 high"],
}
export const OLD_METHOD = "Not kept: this figure was frozen before ThryveMS recorded the calculation method and source records."
const frozen = (m: Record<string, [string, string]>, ref: string, period: { start: string; end: string }): FrozenFigure =>
  m[ref] ? { value: m[ref][0], detail: m[ref][1], status: "valid", period, method: OLD_METHOD, sources: [] } : { value: "", detail: "No figure", status: "no-source", period, method: OLD_METHOD, sources: [] }

const inputs = (notes: Record<string, Partial<ReviewInput>>): ReviewInput[] => REVIEW_INPUTS.map((i) => ({ ...i, ...notes[i.ref] }))
const MS = "Maria Santos"
const an = (summary: string, more: Partial<ReviewAnalysis> = {}): ReviewAnalysis => ({ ...blank, summary, ...more })

const P_2026_02 = { start: "2026-05-01", end: "2026-10-31" }
const P_2026_01 = { start: "2025-10-01", end: "2026-03-31" }
const P_2025_01 = { start: "2024-10-01", end: "2025-09-30" }

export const REVIEWS: ManagementReviewRecord[] = [
  {
    id: "MR-2026-02",
    title: "November 2026 management review",
    format: "No meeting",
    stage: "Preparing",
    date: "4 Nov 2026",
    period: P_2026_02,
    reviewers: ["Eric Navarro"],
    others: ["Carlos Mendoza", "Grace Lim", "Joy Aquino"],
    contributors: ["Joy Aquino"],
    preparedBy: MS,
    inputs: inputs({
      a: { analysis: an("One action from April is still open: the supplier re-evaluation, now linked to NC-2026-007 and overdue since June."), preparedBy: MS, updatedAt: "2026-10-12T09:10:00" },
      b: { analysis: an("New customer in the automotive sector. Climate change added as an external issue for the 2026 edition.", { observations: "Suppliers and subcontractors changed in September: two new plating subcontractors." }), preparedBy: MS, updatedAt: "2026-10-12T09:20:00" },
      c1: { analysis: an("Satisfaction score up to 4.4 in Q3. One complaint in the period, about a wrong label revision (NC-2026-008)."), preparedBy: MS, updatedAt: "2026-10-12T09:40:00" },
      c2: {
        analysis: an("Two objectives were below target for the second quarter running: first-pass yield and supplier on-time delivery.", { attention: "First-pass yield has fallen for four months.", recommendations: "Keep the targets. Ask Operations and Purchasing for action plans by December." }),
        preparedBy: "Rafael Ong",
        draft: true,
        updatedAt: "2026-10-13T16:00:00",
      },
      c3: { analysis: an("Purchasing and Inspection need attention; the other processes are on track."), preparedBy: MS, updatedAt: "2026-10-12T10:00:00" },
      c4: {
        analysis: an("Seven open, two major. NC-2026-007 is overdue.", { observations: "Two supplier nonconformities from the same audit (IA-2026-04).", attention: "Root causes for supplier issues are still weak.", recommendations: "Review the supplier root causes with Joy before the review date." }),
        preparedBy: MS,
        updatedAt: "2026-10-14T11:30:00",
      },
      c5: { analysis: an("All objectives were measured each month. The September KPI pack is evidence EV-0208."), preparedBy: MS, updatedAt: "2026-10-12T10:15:00" },
      c7: { handedTo: "Joy Aquino" },
      d: { analysis: an("Only one trained CMM operator. Cross-training is under way (RA-06)."), preparedBy: MS, updatedAt: "2026-10-12T10:30:00" },
    }),
    packSentOn: "12 Oct 2026",
    status: { "Eric Navarro": "Commented", "Carlos Mendoza": "Not opened", "Grace Lim": "Read", "Joy Aquino": "Not opened" },
    comments: [],
  },
  {
    id: "MR-2026-01",
    title: "April 2026 management review",
    format: "Meeting",
    stage: "Reviewed",
    date: "22 Apr 2026",
    place: "Board room",
    period: P_2026_01,
    reviewers: ["Eric Navarro"],
    others: [MS, "Carlos Mendoza", "Joy Aquino", "Grace Lim"],
    preparedBy: MS,
    inputs: inputs({}).map((i) => ({ ...i, analysis: an("Covered at the meeting. See the signed minutes."), preparedBy: MS, frozen: frozen(APRIL, i.ref, P_2026_01) })),
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
    period: P_2025_01,
    reviewers: ["Eric Navarro"],
    others: [MS, "Carlos Mendoza"],
    preparedBy: MS,
    inputs: inputs({}).map((i, k) => ({ ...i, analysis: an("Reviewed and minuted."), preparedBy: MS, frozen: frozen(OCT25, i.ref, P_2025_01), coveredIn: ["Management meeting 14 Aug", "Management meeting 11 Sep", "Management meeting 16 Oct"][k % 3] })),
    packSentOn: "1 Aug 2025",
    status: { "Eric Navarro": "Signed off", [MS]: "Commented", "Carlos Mendoza": "Read" },
    comments: [],
    conclusion: { suitable: "Yes", adequate: "Yes", effective: "Partly", aligned: "Yes", reasons: { effective: "Three objectives missed" }, summary: "Ready to go for certification once the 2026 objectives are set and internal audits are complete." },
    signOff: { how: "In iQMS", by: "Eric Navarro", when: "20 Oct 2025" },
    recordedOn: "20 Oct 2025",
  },
]

export const REVIEW_ACTIONS: ReviewAction[] = [
  { id: "RA-01", reviewId: "MR-2026-01", text: "Approve budget for a second packaging supplier", type: "Resource need", owner: "Eric Navarro", due: "31 May", linked: "R-031", state: "Done", doneOn: "20 May", inputRef: "c7", sourceRecords: [{ kind: "risk", id: "R-031" }] },
  { id: "RA-02", reviewId: "MR-2026-01", text: "Run refresher training for all inspectors", type: "Improvement", owner: "Rosa Tan", due: "30 Jun", state: "Done", doneOn: "28 Jun", inputRef: "d" },
  { id: "RA-03", reviewId: "MR-2026-01", text: "Move the calibration schedule into the equipment register", type: "Change to the QMS", owner: "Paolo Ramos", due: "31 May", linked: "EQP-PRO-001", state: "Done", doneOn: "30 May", inputRef: "c4", sourceRecords: [{ kind: "nonconformity", id: "NC-2026-005" }], completionEvidence: ["EV-0206"] },
  { id: "RA-04", reviewId: "MR-2026-01", text: "Re-evaluate all approved suppliers", type: "Improvement", owner: "Joy Aquino", due: "30 Jun", linked: "NC-2026-007", state: "Open", late: true, inputRef: "c7", sourceRecords: [{ kind: "document", id: "PUR-FRM-004" }] },
  { id: "RA-05", reviewId: "MR-2026-01", text: "Check the customer drawing revision at order entry", type: "Change to the QMS", owner: "Grace Lim", due: "31 Oct", linked: "NC-2026-003", state: "Open", inputRef: "c1", sourceRecords: [{ kind: "nonconformity", id: "NC-2026-003" }] },
  { id: "RA-06", reviewId: "MR-2026-01", text: "Train a second CMM operator", type: "Resource need", owner: "Rosa Tan", due: "30 Nov", linked: "R-024", state: "Open", inputRef: "d", sourceRecords: [{ kind: "risk", id: "R-024" }] },
  ...["Set 2026 quality objectives", "Complete the internal audit cycle", "Choose a certification body", "Add supplier on-time delivery as a KPI", "Write the calibration procedure", "Brief staff on the quality policy"].map(
    (text, i): ReviewAction => ({ id: `RA-${String(i + 7).padStart(2, "0")}`, reviewId: "MR-2025-01", text, type: i % 2 ? "Change to the QMS" : "Improvement", owner: [MS, "Daniel Reyes", "Eric Navarro", "Joy Aquino", "Paolo Ramos", MS][i], due: "Dec 2025", state: "Done", doneOn: "Jan 2026" }),
  ),
]

// ISO dates beside the display strings
REVIEW_ACTIONS.forEach((a) => {
  const year = Number(a.reviewId.slice(3, 7))
  a.dueDate = parseDisplayDate(a.due, { year })
  a.doneDate = parseDisplayDate(a.doneOn, { year })
})

/** Supporting-record checks on MR-2026-02, so each state can be seen. */
export const REVIEW_RECORD_CHECKS: ReviewRecordCheck[] = [
  { id: "RC-001", reviewId: "MR-2026-02", ref: "c4", kind: "nonconformity", recordId: "NC-2026-007", title: "Approved supplier list not re-evaluated for 2026", addedBy: "auto", status: "Reviewed", by: MS, at: "2026-10-14T11:00:00", notes: "Overdue since 4 Oct. Action plan agreed with Joy." },
  { id: "RC-002", reviewId: "MR-2026-02", ref: "c4", kind: "nonconformity", recordId: "NC-2026-008", title: "Wrong label revision shipped to customer", addedBy: "auto", status: "Needs clarification", by: MS, at: "2026-10-14T11:10:00", notes: "Containment record doesn’t say when the customer was told." },
  { id: "RC-003", reviewId: "MR-2026-02", ref: "c2", kind: "objective", recordId: "OBJ-2026-03", title: "First-pass yield", addedBy: "auto", status: "Reviewed", by: MS, at: "2026-10-13T15:00:00", evidenceRef: "EV-0208" },
  { id: "RC-004", reviewId: "MR-2026-02", ref: "c1", kind: "link", url: "https://arden.sharepoint.example/sites/Sales/Survey/customer-survey-q3-2026.pdf", title: "Customer survey results, Q3 2026", addedBy: MS, status: "Reviewed", by: MS, at: "2026-10-12T09:45:00" },
  { id: "RC-005", reviewId: "MR-2026-02", ref: "c7", kind: "link", url: "https://arden-my.sharepoint.example/personal/joy_aquino/Documents/supplier-scorecards-q3.xlsx", title: "Supplier scorecards, Q3 2026", addedBy: "Joy Aquino", status: "Not reviewed" },
  { id: "RC-006", reviewId: "MR-2026-02", ref: "c6", kind: "audit", recordId: "IA-2026-06", title: "Inspection & release audit", addedBy: "auto", status: "Insufficient evidence", by: MS, at: "2026-10-14T12:00:00", notes: "Report still not issued. Findings can’t be confirmed yet." },
]

/** Top management's evaluations on MR-2026-02, after the pack was sent. */
export const REVIEW_EVALUATIONS: ReviewEvaluation[] = [
  { id: "EVL-001", reviewId: "MR-2026-02", ref: "c7", by: "Eric Navarro", status: "Requires management action", comment: "Supplier on-time delivery has been below target all year. I want a supplier plan with dates, not another quarter of monitoring.", at: "2026-10-13T08:30:00" },
  { id: "EVL-002", reviewId: "MR-2026-02", ref: "c6", by: "Eric Navarro", comment: "The Inspection & release report is late.", clarification: { question: "Which findings from IA-2026-06 are still open, and when will the report be issued?" }, at: "2026-10-13T08:40:00" },
]

/**
 * Brings reviews saved in an older shape up to date: a single note becomes the analysis summary,
 * old frozen figures get a status, and the sign-off goes into the ledger.
 */
export function migrateReview(r: ManagementReviewRecord): ManagementReviewRecord {
  return {
    ...r,
    signOffs: r.signOffs ?? (r.signOff ? [r.signOff] : undefined),
    inputs: r.inputs.map((i) => {
      const next: ReviewInput = { ...i }
      if (i.note && !i.analysis) {
        const [by, confirmed] = (i.noteBy ?? "").split(", confirmed by ")
        next.analysis = an(i.note)
        next.preparedBy = next.preparedBy ?? (by || undefined)
        next.confirmedBy = next.confirmedBy ?? confirmed
      }
      delete next.note
      delete next.noteBy
      if (i.frozen && !(i.frozen as Partial<FrozenFigure>).status) next.frozen = { ...i.frozen, status: i.frozen.value ? "valid" : "no-source", method: OLD_METHOD, sources: [] }
      return next
    }),
  }
}
