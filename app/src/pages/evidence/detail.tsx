import * as React from "react"
import { useParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { FileTextIcon, LinkIcon, PencilIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/periods"
import { kindOfId, RECORD_KIND_LABEL } from "@/lib/record-links"
import { formatClauses } from "@/data/iso"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyFacts, MetaLine, PageHeader, RecordLayout } from "@/components/app/page"
import { ClassificationTag } from "@/components/app/status"
import { OutsideLink, RecordLink } from "@/components/app/record-link"
import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import { fileSummary } from "@/components/app/linked-evidence"
import NotFound from "@/pages/not-found"
import { EvidenceSheet } from "./evidence-sheet"

/** One evidence item: its files and links, clauses, processes and the records it's used on. */
export default function EvidenceDetail() {
  const { id } = useParams()
  const { state, can, canSee } = useStore()
  const e = state.evidence.find((x) => x.id === id)
  const [edit, setEdit] = React.useState(false)
  // state is already narrowed to the processes this person may see; classification is checked here
  if (!e || !can("Evidence") || !canSee(e.classification, [], e.addedBy)) return <NotFound />
  const canEdit = can("Evidence", "Add and edit")
  const objectives = state.objectives.filter((o) => o.evidence?.includes(e.id) || o.results?.some((r) => r.evidence?.includes(e.id)))

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Evidence", to: "/evidence" }, { label: e.id }]}
        title={e.title}
        meta={<MetaLine parts={[e.id, e.kind, fileSummary(e), <ClassificationTag key="c" value={e.classification} />]} />}
        actions={
          canEdit && (
            <Button variant="outline" onClick={() => setEdit(true)}>
              <PencilIcon /> Edit
            </Button>
          )
        }
      />
      <RemarkBanner kind="Evidence" id={e.id} />
      <RecordLayout
        main={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Files and links</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">Kept in your SharePoint. ThryveMS keeps the links.</span>
              </CardHeader>
              <ul>
                {(e.files ?? []).length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No files or links.</li>}
                {(e.files ?? []).map((f, i) => (
                  <li key={f.name + i} className={cn("flex flex-wrap items-center gap-3 px-5 py-3 text-sm", i > 0 && "border-t border-rule-soft")}>
                    {f.kind === "Link" ? <LinkIcon className="size-4 shrink-0 text-muted-foreground" /> : <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 break-words">{f.name}</span>
                    {f.url?.startsWith("/") ? (
                      <Link to={f.url} className="text-[0.8125rem] font-medium text-primary hover:underline">
                        Open in ThryveMS
                      </Link>
                    ) : (
                      <OutsideLink url={f.url} label={f.name} className="text-[0.8125rem]" />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Used on</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">The same item can back several records</span>
              </CardHeader>
              <ul>
                {(e.usedIn ?? []).length === 0 && objectives.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">Not linked to any record yet.</li>}
                {(e.usedIn ?? []).map((rid, i) => (
                  <li key={rid} className={cn("flex items-center justify-between gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    <RecordLink kind={kindOfId(rid)} id={rid} className="text-[0.8125rem]" />
                    <span className="text-xs text-muted-foreground">{RECORD_KIND_LABEL[kindOfId(rid)]}</span>
                  </li>
                ))}
                {objectives.map((o, i) => (
                  <li key={o.id} className={cn("flex items-center justify-between gap-3 px-5 py-3", (i > 0 || (e.usedIn ?? []).length > 0) && "border-t border-rule-soft")}>
                    <span className="flex min-w-0 flex-col">
                      <RecordLink kind="objective" id={o.id} className="self-start text-[0.8125rem]" />
                      <span className="text-sm">{o.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">Objective</span>
                  </li>
                ))}
              </ul>
            </Card>
            <RemarksPanel target={{ kind: "Evidence", id: e.id, label: `${e.id} ${e.title}`, to: `/evidence/${e.id}`, area: "Evidence" }} />
          </>
        }
        side={
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "Clauses", v: formatClauses(e.clauses) || "None" },
                  { k: "Processes", v: e.processes.length ? e.processes.join(", ") : "Company-wide" },
                  { k: "Added", v: `${e.addedDate ? formatDate(e.addedDate) : e.added}, by ${e.addedBy}` },
                  { k: "Classification", v: <ClassificationTag value={e.classification} /> },
                ]}
              />
            </CardContent>
          </Card>
        }
      />
      <EvidenceSheet open={edit} item={e} onOpenChange={setEdit} />
    </>
  )
}
