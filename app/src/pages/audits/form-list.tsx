import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import type { Audit } from "@/data/types"
import type { AuditChecklist } from "@/data/audit-types"
import {
  auditForms,
  formKey,
  formRights,
  formTitle,
  formBuilderPath,
  formContentLocked,
  latestFormApproval,
} from "@/lib/audit-form-policy"
import { auditRights } from "@/lib/audit-workflow"
import { auditLocked } from "@/lib/audit-report-policy"
import { useStore } from "@/lib/store"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/app/data-table"
import { ConfirmRemove, RowActions } from "@/components/app/record-actions"
import { ViewChips } from "@/components/app/page"
import { AuditFormSettingsSheet } from "./form-settings"

export function AuditFormList({ audit }: { audit: Audit }) {
  const { state, user, role, auditCommand } = useStore(),
    rights = auditRights(audit, user, role)
  const [adding, setAdding] = React.useState<"Checklist" | "Questionnaire">(),
    [editing, setEditing] = React.useState<AuditChecklist>(),
    [removing, setRemoving] = React.useState<AuditChecklist>(),
    [reason, setReason] = React.useState(""),
    [view, setView] = React.useState("Active")
  const current = auditForms(state, audit.id)
  const active = state.auditChecklists
    .filter((c) => c.auditId === audit.id && !c.withdrawnAt)
    .sort(
      (a, b) => formKey(a).localeCompare(formKey(b)) || b.version - a.version,
    )
  const withdrawn = [
    ...new Map(
      state.auditChecklists
        .filter((c) => c.auditId === audit.id && c.withdrawnAt)
        .sort((a, b) => a.version - b.version)
        .map((c) => [formKey(c), c]),
    ).values(),
  ]
  const rows = view === "Active" ? active : withdrawn
  const issued = auditLocked(state, audit.id)
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Checklists and questionnaires</CardTitle>
          {rights.edit && (rights.lead || ["Add and edit", "Manage"].includes(role.access.Audits)) && !issued && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdding("Checklist")}
              >
                Add checklist
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdding("Questionnaire")}
              >
                Add questionnaire
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Each form has its own collaborators, versions, responses and review
            route.
          </p>
          <ViewChips
            value={view}
            onChange={setView}
            views={["Active", "Withdrawn"].map((id) => ({ id, label: id }))}
          />
          <DataTable
            label="Saved audit forms"
            rows={rows}
            getRowId={(c) => c.id}
            minWidth={900}
            empty={{
              title:
                view === "Active" ? "No saved forms yet" : "No withdrawn forms",
              body: "Add a checklist for auditor checks or a questionnaire for auditee answers.",
            }}
            columns={[
              {
                id: "title",
                header: "Form",
                cell: (c) => (
                  <span className="flex flex-col gap-1">
                    <span>{formTitle(c)}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.kind ?? "Checklist"} · {formKey(c)}
                    </span>
                  </span>
                ),
              },
              { id: "version", header: "Version", cell: (c) => c.version },
              {
                id: "status",
                header: "Status",
                cell: (c) => (
                  <Badge
                    tone={
                      c.completedAt
                        ? "done"
                        : c.status === "Released"
                          ? "progress"
                          : "draft"
                    }
                  >
                    {c.withdrawnAt
                      ? "Withdrawn"
                      : c.completedAt
                        ? "Completed"
                        : latestFormApproval(c, "Completion")?.status ===
                            "Pending"
                          ? "Completion approval"
                          : latestFormApproval(c, "Preparation")?.status ===
                              "Pending"
                            ? "Preparation approval"
                            : c.status === "Released" ? "Ready" : c.status}
                  </Badge>
                ),
              },
              {
                id: "owner",
                header: "Owner",
                cell: (c) =>
                  state.people.find((p) => p.id === c.ownerId)?.name ??
                  audit.lead,
              },
              {
                id: "responses",
                header: "Responses",
                cell: (c) => {
                  const all = state.questionnaireAssignments.filter(
                    (a) => a.checklistId === c.id,
                  )
                  return all.length
                    ? `${all.filter((a) => ["Submitted", "Resubmitted"].includes(a.status)).length} of ${all.length} submitted`
                    : "None assigned"
                },
              },
              {
                id: "actions",
                header: "Actions",
                cell: (c) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`${formBuilderPath(c)}&mode=view`}>
                        {c.kind === "Questionnaire"
                          ? "Open questionnaire"
                          : "Open checklist"}
                      </Link>
                    </Button>
                    {!issued &&
                      !formContentLocked(c) &&
                      (formRights(state, c, user, role).edit || rights.manage) &&
                      current.some((x) => x.id === c.id) && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={formBuilderPath(c)}>
                            {c.kind === "Questionnaire"
                              ? "Edit questions"
                              : "Edit draft"}
                          </Link>
                        </Button>
                      )}
                    {c.status === "Released" && !c.withdrawnAt && (
                      <Button variant="quiet" size="sm" asChild>
                        <Link
                          to={`/audits/${audit.id}/results?form=${c.id}`}
                        >
                          Responses and assessments
                        </Link>
                      </Button>
                    )}
                    {!issued && rights.lead && c.status !== "Released" && !c.withdrawnAt && current.some(x => x.id === c.id) && <Button variant="outline" size="sm" onClick={() => {
                      try { auditCommand({ kind: "releaseChecklist", auditId: audit.id, id: c.id, sections: c.sections, usesQuestionnaire: c.usesQuestionnaire }); toast("Form marked ready") }
                      catch(e) { toast.error((e as Error).message) }
                    }}>Mark ready</Button>}
                    {!issued &&
                      !c.withdrawnAt &&
                      formRights(state, c, user, role).configure &&
                      current.some((x) => x.id === c.id) && (
                        <RowActions
                          name={formTitle(c)}
                          onEdit={
                            !formContentLocked(c)
                              ? () => setEditing(c)
                              : undefined
                          }
                          removeKind="withdraw"
                          onRemove={() => {
                            setRemoving(c)
                            setReason("")
                          }}
                        />
                      )}
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
      {(adding || editing) && (
        <AuditFormSettingsSheet
          key={editing?.id ?? adding}
          audit={audit}
          form={editing}
          kind={adding}
          onClose={() => {
            setAdding(undefined)
            setEditing(undefined)
          }}
        />
      )}
      <ConfirmRemove
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(undefined)}
        kind="withdraw"
        name={removing ? formTitle(removing) : "form"}
        reason={reason}
        onReasonChange={setReason}
        onConfirm={() => {
          try {
            auditCommand({
              kind: "withdrawAuditForm",
              auditId: audit.id,
              checklistId: removing!.id,
              reason,
            })
            return true
          } catch (e) {
            toast.error((e as Error).message)
            return false
          }
        }}
      />
    </>
  )
}
