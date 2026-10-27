import type { SupportReport } from "./types"

/** a synthetic screenshot for the preview: an upload that stops at 100% */
const SAMPLE_SHOT = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="rgb(245,246,247)"/><rect x="0" y="0" width="200" height="540" fill="rgb(255,255,255)" stroke="rgb(226,229,233)"/><rect x="24" y="28" width="110" height="18" rx="4" fill="rgb(205,210,216)"/><rect x="24" y="84" width="150" height="12" rx="3" fill="rgb(226,229,233)"/><rect x="24" y="112" width="130" height="12" rx="3" fill="rgb(226,229,233)"/><rect x="16" y="134" width="168" height="30" rx="4" fill="rgb(236,238,251)"/><rect x="24" y="174" width="140" height="12" rx="3" fill="rgb(226,229,233)"/><text x="232" y="62" font-family="sans-serif" font-size="24" font-weight="600" fill="rgb(24,32,43)">Evidence</text><rect x="232" y="96" width="696" height="300" rx="8" fill="rgb(255,255,255)" stroke="rgb(226,229,233)"/><text x="256" y="134" font-family="sans-serif" font-size="16" font-weight="600" fill="rgb(24,32,43)">Upload file</text><text x="256" y="176" font-family="sans-serif" font-size="14" fill="rgb(74,84,99)">Supplier evaluation 2026.xlsx · 8.1 MB</text><rect x="256" y="196" width="648" height="10" rx="5" fill="rgb(43,58,158)"/><text x="856" y="230" font-family="sans-serif" font-size="13" fill="rgb(74,84,99)">100%</text><rect x="256" y="320" width="120" height="40" rx="4" fill="rgb(43,58,158)" opacity="0.5"/><text x="282" y="345" font-family="sans-serif" font-size="14" fill="rgb(255,255,255)">Uploading…</text></svg>`
)}`

export const SUPPORT_REPORTS: SupportReport[] = [
  {
    id: "SR-1043",
    source: "Error monitor",
    org: "Arden & Co.",
    category: "Something isn’t working",
    impact: "It slows me down",
    title: "Evidence export failed 3 times in a row",
    details: "Background job evidence-export failed for Arden & Co. at 02:10, 02:40 and 03:10. Error: payload too large when zipping 214 evidence items.",
    attachments: [],
    state: "Waiting for approval",
    created: "Today, 03:12",
    updates: [
      { when: "Today, 03:12", who: "Error monitor", text: "Raised after the third failure in a row." },
      { when: "Today, 03:20", who: "AI agent", text: "Reproduced in the sandbox with a copy of the job settings (no client files)." },
      { when: "Today, 04:05", who: "AI agent", text: "Fix tested in the sandbox. Waiting for your approval to deploy." },
    ],
    agent: {
      finding: "The export builds the whole zip in memory. Workers stop at 128 MB, so large organisations fail.",
      fix: "Stream the zip to R2 in parts instead of building it in memory.",
      branch: "fix/sr-1043-stream-evidence-export",
      tests: "41 tests passed, including a new one with 500 evidence items.",
      sandbox: "sandbox.iqms.example/sr-1043",
    },
  },
  {
    id: "SR-1042",
    source: "Person",
    org: "Arden & Co.",
    from: "Joy Aquino",
    email: "joy.aquino@arden.example",
    category: "Something isn’t working",
    impact: "I can’t work",
    title: "Can’t upload the supplier evaluation file",
    details: "I pick the file, the bar reaches 100% and then nothing. Tried twice. File is an Excel sheet, 8 MB.",
    page: "/evidence",
    attachments: ["upload-stuck.jpg"],
    screenshots: [{ name: "upload-stuck.jpg", width: 960, height: 540, bytes: 84_000, data: SAMPLE_SHOT }],
    diagnostics: { app: "0.9.0", browser: "Edge on Windows, screen 1536×730 at 125% scale", time: "Yesterday, 16:22", role: "Process owner", errors: ["Upload failed: 413 Request Entity Too Large"] },
    state: "Investigating",
    created: "Yesterday, 16:24",
    updates: [
      { when: "Yesterday, 16:24", who: "Joy Aquino", text: "Report sent." },
      { when: "Yesterday, 16:30", who: "AI agent", text: "Upload limit for Excel files is 5 MB. Checking whether to raise it or show a clear message." },
    ],
    agent: { finding: "Uploads over 5 MB are refused but the page doesn’t say so." },
  },
  {
    id: "SR-1039",
    source: "Person",
    org: "Arden & Co.",
    from: "Maria Santos",
    email: "maria.santos@arden.example",
    category: "Question",
    impact: "Minor",
    title: "How do I change who approves procedures?",
    details: "We moved document approval from Eric to me for procedures.",
    page: "/settings/review-routes",
    attachments: [],
    state: "Closed",
    created: "10 Oct",
    updates: [
      { when: "10 Oct", who: "Maria Santos", text: "Report sent." },
      { when: "10 Oct", who: "Leo Navarro", text: "Settings › Review and approval, Procedures row. Closed after reply." },
    ],
  },
  {
    id: "SR-1038",
    source: "Error monitor",
    org: "Bayani Foods",
    category: "Access or sign-in",
    impact: "I can’t work",
    title: "Microsoft 365 sign-in failing for 4 users",
    details: "AADSTS50105 for 4 users in 1 hour. The tenant’s app assignment probably changed.",
    attachments: [],
    state: "Deployed",
    created: "8 Oct",
    updates: [
      { when: "8 Oct", who: "Error monitor", text: "Raised after 4 failed sign-ins." },
      { when: "8 Oct", who: "AI agent", text: "No code fault. Clearer message added for users not assigned to the app; tested in the sandbox." },
      { when: "8 Oct", who: "Leo Navarro", text: "Approved and deployed." },
    ],
    agent: { finding: "Client’s IT removed the ThryveMS app assignment for a group.", fix: "Show “Ask your IT team to give you access to ThryveMS” instead of a generic error.", branch: "fix/sr-1038-m365-assignment-message", tests: "All passed", sandbox: "sandbox.iqms.example/sr-1038" },
  },
]
