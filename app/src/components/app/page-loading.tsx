import type { ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/app/page"
import { cn } from "@/lib/utils"

/** Visual placeholders only: no artificial figures, records, or status colours. */
function Pulse({ width = "w-28", height = "h-3", className }: { width?: string; height?: string; className?: string }) {
  return <span aria-hidden="true" className={cn("block max-w-full animate-pulse rounded-sm bg-muted motion-reduce:animate-none", width, height, className)} />
}

function Figures() {
  return <div className="@container"><div className="grid grid-cols-1 gap-4 @[30rem]:grid-cols-2 @[52rem]:grid-cols-4 short:gap-3">
    {Array.from({ length: 4 }, (_, i) => <div key={i} className="flex min-w-0 flex-col gap-5 rounded-md border bg-card p-5 short:gap-3 short:p-4">
      <div className="flex items-start justify-between gap-3"><Pulse width="w-10" height="h-10" /><Pulse width="w-14" height="h-5" /></div>
      <div className="flex flex-col gap-2"><Pulse width="w-24" height="h-7" /><Pulse width="w-36" height="h-3" /></div>
    </div>)}
  </div></div>
}

function Rows({ count = 4 }: { count?: number }) {
  return <div className="divide-y divide-rule-soft">{Array.from({ length: count }, (_, i) =>
    <div key={i} className="flex min-w-0 items-center gap-4 px-5 py-3.5">
      <Pulse width="w-9" height="h-8" className="shrink-0" />
      <div className="min-w-0 flex-1 space-y-2"><Pulse width="w-3/5" /><Pulse width="w-2/5" height="h-2" /></div>
      <Pulse width="w-16" className="hidden shrink-0 sm:block" />
    </div>
  )}</div>
}

function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return <Card><CardHeader>{title ? <CardTitle>{title}</CardTitle> : <Pulse width="w-36" height="h-4" />}</CardHeader>{children}</Card>
}

function TablePlaceholder() {
  return <div className="min-w-0 overflow-hidden rounded-md border bg-card">
    <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3"><Pulse width="w-48" height="h-9" /><Pulse width="w-32" height="h-9" /><Pulse width="w-24" height="h-9" /></div>
    <div className="flex items-center gap-5 border-b bg-muted/30 px-5 py-3">{["w-32", "w-20", "w-24", "w-16"].map((width, i) => <Pulse key={i} width={width} height="h-2" />)}</div>
    <Rows count={7} />
    <div className="flex justify-end border-t px-5 py-3"><Pulse width="w-40" /></div>
  </div>
}

function Chips() {
  return <div className="flex flex-wrap gap-2">{["w-20", "w-16", "w-24", "w-16", "w-20"].map((width, i) => <Pulse key={i} width={width} height="h-8" className="rounded-full" />)}</div>
}

function Matrix() {
  return <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">{Array.from({ length: 25 }, (_, i) => <Pulse key={i} width="w-full" height="h-12" className="rounded-sm" />)}</div>
}

function OverviewPlaceholder() {
  return <>
    <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-4"><Pulse width="w-5" height="h-5" /><Pulse width="w-3/4" /></div>
    <Panel title="Certification readiness"><CardContent>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col items-center justify-center gap-5 py-4">
          <Pulse width="w-44" height="h-24" className="rounded-t-full" />
          <Pulse width="w-32" /><Pulse width="w-3/4" />
          <div className="w-full space-y-3 pt-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="flex items-center gap-3"><Pulse width="w-28" /><Pulse width="w-full" height="h-2" /><Pulse width="w-10" /></div>)}</div>
        </div>
        <div className="min-w-0 border-t border-rule-soft pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><Pulse width="w-24" height="h-4" /><Rows count={4} /></div>
      </div>
    </CardContent></Panel>
    <Figures />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Panel title="My tasks"><Rows /></Panel><Panel title="Coming up"><Rows /></Panel>
    </div>
  </>
}

function RisksPlaceholder() {
  return <>
    <Figures />
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Panel title="Risk matrix"><CardContent><Matrix /></CardContent></Panel>
      <Panel title="Highest risks"><Rows /></Panel>
    </div>
    <Chips /><TablePlaceholder />
  </>
}

function ProcessesPlaceholder() {
  return <><Figures /><div className="flex flex-wrap items-center justify-between gap-3"><Chips /><Pulse width="w-48" height="h-9" /></div>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18.5rem),1fr))] gap-4">
      {Array.from({ length: 6 }, (_, i) => <Card key={i} className="overflow-hidden"><Pulse width="w-full" height="h-32" className="rounded-none" /><CardContent className="space-y-4 py-5"><Pulse width="w-3/4" height="h-5" /><Pulse width="w-1/2" /><Pulse width="w-full" height="h-3" /></CardContent></Card>)}
    </div>
  </>
}

function DocumentsPlaceholder() {
  return <><Chips /><div className="flex items-center gap-3"><Pulse width="w-24" height="h-9" /><Pulse width="w-32" height="h-9" /></div><TablePlaceholder /></>
}

function AuditsPlaceholder() {
  return <><Figures /><Chips /><Panel title="2026 programme"><CardContent>
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">{Array.from({ length: 36 }, (_, i) => <Pulse key={i} width="w-full" height="h-9" />)}</div>
  </CardContent></Panel></>
}

function ReadinessPlaceholder() {
  return <><Figures /><div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <Panel title="Readiness by clause"><CardContent className="space-y-4">{Array.from({ length: 7 }, (_, i) => <div key={i} className="flex items-center gap-3"><Pulse width="w-24" /><Pulse width="w-full" height="h-2" /><Pulse width="w-12" /></div>)}</CardContent></Panel>
    <Panel title="Before Stage 1"><Rows /></Panel>
  </div><Chips /><TablePlaceholder /></>
}

function GenericPlaceholder() {
  return <><Chips /><Panel><Rows count={6} /></Panel></>
}

/** Route fallback keeps the real page's section order, spacing and existing card styling. */
export function PageLoading() {
  const { pathname } = useLocation()
  const overview = pathname === "/"
  const risks = pathname === "/risks"
  const processes = pathname === "/qms/processes"
  const documents = pathname === "/documents" || pathname === "/qms/procedures"
  const audits = pathname === "/audits"
  const readiness = pathname === "/readiness"
  const title = overview ? "Overview" : risks ? "Risks & Opportunities" : processes ? "Processes" : documents ? (pathname === "/qms/procedures" ? "Procedures" : "Documents") : audits ? "Audits" : readiness ? "Certification readiness" : pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ") ?? "Page"

  return <section role="status" aria-busy="true" aria-label={`Loading ${title}`} className="flex min-w-0 flex-col gap-6">
    <span className="sr-only">Loading {title}</span>
    {overview ? <div className="flex flex-col gap-2"><Pulse width="w-64" height="h-8" /><Pulse width="w-2/3" /></div> : <div className="flex flex-col gap-2"><PageHeader title={title} /><Pulse width="w-2/3" height="h-3" /></div>}
    {overview ? <OverviewPlaceholder /> : risks ? <RisksPlaceholder /> : processes ? <ProcessesPlaceholder /> : documents ? <DocumentsPlaceholder /> : audits ? <AuditsPlaceholder /> : readiness ? <ReadinessPlaceholder /> : <GenericPlaceholder />}
  </section>
}
