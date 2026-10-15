import { Link, Navigate, useParams } from "react-router-dom"
import { ArrowLeftIcon, PrinterIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { LEGAL_DOCS, LEGAL_STATUS, legalDoc } from "@/legal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/app/markdown"
import { ProductMark } from "@/components/app/product-mark"

/**
 * Public legal centre, readable without signing in (linked from the sign-in page).
 * The same documents appear in Settings › Legal and agreements for acceptance.
 */
export default function LegalCentre() {
  const { code } = useParams()
  const doc = code ? legalDoc(code) : LEGAL_DOCS[0]
  if (code && !doc) return <Navigate to="/legal" replace />
  const d = doc!
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card print:hidden">
        <div className="mx-auto flex max-w-[72rem] items-center gap-3 px-4 py-3 md:px-8">
          <ProductMark showName={false} />
          <span className="text-[0.9375rem] font-semibold">ThryveMS legal</span>
          <Link to="/" className="ml-auto flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary">
            <ArrowLeftIcon className="size-4" /> Back to ThryveMS
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-[72rem] grid-cols-1 gap-8 px-4 py-8 md:grid-cols-[15rem_minmax(0,1fr)] md:px-8">
        <nav aria-label="Legal documents" className="print:hidden">
          <ul className="flex flex-col gap-0.5 md:sticky md:top-6">
            {LEGAL_DOCS.map((x) => (
              <li key={x.code}>
                <Link to={`/legal/${x.code}`} aria-current={x.code === d.code ? "page" : undefined} className={cn("block rounded-sm px-3 py-2 text-sm", x.code === d.code ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                  {x.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="min-w-0 rounded-md border bg-card px-5 py-6 md:px-10 md:py-8 print:border-0 print:p-0">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b pb-5">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[1.75rem] font-semibold leading-tight">{d.title}</h1>
              <span className="text-[0.8125rem] text-muted-foreground">
                Version {d.version}. Effective: {d.effective}.
              </span>
              {LEGAL_STATUS === "draft" && <Badge tone="soon" className="self-start">Draft for review</Badge>}
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
              <PrinterIcon /> Print or save as PDF
            </Button>
          </div>
          <Markdown source={d.body} skipTitle />
        </article>
      </div>
    </div>
  )
}
