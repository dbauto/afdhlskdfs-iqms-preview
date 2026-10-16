import { useParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"

import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/periods"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyFacts, MetaLine, PageHeader } from "@/components/app/page"
import { RecordLink } from "@/components/app/record-link"
import NotFound from "@/pages/not-found"

/** Risk and opportunity IDs mentioned in a sentence, such as "Single-source risk, R-031". */
const riskIds = (text: string) => [...new Set(text.match(/\b[RO]-\d{3}\b/g) ?? [])]

/** One context issue or interested party (clause 4.1, 4.2). Edited on the Organization & Scope tabs. */
export default function ContextRecord({ kind }: { kind: "issue" | "party" }) {
  const { id } = useParams()
  const { state, can } = useStore()
  if (!can("Organization & Scope")) return <NotFound />
  const tab = kind === "issue" ? "context" : "parties"
  const back = { label: "Organization & Scope", to: `/qms/organization?tab=${tab}` }
  const edit = can("Organization & Scope", "Add and edit") && (
    <Button variant="outline" asChild>
      <Link to={back.to}>Edit on Organization & Scope</Link>
    </Button>
  )
  const changed = (d?: string) => (d ? formatDate(d) : "Not recorded")

  if (kind === "issue") {
    const i = state.issues.find((x) => x.id === id)
    if (!i) return <NotFound />
    const risks = riskIds(i.effect).filter((r) => state.risks.some((x) => x.id === r))
    return (
      <>
        <PageHeader breadcrumbs={[back, { label: "Context issue" }]} title={i.issue} badge={<Badge tone="draft">{i.kind}</Badge>} meta={<MetaLine parts={[`${i.kind} issue`, "Clause 4.1"]} />} actions={edit} />
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <KeyFacts
              facts={[
                { k: "Effect on the QMS", v: i.effect },
                { k: "Linked risks", v: risks.length ? <span className="flex flex-wrap gap-x-3">{risks.map((r) => <RecordLink key={r} kind="risk" id={r} />)}</span> : "None" },
                { k: "Last changed", v: changed(i.changedDate) },
              ]}
            />
          </CardContent>
        </Card>
      </>
    )
  }

  const p = state.parties.find((x) => x.id === id)
  if (!p) return <NotFound />
  return (
    <>
      <PageHeader breadcrumbs={[back, { label: "Interested party" }]} title={p.name} badge={p.reviewDue ? <Badge tone="soon">Review due</Badge> : undefined} meta={<MetaLine parts={["Interested party", "Clause 4.2"]} />} actions={edit} />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="py-1">
          <KeyFacts
            facts={[
              { k: "Needs and expectations", v: p.needs },
              { k: "How we monitor them", v: p.howMonitored },
              { k: "Last changed", v: changed(p.changedDate) },
            ]}
          />
        </CardContent>
      </Card>
    </>
  )
}
