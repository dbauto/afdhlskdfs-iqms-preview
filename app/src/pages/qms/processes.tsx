import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { useNavigate } from "react-router-dom"
import { ChevronRightIcon, CircleCheckIcon, EllipsisIcon, FileTextIcon, NetworkIcon, SearchIcon, TriangleAlertIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDate, parseDisplayDate, todayIso } from "@/lib/periods"

import { RemarkMarker } from "@/components/app/remarks"
import { visibleRecords, processHealth, processWeeks, clauseCoverage } from "@/lib/record-figures"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { ProcessCoverArt } from "@/components/app/process-cover"
import type { Process } from "@/data/types"

const WEEK = {
  g: { label: "No open issues", cls: "bg-track-ok" },
  s: { label: "Due soon or below target", cls: "bg-track-soon" },
  o: { label: "Overdue", cls: "bg-track-late" },
  n: { label: "No data", cls: "bg-border" },
} as const

const WEEK_PLAIN = { g: "No open issues", s: "Needs attention", o: "Overdue", n: "No data" } as const

/** How long the process has been in its current state, in plain words. */
function streakOf(weeks: string, label: string) {
  const codes = weeks.split("")
  const now = codes.at(-1) ?? "n"
  let run = 0
  for (let i = codes.length - 1; i >= 0 && codes[i] === now; i--) run++
  const span = run >= codes.length ? `for ${codes.length} weeks or more` : `for ${run} week${run === 1 ? "" : "s"}`
  if (now === "g") return `No open issues ${span}`
  if (now === "o") return `Overdue ${span}`
  if (now === "n") return "No data yet"
  return `${label === "KPI below target" ? "Below target" : "Needs attention"} ${span}`
}

function WeekSquares({ weeks }: { weeks: string }) {
  const total = weeks.length
  const codes = weeks.split("").map((w) => (w in WEEK ? w : "n") as keyof typeof WEEK)
  return (
    <span role="img" aria-label={`Last ${total} weeks, oldest first: ${codes.map((k) => WEEK_PLAIN[k].toLowerCase()).join(", ")}`} className="flex gap-[3px]">
      {codes.map((k, i) => {
        const ago = total - 1 - i
        return <i key={i} className={cn("h-3.5 flex-1 rounded-[3px]", WEEK[k].cls)} title={`${ago === 0 ? "This week" : ago === 1 ? "Last week" : `${ago} weeks ago`}: ${WEEK[k].label}`} />
      })}
    </span>
  )
}

type Band = "All" | Process["band"]

const BAND_HINT: Record<Process["band"], string> = {
  Management: "Direction, review and improvement",
  Core: "What the customer pays for",
  Support: "What keeps the rest running",
}

/** Figures a process card shows: documents, open nonconformities and the next planned audit. */
function useProcessFacts() {
  const { state: scoped, canSee } = useStore()
  const state = visibleRecords(scoped, canSee)
  return (p: Process) => {
    const next = state.audits
      .filter((a) => a.process === p.name && !a.heldDate && !["Held", "Findings agreed", "Report issued", "Report late"].includes(a.state))
      .map((a) => a.plannedDate ?? parseDisplayDate(a.date))
      .filter((d): d is string => !!d && d >= todayIso())
      .sort()[0]
    return {
      flag: processHealth(state, p),
      docs: state.documents.filter((d) => d.process === p.name).length,
      ncs: state.ncs.filter((n) => n.process === p.name && n.stage < 6).length,
      nextAudit: next ? formatDate(next, { year: false }) : "None planned",
    }
  }
}

