import { Link } from "react-router-dom"
import { ChevronLeftIcon } from "lucide-react"

import { AI_REVIEWS, BOT_SCANS, FINDINGS, FIX_DAYS } from "@/data/platform"
import { Button } from "@/components/ui/button"
import { ProductMark } from "@/components/app/product-mark"

/**
 * Quarterly security scan report for auditors (ADR-038). Its own page so it prints cleanly with the browser.
 * In production the content is frozen when created, kept 7 years and fingerprinted (SHA-256).
 */
const ROWS: { sev: keyof typeof FIX_DAYS; raised: number; onTime: number | null; late: number; open: string }[] = [
  { sev: "Critical", raised: 0, onTime: null, late: 0, open: "0" },
  { sev: "High", raised: 4, onTime: 3, late: 0, open: "1 overdue" },
  { sev: "Medium", raised: 11, onTime: 11, late: 0, open: "0" },
  { sev: "Low", raised: 12, onTime: 11, late: 0, open: "1 exception" },
]

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 break-inside-avoid">
      <h2 className="text-[0.9375rem] font-semibold">
        {n}. {title}
      </h2>
      {children}
    </section>
  )
}

const cell = "border-t border-border px-3 py-2 text-left align-top"
const head = "bg-background px-3 py-2 text-left font-semibold"

export default function ScanReport() {
  const open = FINDINGS.filter((f) => f.state !== "Fixed, retest passed")
  return (
    <div className="min-h-screen bg-background py-8 print:bg-card print:py-0">
      <div className="mx-auto mb-4 flex max-w-[860px] items-center justify-between gap-3 px-4 print:hidden">
        <Link to="/platform/scans" className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary">
          <ChevronLeftIcon className="size-4" /> Back to Security scans
        </Link>
        <Button onClick={() => window.print()}>Print or save as PDF</Button>
      </div>
      <article className="mx-auto flex max-w-[860px] flex-col gap-6 border bg-card px-8 py-10 text-[0.8125rem] leading-relaxed print:border-0 print:px-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-foreground pb-4">
          <div className="flex flex-col gap-1.5">
            <ProductMark />
            <h1 className="pt-2 text-2xl font-semibold tracking-[-0.015em]">Security scan report</h1>
            <p className="text-muted-foreground">Period 1 July 2026 – 30 September 2026 · Report SSR-2026-Q3</p>
          </div>
          <div className="flex flex-col gap-0.5 text-right text-xs text-muted-foreground">
            <span>Created 27 Oct 2026 by Leo Navarro</span>
            <span>Release covered: 2026.10.3</span>
            <span>Policy: POL-07 Vulnerability management</span>
            <span className="font-semibold text-foreground">Internal · not for client distribution</span>
          </div>
        </header>

        <Section n={1} title="Summary">
          <p>27 findings were raised in the period. 25 were fixed and retested within the POL-07 times, 1 high finding is overdue with a fix in review, and 1 low finding has an approved exception. No finding involved client data or a production credential. No live site check or penetration test was done in this period.</p>
        </Section>

        <Section n={2} title="Fix times against POL-07">
          <div className="overflow-x-auto border">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  {["Severity", "Target", "Raised", "On time", "Late", "Open"].map((h) => (
                    <th key={h} className={head}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.sev}>
                    <td className={cell}>{r.sev}</td>
                    <td className={cell}>{FIX_DAYS[r.sev] <= 3 ? "72 hours" : `${FIX_DAYS[r.sev]} days`}</td>
                    <td className={cell}>{r.raised}</td>
                    <td className={cell}>{r.onTime ?? "No data"}</td>
                    <td className={cell}>{r.late}</td>
                    <td className={cell}>{r.open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section n={3} title="Scans run">
          <div className="overflow-x-auto border">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <th className={head}>Scan</th>
                  <th className={head}>How it runs</th>
                  <th className={head}>Last result</th>
                </tr>
              </thead>
              <tbody>
                {BOT_SCANS.map((s) => (
                  <tr key={s.name}>
                    <td className={cell}>{s.kind === "Bot" ? `Bot · ${s.name}` : s.name}</td>
                    <td className={cell}>{s.kind === "Bot" ? `Automatic · ${s.runs}` : s.runs}</td>
                    <td className={cell}>{s.result}</td>
                  </tr>
                ))}
                {AI_REVIEWS.map((r) => (
                  <tr key={r.id}>
                    <td className={cell}>AI review · {r.reviewer === "Anthropic (Claude)" ? "Claude" : r.reviewer} ({r.id})</td>
                    <td className={cell}>Manual · {r.by}, {r.at} · {r.scope}</td>
                    <td className={cell}>{r.result}. Findings counted only after a person confirmed them.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section n={4} title="Open findings and exceptions">
          <div className="overflow-x-auto border">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr>
                  {["ID", "Severity", "Finding", "Found by", "Fix by or expiry", "Owner"].map((h) => (
                    <th key={h} className={head}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {open.map((f) => (
                  <tr key={f.id}>
                    <td className={cell}>{f.id}</td>
                    <td className={cell}>{f.severity}</td>
                    <td className={cell}>{f.title}</td>
                    <td className={cell}>{f.foundBy}</td>
                    <td className={cell}>
                      {f.state === "Accepted until" ? `Exception until ${f.fixBy}` : f.fixBy}
                      {f.overdue ? ", overdue" : ""}
                    </td>
                    <td className={cell}>{f.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section n={5} title="Sign-off">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col border-t border-foreground pt-1.5">
              <span className="font-semibold">Prepared by</span>
              <span className="text-muted-foreground">Leo Navarro, Platform admin · 27 Oct 2026</span>
            </div>
            <div className="flex flex-col border-t border-foreground pt-1.5">
              <span className="font-semibold">Reviewed by (security owner)</span>
              <span className="text-muted-foreground">Not yet signed</span>
            </div>
          </div>
        </Section>
        <p className="text-xs text-muted-foreground">Sample report in the preview. In production the report is fixed when created, kept for 7 years and shows its SHA-256 fingerprint.</p>
      </article>
    </div>
  )
}
