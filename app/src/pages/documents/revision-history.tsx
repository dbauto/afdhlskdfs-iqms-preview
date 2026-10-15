import * as React from "react"
import type { DocRecord, DocumentRevision } from "@/data/types"
import { useAuthorName } from "@/components/app/remarks"
import { useStore } from "@/lib/store"
import { documentRevisions, revisionVisible } from "@/lib/document-control"
import { formatDate } from "@/lib/periods"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyLine } from "@/components/app/page"
import { DataTable } from "@/components/app/data-table"
import { OutsideLink } from "@/components/app/record-link"

function status(r: DocumentRevision) {
  if (r.withdrawn) return "Withdrawn"
  if (r.effectivity === "Archived") return "Archived"
  if (r.stage === "Published")
    return r.effectivity === "Suspended"
      ? "Effectivity suspended"
      : r.effectivity === "Superseded"
        ? "Superseded"
        : "Published, in force"
  return r.stage === "Archived" ? "Archived" : `In ${r.stage.toLowerCase()}`
}
function tone(r: DocumentRevision): BadgeTone {
  return r.effectivity === "Suspended"
    ? "soon"
    : r.withdrawn ||
        r.effectivity === "Superseded" ||
        r.effectivity === "Archived" ||
        r.stage === "Archived"
      ? "draft"
      : r.stage === "Published"
        ? "done"
        : "progress"
}

export function RevisionHistory({ doc }: { doc: DocRecord }) {
  const authorName = useAuthorName()
  const { user, role } = useStore()
  const [open, setOpen] = React.useState(false)
  const versions = documentRevisions(doc).filter((r) =>
    revisionVisible(r, user, role),
  )
  const permitted = new Set(versions.map((r) => r.rev))
  const events = (doc.events ?? [])
    .filter((e) => permitted.has(e.revision))
    .slice()
    .reverse()
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Revisions</CardTitle>
        </CardHeader>
        <ul>
          {versions.slice(0, 2).map((r, i) => (
            <li
              key={`${r.rev}-${r.withdrawn}`}
              className={`flex min-w-0 items-start gap-3 px-5 py-3 ${i ? "border-t border-rule-soft" : ""}`}
            >
              <span className="w-8 shrink-0 text-sm font-semibold">
                {r.rev}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <Badge tone={tone(r)} className="self-start whitespace-normal">
                  {status(r)}
                </Badge>
                <span className="break-words text-xs text-muted-foreground">
                  {r.stage === "Published"
                    ? `Published on ${formatDate(r.publishedOn) || "No data"}`
                    : r.startedOn
                      ? `Started ${formatDate(r.startedOn.slice(0, 10))}`
                      : "Start date: No data"}
                </span>
                {r.changeNote && (
                  <span className="line-clamp-2 break-words text-xs text-muted-foreground">
                    {r.changeNote}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-rule-soft px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            aria-label="View more revision updates"
          >
            View more
          </Button>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="min-w-0 max-w-4xl">
          <DialogHeader>
            <DialogTitle>Revision history</DialogTitle>
            <DialogDescription>
              {doc.id}. Saved revisions and effectivity updates. Earlier dates
              are shown only when recorded.
            </DialogDescription>
          </DialogHeader>
          <DataTable
            label="Document revisions"
            rows={versions}
            getRowId={(r) => `${r.rev}-${r.withdrawn}`}
            minWidth={640}
            columns={[
              {
                id: "revision",
                header: "Revision",
                cell: (r) => <span className="font-semibold">{r.rev}</span>,
              },
              {
                id: "status",
                header: "Status",
                cell: (r) => (
                  <Badge tone={tone(r)} className="whitespace-normal">
                    {status(r)}
                  </Badge>
                ),
              },
              {
                id: "dates",
                header: "Dates",
                cell: (r) => (
                  <div className="flex flex-col gap-1 text-xs">
                    <span>
                      Started:{" "}
                      {formatDate(r.startedOn?.slice(0, 10)) || "No data"}
                    </span>
                    <span>
                      Approved: {formatDate(r.approvedOn) || "No data"}
                    </span>
                    <span>
                      Published on: {formatDate(r.publishedOn) || "No data"}
                    </span>
                  </div>
                ),
              },
              {
                id: "changes",
                header: "Updates",
                cell: (r) => (
                  <div className="flex max-w-sm flex-col gap-2 break-words text-sm">
                    <span>{r.changeNote || "No change note recorded."}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.startedBy
                        ? `Started by ${authorName(r.startedBy)}. `
                        : ""}
                      {r.publishedBy
                        ? `Published by ${authorName(r.publishedBy)}.`
                        : ""}
                    </span>
                    {r.scopeContent && (
                      <details>
                        <summary className="cursor-pointer text-primary">
                          Scope content
                        </summary>
                        <div className="mt-2 flex flex-col gap-2">
                          {Object.values(r.scopeContent).map((v, i) => (
                            <p key={i}>{v}</p>
                          ))}
                        </div>
                      </details>
                    )}
                    <OutsideLink url={r.link} label="Open document" />
                  </div>
                ),
              },
            ]}
          />
          {events.length ? (
            <DataTable
              label="Effectivity and revision updates"
              rows={events}
              getRowId={(e) => `${e.on}-${e.kind}-${e.revision}`}
              minWidth={580}
              empty={{
                title: "No further updates recorded",
                body: "Revision, publication and effectivity actions will appear here with their reason and date.",
              }}
              columns={[
                {
                  id: "date",
                  header: "Date",
                  cell: (e) => formatDate(e.on.slice(0, 10)),
                },
                { id: "revision", header: "Revision", cell: (e) => e.revision },
                {
                  id: "event",
                  header: "Update",
                  cell: (e) => (
                    <div className="flex max-w-sm flex-col gap-1 break-words">
                      <span>{e.kind}</span>
                      {e.reason && (
                        <span className="text-xs text-muted-foreground">
                          {e.reason}
                        </span>
                      )}
                    </div>
                  ),
                },
                { id: "by", header: "By", cell: (e) => authorName(e.by) },
              ]}
            />
          ) : (
            <EmptyLine
              title="No further updates recorded"
              body="Revision and effectivity actions appear here with their reason and date."
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
