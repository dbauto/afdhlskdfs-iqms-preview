import * as React from "react"
import { toast } from "sonner"
import type { Audit } from "@/data/types"
import type { AuditReference } from "@/data/audit-types"
import { useStore } from "@/lib/store"
import { auditRights } from "@/lib/audit-workflow"
import { formRights } from "@/lib/audit-form-policy"
import { auditLocked, latestAuditReport } from "@/lib/audit-report-policy"
import { formatDate } from "@/lib/periods"
import { AuditEvidenceEditor } from "@/components/app/audit-evidence"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"

/**
 * The auditors' findings paper: a document they write and attach to the audit as a link.
 * Checklist results stay on the checklist; nonconformity results raise corrective action there.
 */
export function FindingsPaperCard({ audit }: { audit: Audit }) {
  const { state, user, role, auditCommand } = useStore()
  const report = latestAuditReport(state, audit.id)
  const saved = report?.findingsPaper ?? []
  const [value, setValue] = React.useState<AuditReference[]>(saved)
  const [error, setError] = React.useState("")
  const [editing, setEditing] = React.useState(false)
  const savedKey = JSON.stringify(saved)
  React.useEffect(() => setValue(JSON.parse(savedKey)), [savedKey])
  const rights = auditRights(audit, user, role)
  const editable =
    !auditLocked(state, audit.id) &&
    report?.status !== "Issued" &&
    rights.assigned &&
    (rights.lead ||
      (["Add and edit", "Manage"].includes(role.access.Audits) &&
        state.auditChecklists.some((c) => c.auditId === audit.id && formRights(state, c, user, role).edit)))
  const dirty = JSON.stringify(value) !== savedKey
  const open = editable && (editing || !saved.length)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Findings paper</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          The audit team writes up its findings in one paper and links it here: a controlled document, an evidence record or
          a full https:// link. The lead can’t issue the report without it.
        </p>
        {error && <Alert tone="danger">{error}</Alert>}
        <AuditEvidenceEditor
          noun="findings paper"
          auditProcess={audit.process}
          value={value}
          readOnly={!open}
          onChange={setValue}
        />
        {open ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!dirty}
              onClick={() => {
                try {
                  auditCommand({ kind: "saveFindingsPaper", auditId: audit.id, references: value })
                  setError("")
                  setEditing(false)
                  toast("Findings paper saved")
                } catch (e) {
                  setError((e as Error).message)
                }
              }}
            >
              Save findings paper
            </Button>
            {!!saved.length && (
              <Button
                variant="ghost"
                onClick={() => {
                  setValue(saved)
                  setError("")
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          editable && (
            <Button variant="outline" className="self-start" onClick={() => setEditing(true)}>
              Change findings paper
            </Button>
          )
        )}
        {report?.findingsPaperBy && report.findingsPaperAt && (
          <p className="text-xs text-muted-foreground">
            Last saved by {report.findingsPaperBy} on {formatDate(report.findingsPaperAt.slice(0, 10))}
            {report.status === "Issued" ? ". Frozen with the issued report." : "."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
