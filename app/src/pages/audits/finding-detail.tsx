import { Link, useParams } from "react-router-dom"
import { useStore } from "@/lib/store"
import { PageHeader, KeyFacts } from "@/components/app/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecordLink } from "@/components/app/record-link"
import { AuditReferenceLink } from "@/components/app/audit-evidence"
import { formatDate } from "@/lib/periods"
import NotFound from "@/pages/not-found"
export default function AuditFindingDetail() {
  const { id } = useParams(),
    { state } = useStore(),
    f = state.auditFindings.find((f) => f.id === id)
  if (!f) return <NotFound />
  return (
    <>
      <PageHeader
        title={f.title}
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: f.auditId, to: `/audits/${f.auditId}` },
        ]}
        description={`${f.id} · ${f.classification} · ${f.status}`}
      />
      <Card>
        <CardContent className="py-4">
          <KeyFacts
            facts={[
              { k: "Audit", v: <RecordLink kind="audit" id={f.auditId} /> },
              {
                k: "Question",
                v: (
                  <Link className="text-primary" to={`/audits/${f.auditId}/conduct?question=${f.questionId}`}>
                    {f.questionId}
                  </Link>
                ),
              },
              { k: "Auditor", v: f.auditor },
              { k: "Process", v: f.process },
              { k: "Clause", v: f.clause },
              { k: "Checklist version", v: String(f.version) },
              { k: "Owner", v: f.owner },
              { k: "Raised", v: formatDate(f.at.slice(0, 10)) },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Requirement and facts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="whitespace-pre-wrap">{f.requirement}</p>
          <p className="whitespace-pre-wrap">{f.facts}</p>
          {f.evidence.map((r, i) => (
            <AuditReferenceLink key={i} reference={r} />
          ))}
          {f.ncId && <RecordLink kind="nonconformity" id={f.ncId} />}
        </CardContent>
      </Card>
    </>
  )
}
