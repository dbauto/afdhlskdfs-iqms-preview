import * as React from "react";
import { toast } from "sonner";
import type { AuditChecklist } from "@/data/audit-types";
import { useStore } from "@/lib/store";
import {
  formRights,
  formCompletionProblems,
  latestFormApproval,
  nextFormApprovers,
  NO_FORM_ROUTE,
} from "@/lib/audit-form-policy";
import { formatDate } from "@/lib/periods";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/app/form";
import { DataTable } from "@/components/app/data-table";

export function AuditFormApprovalPanel({ form }: { form: AuditChecklist }) {
  const { state, user, role, auditCommand } = useStore(),
    access = formRights(state, form, user, role);
  const draftKey = `thryvems.form-review:${user.id}:${form.id}`;
  const [comment, setComment] = React.useState(
      () => sessionStorage.getItem(draftKey) ?? "",
    ),
    [error, setError] = React.useState(""),
    [saving, setSaving] = React.useState(false),
    busy = React.useRef(false);
  React.useEffect(() => {
    if (comment) sessionStorage.setItem(draftKey, comment);
    else sessionStorage.removeItem(draftKey);
  }, [comment, draftKey]);
  const act = (fn: () => void, message: string) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      fn();
      setComment("");
      setError("");
      toast(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  if (!access.view) return null;
  const historical =
    form.withdrawnAt ||
    state.auditChecklists.some(
      (c) =>
        (c.formId ?? `${c.auditId}:checklist`) ===
          (form.formId ?? `${form.auditId}:checklist`) &&
        c.version > form.version,
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review and completion</CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        {error && <Alert tone="danger">{error}</Alert>}
        {comment && (
          <p className="text-sm text-muted-foreground">
            Review comment saved in this tab until you submit it or clear it.
          </p>
        )}
        {form.completedAt && (
          <Alert tone="info">
            Completed on {formatDate(form.completedAt.slice(0, 10))}. Responses
            and assessments are read-only.
          </Alert>
        )}
        {(["Preparation", "Completion"] as const).map((phase) => {
          const cycle = latestFormApproval(form, phase),
            route =
              (phase === "Preparation"
                ? form.preparationRoute
                : form.completionRoute) ?? NO_FORM_ROUTE;
          const requestable =
            phase === "Preparation"
              ? form.status !== "Released"
              : form.status === "Released" && !form.completedAt;
          const pending = cycle && nextFormApprovers(cycle).includes(user.id);
          const problems =
            phase === "Completion" && requestable
              ? formCompletionProblems(state, form)
              : [];
          return (
            <section
              key={phase}
              className="flex min-w-0 flex-col gap-3 border-t border-rule-soft pt-3 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {phase === "Preparation" ? "Before use" : "After completion"}
                </span>
                <Badge
                  tone={
                    cycle?.status === "Approved"
                      ? "done"
                      : cycle?.status === "Pending"
                        ? "progress"
                        : "draft"
                  }
                >
                  {cycle?.status ??
                    (route.mode === "None"
                      ? "No approval required"
                      : "Not submitted")}
                </Badge>
              </div>
              {route.mode !== "None" && (
                <p className="text-sm text-muted-foreground">
                  {route.mode === "Sequential"
                    ? "Approve in order"
                    : route.mode === "All"
                      ? "Everyone approves"
                      : "Anyone approves"}
                  :{" "}
                  {route.approverIds
                    .map(
                      (id) =>
                        state.people.find((p) => p.id === id)?.name ??
                        "Not available",
                    )
                    .join(" → ")}
                </p>
              )}
              {!historical &&
                requestable &&
                access.configure &&
                cycle?.status !== "Pending" &&
                cycle?.status !== "Approved" && (
                  <>
                    {problems.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {problems.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    )}
                    {route.mode !== "None" ? (
                      <Button
                        className="self-start"
                        variant="outline"
                        disabled={saving || !!problems.length}
                        onClick={() =>
                          act(
                            () =>
                              auditCommand({
                                kind: "requestFormApproval",
                                auditId: form.auditId,
                                checklistId: form.id,
                                phase,
                              }),
                            "Approval requested",
                          )
                        }
                      >
                        Submit{" "}
                        {phase === "Preparation"
                          ? "for preparation approval"
                          : "completed form for approval"}
                      </Button>
                    ) : (
                      phase === "Completion" && (
                        <Button
                          className="self-start"
                          variant="outline"
                          disabled={saving || !!problems.length}
                          onClick={() =>
                            act(
                              () =>
                                auditCommand({
                                  kind: "completeAuditForm",
                                  auditId: form.auditId,
                                  checklistId: form.id,
                                }),
                              "Form completed",
                            )
                          }
                        >
                          Complete form
                        </Button>
                      )
                    )}
                  </>
                )}
              {!historical &&
                access.configure &&
                (cycle?.status === "Pending" ||
                  cycle?.status === "Approved" ||
                  (phase === "Completion" && !!form.completedAt)) &&
                !(phase === "Preparation" && form.status === "Released") && (
                  <>
                    <Field
                      label={`Reason to reopen ${phase.toLowerCase()}`}
                      htmlFor={`reopen-${phase}`}
                    >
                      <Textarea
                        id={`reopen-${phase}`}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </Field>
                    <Button
                      className="self-start"
                      variant="outline"
                      disabled={saving || !comment.trim()}
                      onClick={() =>
                        act(
                          () =>
                            auditCommand({
                              kind: "reopenAuditForm",
                              auditId: form.auditId,
                              checklistId: form.id,
                              phase,
                              reason: comment,
                            }),
                          "Form reopened for changes",
                        )
                      }
                    >
                      Reopen {phase.toLowerCase()} for changes
                    </Button>
                  </>
                )}
              {!historical && pending && (
                <>
                  <Field
                    label={`${phase} review comment`}
                    htmlFor={`approval-comment-${phase}`}
                  >
                    <Textarea
                      id={`approval-comment-${phase}`}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {(["Approved", "Changes requested"] as const).map(
                      (decision) => (
                        <Button
                          key={decision}
                          variant="outline"
                          disabled={saving}
                          onClick={() =>
                            act(
                              () =>
                                auditCommand({
                                  kind: "decideFormApproval",
                                  auditId: form.auditId,
                                  checklistId: form.id,
                                  cycleId: cycle!.id,
                                  decision,
                                  comment,
                                }),
                              decision === "Approved"
                                ? "Approval recorded"
                                : "Form returned for changes",
                            )
                          }
                        >
                          {decision === "Approved"
                            ? `Approve ${phase.toLowerCase()}`
                            : "Return for changes"}
                        </Button>
                      ),
                    )}
                  </div>
                </>
              )}
            </section>
          );
        })}
        <DataTable
          label="Form approval history"
          minWidth={620}
          rows={(form.approvals ?? []).flatMap((c) =>
            c.decisions.length
              ? c.decisions.map((d) => ({
                  ...d,
                  id: `${c.id}:${d.personId}`,
                  cycle: c.id,
                  phase: c.phase,
                  result: c.status,
                }))
              : [
                  {
                    personId: c.requestedBy,
                    decision: c.status,
                    comment: c.reason ?? "None recorded",
                    at: c.requestedAt,
                    id: c.id,
                    cycle: c.id,
                    phase: c.phase,
                    result: c.status,
                  },
                ],
          )}
          getRowId={(r) => r.id}
          empty={{
            title: "No approval decisions recorded",
            body: "Configured reviewers’ decisions and comments appear here after review.",
          }}
          columns={[
            {
              id: "phase",
              header: "Stage",
              cell: (r) => `${r.phase} · ${r.cycle}`,
            },
            {
              id: "person",
              header: "Reviewer",
              cell: (r) =>
                state.people.find((p) => p.id === r.personId)?.name ??
                "Not available",
            },
            { id: "decision", header: "Decision", cell: (r) => r.decision },
            {
              id: "comment",
              header: "Comment",
              cell: (r) => r.comment || "None recorded",
            },
            {
              id: "date",
              header: "Date",
              cell: (r) => formatDate(r.at.slice(0, 10)),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
