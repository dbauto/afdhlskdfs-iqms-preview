import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { AI_REVIEWS, BOT_SCANS, FIX_DAYS, PESO_PER_USD, PROVIDERS, peso, tokens, type AiReview, type Finding } from "@/data/platform"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NativeSelect, Textarea } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { Field } from "@/components/app/form"
import { FigureGrid } from "@/components/app/page"
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, ShieldCheckIcon } from "lucide-react"
import { PlatformHeader } from "./shell"
import { usePlatformAccess } from "@/lib/platform-access"
import { useConsole } from "@/lib/console-store"
import { KeyFacts } from "@/components/app/page"

function TableTitle({ title, note }: { title: string; note: string }) {
  return (
    <span className="flex w-full flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
      <span className="text-[0.8125rem] text-muted-foreground">{note}</span>
    </span>
  )
}

const SEV_TONE: Record<Finding["severity"], BadgeTone> = { Critical: "overdue", High: "overdue", Medium: "soon", Low: "draft" }
const SCOPES = ["Whole release 2026.10.4", "Sign-in and sessions", "Permissions and classification", "Uploads and links", "Client isolation (organization_id checks)"]

function StartReview({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: (r: AiReview[]) => void }) {
  const { me } = usePlatformAccess()
  const connected = PROVIDERS.filter((p) => p.last4).map((p) => p.provider)
  const [who, setWho] = React.useState<Record<string, boolean>>({ "Anthropic (Claude)": true })
  const [scope, setScope] = React.useState(SCOPES[0])
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const chosen = connected.filter((p) => who[p])
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start AI review</DialogTitle>
          <DialogDescription>The AI reviews code only, never client data. Findings count after a person confirms them. Cost comes out of the AI vulnerability scanner budget.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Reviewer</span>
          {PROVIDERS.map((p) => (
            <label key={p.provider} className={cn("flex items-center gap-2 text-sm", !p.last4 && "text-muted-foreground")}>
              <Checkbox checked={!!who[p.provider]} disabled={!p.last4} onCheckedChange={(v) => setWho({ ...who, [p.provider]: !!v })} />
              {p.provider}
              {!p.last4 && " (connect it in AI assistants first)"}
            </label>
          ))}
        </div>
        <Field label="What to review" htmlFor="air-scope">
          <NativeSelect id="air-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Why now" htmlFor="air-reason" error={error} help="Kept in the run log and the audit report.">
          <Textarea id="air-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Before releasing Google sign-in" aria-invalid={!!error} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || chosen.length === 0}
            onClick={() => {
              if (!reason.trim()) return setError("Say why you’re running this review.")
              setBusy(true)
              const runs = chosen.map((p, i): AiReview => ({ id: `AIR-${String(6 + i).padStart(3, "0")}`, reviewer: p, scope, reason: reason.trim(), by: me.name, at: "Just now", result: "Running", tone: "soon", tokens: 0, usd: 0 }))
              onStart(runs)
              toast(`AI review started with ${chosen.join(" and ")}`, { description: "You’re notified when findings are ready to confirm." })
              setReason("")
              setBusy(false)
              onClose()
            }}
          >
            Start review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FindingDialog({ f, onClose, canAct, onConfirm, onDismiss, onFixed }: { f?: Finding; onClose: () => void; canAct: boolean; onConfirm: (f: Finding) => void; onDismiss: (f: Finding, why: string) => void; onFixed: (f: Finding) => void }) {
  const [why, setWhy] = React.useState("")
  const [error, setError] = React.useState("")
  React.useEffect(() => {
    setWhy("")
    setError("")
  }, [f?.id])
  return (
    <Dialog open={!!f} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {f?.id} {f?.title}
          </DialogTitle>
          <DialogDescription>{f && !f.confirmed ? "Found by an AI review. It counts only after a person confirms it’s real." : "Closed only after the fix is released and the scan passes again."}</DialogDescription>
        </DialogHeader>
        {f && (
          <KeyFacts
            facts={[
              { k: "Severity", v: <Badge tone={SEV_TONE[f.severity]}>{f.severity}</Badge> },
              { k: "Found by", v: `${f.foundBy}, ${f.found}` },
              { k: "Fix by", v: `${f.fixBy}${f.overdue ? ", overdue" : ""} (${FIX_DAYS[f.severity]} days for ${f.severity.toLowerCase()})` },
              { k: "Owner", v: f.owner },
              { k: "Status", v: f.confirmed ? f.state : "Needs confirming" },
            ]}
          />
        )}
        {f && !f.confirmed && canAct && (
          <Field label="If it isn’t real, why" htmlFor="fd-why" error={error} help="Kept in the activity log.">
            <Textarea id="fd-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="The redirect is already blocked by the link allow-list" aria-invalid={!!error} />
          </Field>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {f && canAct && !f.confirmed && (
            <>
              <Button variant="outline" onClick={() => { if (!why.trim()) return setError("Say why it isn’t a real problem."); onDismiss(f, why.trim()); onClose() }}>
                Dismiss
              </Button>
              <Button onClick={() => { onConfirm(f); onClose() }}>Confirm finding</Button>
            </>
          )}
          {f && canAct && f.confirmed && f.state !== "Fixed, retest passed" && f.state !== "Accepted until" && (
            <Button onClick={() => { onFixed(f); onClose() }}>Mark fixed after retest</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SecurityScans() {
  const { can, me } = usePlatformAccess()
  const c = useConsole()
  const FINDINGS = c.findings
  const [openId, setOpenId] = React.useState<string>()
  const [reviews, setReviews] = React.useState(AI_REVIEWS)
  const [start, setStart] = React.useState(false)
  const open = FINDINGS.filter((f) => f.state === "Open" || f.state === "Fix in review")
  const overdue = FINDINGS.filter((f) => f.overdue).length
  const accepted = FINDINGS.filter((f) => f.state === "Accepted until").length
  return (
    <>
      <PlatformHeader
        eyebrow="Operations"
        title="Security scans"
        description="Bot scans run by themselves. AI reviews by Claude and OpenAI start only when you run them. Both look at code and synthetic data, never client records. Fix times follow POL-07."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/platform/scans/report">Create audit report</Link>
            </Button>
            {can("scans.run") && <Button onClick={() => setStart(true)}>Start AI review</Button>}
          </>
        }
      />
      <FigureGrid
        figures={[
          { value: String(overdue), label: "Past their fix date", badge: "Overdue", tone: "overdue", icon: AlertTriangleIcon },
          { value: String(open.length - overdue), label: "Open findings", badge: "Due soon", tone: "soon", icon: ClockIcon },
          { value: String(accepted), label: "Accepted with an expiry date", badge: "Exception", tone: "draft", icon: ShieldCheckIcon },
          { value: "14", label: "Fixed in time, last 90 days", badge: "On target", tone: "done", icon: CheckCircle2Icon },
        ]}
      />
      <DataTable
          toolbar={<TableTitle title="Bot scans" note="Automatic. Schedule changes need a second platform admin." />}
          label="Bot scans"
          rows={BOT_SCANS}
          getRowId={(s) => s.name}
          minWidth={820}
          columns={[
            { id: "n", header: "Scan", cell: (s) => <span className="font-medium">{s.name}</span> },
            { id: "c", header: "What it checks", cell: (s) => <span className="text-[0.8125rem] text-muted-foreground">{s.checks}</span> },
            { id: "r", header: "Runs", cell: (s) => <span className="text-[0.8125rem]">{s.runs}</span> },
            { id: "l", header: "Last run", cell: (s) => <span className="whitespace-nowrap text-[0.8125rem]">{s.last}</span> },
            { id: "s", header: "Result", cell: (s) => <Badge tone={s.tone}>{s.result}</Badge> },
          ]}
        />
      <DataTable
          toolbar={<TableTitle title="AI reviews" note="Manual. Each run is logged with who started it, what was sent and a checksum of the result." />}
          label="AI reviews"
          rows={reviews}
          getRowId={(r) => r.id}
          minWidth={860}
          columns={[
            { id: "w", header: "Reviewer", cell: (r) => <span className="flex flex-col"><span className="font-medium">{r.reviewer === "Anthropic (Claude)" ? "Claude" : r.reviewer}</span><span className="font-mono text-xs text-muted-foreground">{r.id}</span></span> },
            { id: "s", header: "Scope and reason", cell: (r) => <span className="flex flex-col"><span className="text-[0.8125rem]">{r.scope}</span><span className="text-xs text-muted-foreground">{r.reason}</span></span> },
            { id: "b", header: "Started by", cell: (r) => <span className="whitespace-nowrap text-[0.8125rem]">{r.by}, {r.at}</span> },
            { id: "c", header: "Cost", cell: (r) => <span className="whitespace-nowrap text-[0.8125rem]">{r.tokens ? `${tokens(r.tokens)} tokens · ${peso(r.usd * PESO_PER_USD)}` : "No data"}</span> },
            { id: "r", header: "Result", cell: (r) => <Badge tone={r.tone}>{r.result}</Badge> },
          ]}
        />
      <DataTable
          toolbar={<TableTitle title="Findings" note="Closed only after the fix is released and the scan passes again." />}
          label="Security findings"
          rows={FINDINGS.filter((f) => f.state !== "Fixed, retest passed")}
          getRowId={(f) => f.id}
          minWidth={900}
          columns={[
            { id: "v", header: "Severity", cell: (f) => <Badge tone={SEV_TONE[f.severity]}>{f.severity}</Badge> },
            { id: "t", header: "Finding", className: "min-w-[260px]", cell: (f) => <button type="button" onClick={() => setOpenId(f.id)} className="flex cursor-pointer flex-col text-left"><span className="font-medium text-primary hover:underline">{f.title}</span><span className="font-mono text-xs text-muted-foreground">{f.id}{f.confirmed ? "" : " · needs confirming"}</span></button> },
            { id: "f", header: "Found by", cell: (f) => <span className="whitespace-nowrap text-[0.8125rem]">{f.foundBy}, {f.found}</span> },
            { id: "d", header: "Fix by", cell: (f) => <span className={cn("whitespace-nowrap text-[0.8125rem]", f.overdue && "font-semibold text-overdue")}>{f.fixBy}{f.overdue ? ", overdue" : ""}<span className="block text-xs font-normal text-muted-foreground">{FIX_DAYS[f.severity]} days for {f.severity.toLowerCase()}</span></span> },
            { id: "o", header: "Owner", cell: (f) => <span className="whitespace-nowrap text-[0.8125rem]">{f.owner}</span> },
            { id: "s", header: "Status", cell: (f) => <span className="whitespace-nowrap text-[0.8125rem]">{f.state === "Accepted until" ? `Accepted until ${f.fixBy}` : f.state}</span> },
          ]}
        />
      <FindingDialog
        f={FINDINGS.find((x) => x.id === openId)}
        onClose={() => setOpenId(undefined)}
        canAct={can("scans.run")}
        onConfirm={(f) => { c.setFinding(f.id, { confirmed: true }); c.log(me, "confirmed AI finding", f.id, "Security"); toast(`${f.id} confirmed`, { description: "It now counts in the findings and the audit report." }) }}
        onDismiss={(f, why) => { c.removeFinding(f.id); c.log(me, `dismissed AI finding (${why})`, f.id, "Security"); toast(`${f.id} dismissed`) }}
        onFixed={(f) => { c.setFinding(f.id, { state: "Fixed, retest passed", overdue: false }); c.log(me, "marked fixed after retest", f.id, "Security"); toast(`${f.id} marked fixed`) }}
      />
      <StartReview open={start} onClose={() => setStart(false)} onStart={(r) => setReviews((all) => [...r, ...all])} />
    </>
  )
}