/** Design A: a cover, the 12-week streak and squares. */
function CoverCard({ p }: { p: Process }) {
  const { state: scoped, canSee } = useStore()
  const state = visibleRecords(scoped, canSee)
  const { flag, docs, ncs } = useProcessFacts()(p)
  const weeks = processWeeks(state, p)
  return (
    <Link
      to={`/qms/processes/${p.id}`}
      aria-label={`${p.name}, ${flag.label}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="relative block h-32 shrink-0">
        <ProcessCoverArt process={p} className="size-full" />
        <Badge tone={flag.tone} className="absolute right-3 top-3 shadow-sm">{flag.label}</Badge>
        <Avatar name={p.owner} size={36} className="absolute -bottom-[18px] left-5 ring-2 ring-card" />
      </span>
      <span className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-7">
        <span className="flex flex-col gap-1">
          <span className="text-[0.8125rem] text-muted-foreground">{p.band} · Clauses {p.clauses}</span>
          <span className="flex items-center gap-2 text-[1.0625rem] font-semibold leading-snug group-hover:text-primary">
            {p.name}
            <RemarkMarker kind="Process" id={p.id} />
          </span>
          <span className="text-[0.8125rem] text-muted-foreground">{p.owner}</span>
        </span>
        <span className="flex flex-col gap-2">
          <span className="text-sm font-medium">{streakOf(weeks, flag.label)}</span>
          <WeekSquares weeks={weeks} />
        </span>
        <span className="mt-auto border-t border-rule-soft pt-3 text-[0.8125rem] text-muted-foreground">
          {docs} document{docs === 1 ? "" : "s"} · {ncs ? `${ncs} open nonconformit${ncs === 1 ? "y" : "ies"}` : "no open nonconformities"}
        </span>
      </span>
    </Link>
  )
}

/** Design B: owner, purpose, status and clauses, three figures, and quick links. */
function ActionCard({ p }: { p: Process }) {
  const navigate = useNavigate()
  const { flag, docs, ncs, nextAudit } = useProcessFacts()(p)
  const clauses = p.clauses.split(/,\s*/).filter(Boolean)
  return (
    <article aria-label={p.name} className="flex w-full flex-col rounded-lg border bg-card text-card-foreground shadow-xs">
      <div className="flex items-start gap-3 px-5 pt-5">
        <Avatar name={p.owner} size={40} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-[1.0625rem] font-semibold leading-snug">
            <Link to={`/qms/processes/${p.id}`} className="hover:text-primary hover:underline">
              {p.name}
            </Link>
            <RemarkMarker kind="Process" id={p.id} />
          </h2>
          <span className="truncate text-[0.8125rem] text-muted-foreground">
            {p.owner} · {p.band}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${p.name}`}>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => navigate(`/qms/processes/${p.id}`)}>Open process</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/qms/processes/${p.id}?tab=docs`)}>Documents</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/qms/processes/${p.id}?tab=risks`)}>Risks</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/qms/processes/${p.id}?tab=ncs`)}>Nonconformities</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/qms/processes/${p.id}?tab=audits`)}>Audits</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <p className="line-clamp-3 text-sm text-muted-foreground">{p.purpose || "No purpose written yet."}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={flag.tone}>{flag.label}</Badge>
          {clauses.map((c) => (
            <span key={c} className="rounded-sm border px-1.5 py-0.5 text-xs text-muted-foreground">
              {c}
            </span>
          ))}
        </div>
        <dl className="mt-auto grid grid-cols-3 gap-2 rounded-md bg-muted px-3 py-2.5">
          {[
            ["Documents", docs],
            ["Open NCs", ncs],
            ["Next audit", nextAudit],
          ].map(([k, v]) => (
            <div key={k as string} className="flex min-w-0 flex-col gap-0.5">
              <dt className="truncate text-xs text-muted-foreground">{k}</dt>
              <dd className="truncate text-sm font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex gap-2 border-t px-5 py-3">
        <Button size="sm" asChild>
          <Link to={`/qms/processes/${p.id}`}>Open process</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/qms/processes/${p.id}?tab=docs`}>Documents</Link>
        </Button>
      </div>
    </article>
  )
}

/** Design C: compact rows grouped by band. */
function GroupedList({ groups }: { groups: { band: Process["band"]; items: Process[] }[] }) {
  const facts = useProcessFacts()
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.band} aria-labelledby={`band-${g.band}`} className="overflow-hidden rounded-lg border bg-card">
          <header className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
            <div className="flex flex-col">
              <h2 id={`band-${g.band}`} className="text-[0.9375rem] font-semibold">
                {g.band}
              </h2>
              <span className="text-[0.8125rem] text-muted-foreground">{BAND_HINT[g.band]}</span>
            </div>
            <Badge tone="draft">{g.items.length}</Badge>
          </header>
          <ul aria-label={`${g.band} processes`}>
            {g.items.map((p) => {
              const { flag } = facts(p)
              return (
                <li key={p.id} className="border-t border-rule-soft first:border-t-0">
                  <Link to={`/qms/processes/${p.id}`} aria-label={`${p.name}, ${flag.label}`} className="flex items-center gap-3 px-5 py-3 hover:bg-hover">
                    <Avatar name={p.owner} size={32} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {p.name}
                        <RemarkMarker kind="Process" id={p.id} />
                      </span>
                      <span className="truncate text-[0.8125rem] text-muted-foreground">
                        {p.owner} · Clauses {p.clauses}
                      </span>
                    </span>
                    <Badge tone={flag.tone} className="shrink-0">{flag.label}</Badge>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function Processes() {
  const { state: scoped, can, canSee, user, settings } = useStore()
  const state = visibleRecords(scoped, canSee)
  const coverage = clauseCoverage(state, canSee)
  const flagged = state.processes.filter(p => ["o", "s"].includes(processHealth(state, p).code)).length
  const layout = settings.processLayout[user.id] ?? "actions"
  const [band, setBand] = React.useState<Band>("All")
  const [q, setQ] = React.useState("")
  const order: Process["band"][] = ["Management", "Core", "Support"]
  const match = (p: Process) => !q.trim() || `${p.name} ${p.owner} ${p.clauses}`.toLowerCase().includes(q.trim().toLowerCase())
  const shown = order.flatMap((b) => state.processes.filter((p) => p.band === b && (band === "All" || band === b) && match(p)))

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "QMS" }, { label: "Processes" }]}
        title="Processes"
        description="How the business works as a set of processes, who owns each, and which ISO 9001 clauses each one covers. Clause 4.4."
        actions={can("Processes", "Manage") && <Button variant="outline" asChild><Link to="/settings/process-structure">Edit process structure</Link></Button>}
      />
      <FigureGrid
        figures={[
          { value: state.processes.length, label: "Processes in the QMS", badge: "All have owners", tone: "done", icon: NetworkIcon },
          { value: flagged, label: "Need attention", badge: `${state.processes.filter(p => processHealth(state, p).code === "o").length} overdue`, tone: "overdue", icon: TriangleAlertIcon },
          { value: coverage.hasData ? `${coverage.current} of ${coverage.total}` : "No data", label: "Requirements with linked evidence", badge: "Linked references", tone: "done", icon: CircleCheckIcon },
          { value: state.documents.length, label: "Controlled documents", badge: `${state.documents.filter(d => d.reviewOverdue).length} overdue`, tone: "soon", icon: FileTextIcon, to: "/documents" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ViewChips<Band>
            value={band}
            onChange={setBand}
            views={(["All", ...order] as Band[]).map((b) => ({ id: b, label: b, count: b === "All" ? state.processes.length : state.processes.filter((p) => p.band === b).length }))}
          />
          <label className="flex h-9 w-full items-center gap-2 rounded-sm border border-input bg-card px-3 sm:w-64">
            <SearchIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search processes" aria-label="Search processes" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
        {layout === "covers" ? (
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(Object.keys(WEEK) as (keyof typeof WEEK)[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <i className={cn("size-2.5 rounded-[2px]", WEEK[k].cls)} />
                {WEEK_PLAIN[k]}
              </span>
            ))}
            <span>Each square is one week.</span>
          </span>
        ) : (
          <Link to="/settings/appearance" className="text-[0.8125rem] font-medium text-primary hover:underline">
            Change layout
          </Link>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border bg-card px-5 py-6 text-sm text-muted-foreground">No processes match “{q}”.</p>
      ) : layout === "list" ? (
        <GroupedList groups={order.map((b) => ({ band: b, items: shown.filter((p) => p.band === b) })).filter((g) => g.items.length)} />
      ) : (
        <ul aria-label="Processes" className={cn("grid gap-4", layout === "covers" ? "grid-cols-[repeat(auto-fill,minmax(min(100%,18.5rem),1fr))]" : "grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]")}>
          {shown.map((p) => (
            <li key={p.id} className="flex">
              {layout === "covers" ? <CoverCard p={p} /> : <ActionCard p={p} />}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
