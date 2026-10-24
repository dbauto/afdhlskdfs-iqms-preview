import { useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** A route-level fallback. No mock records, status colours or simulated percentages. */
function Bar({ width = "w-28", height = "h-3" }: { width?: string; height?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded-sm bg-muted motion-reduce:animate-none", width, height)} />
}
function Rows({ count = 5 }: { count?: number }) {
  return <div className="divide-y divide-rule-soft">{Array.from({ length: count }, (_, i) => <div key={i} className="flex items-center gap-4 py-4"><Bar width="w-8" height="h-8" /><div className="min-w-0 flex-1 space-y-2"><Bar width="w-3/5" /><Bar width="w-2/5" height="h-2" /></div><Bar width="w-16" /></div>)}</div>
}
export function PageLoading() {
  const { pathname } = useLocation()
  const title = pathname === "/" ? "Overview" : pathname.startsWith("/qms/processes") ? "Processes" : pathname.startsWith("/risks") ? "Risks & Opportunities" : pathname.startsWith("/documents") ? "Documents" : pathname.startsWith("/audits") ? "Audits" : pathname.startsWith("/readiness") ? "Certification readiness" : "Page"
  const table = /documents|audits|processes/.test(pathname)
  const matrix = pathname.startsWith("/risks")
  return <section aria-busy="true" aria-label={`Loading ${title}`} role="status" className="flex flex-col gap-6">
    <span className="sr-only">Loading {title}</span>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-[1.75rem] font-semibold">{title}</h1><Bar width="w-24" height="h-8" /></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Card key={i}><CardContent className="flex items-center gap-3 py-5"><Bar width="w-10" height="h-10" /><div className="space-y-3"><Bar width="w-20" height="h-5" /><Bar width="w-28" /></div></CardContent></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><Bar width="w-36" height="h-4" /></CardHeader><CardContent>{matrix ? <div className="grid grid-cols-5 gap-1">{Array.from({ length: 25 }, (_, i) => <Bar key={i} width="w-full" height="h-10" />)}</div> : table ? <Rows /> : <div className="flex h-48 items-end gap-3">{Array.from({ length: 6 }, (_, i) => <Bar key={i} width="w-full" height={["h-16","h-24","h-32","h-20","h-40","h-28"][i]} />)}</div>}</CardContent></Card>
      <Card><CardHeader><Bar width="w-32" height="h-4" /></CardHeader><CardContent><Rows count={4} /></CardContent></Card>
    </div>
  </section>
}
