import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import type { AuditChecklist } from "@/data/audit-types"
import { nextId, useStore } from "@/lib/store"
import { questionsOf } from "@/lib/audit-workflow"
import { addDays, todayIso, formatDate } from "@/lib/periods"
import { Field } from "@/components/app/form"
import { ScrollList } from "@/components/app/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { toast } from "sonner"

export function LinkInvitationForm({ auditId, checklist }: { auditId: string; checklist: AuditChecklist }) {
  const { state, auditCommand, takenIds } = useStore()
  const [mode, setMode] = React.useState("Invitation"),
    [name, setName] = React.useState(""),
    [email, setEmail] = React.useState(""),
    [department, setDepartment] = React.useState(""),
    [due, setDue] = React.useState(addDays(todayIso(), 7))
  const qs = questionsOf(checklist).filter((q) => q.respondBy !== "Auditor" && q.type !== "Instruction")
  const [selected, setSelected] = React.useState<string[]>(qs.map((q) => q.id)),
    [saving, setSaving] = React.useState(false),
    [error, setError] = React.useState("")
  const invitations = state.questionnaireInvitations.filter((i) => i.auditId === auditId)
  const dirty = !!(name || email || department)
  React.useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    const leave = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]")
      if (link && link.getAttribute("target") !== "_blank" && !window.confirm("The respondent details aren’t saved. Leave without preparing the invitation?")) {
        event.preventDefault(); event.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", warn)
    document.addEventListener("click", leave, true)
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", leave, true) }
  }, [dirty])
  function prepare() {
    if (saving) return
    setSaving(true)
    try {
      auditCommand({
        kind: "prepareRespondentInvitation",
        auditId,
        id: nextId(takenIds("questionnaireInvitations"), "AQI-", 4),
        assignmentId: nextId(takenIds("questionnaireAssignments"), "AQA-", 4),
        checklistId: checklist.id,
        name,
        email,
        department,
        dueDate: due,
        questionIds: selected,
        interview: mode === "Interview",
      })
      setName("")
      setEmail("")
      setDepartment("")
      setError("")
      toast(mode === "Interview" ? "Interview questionnaire prepared" : "Respondent invitation prepared")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Respondents without workspace accounts</CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <Alert tone="warning">
          Preview only. Use synthetic details. Invitations work only with this browser’s sample data. No email is sent and email
          identity is unverified.
        </Alert>
        <Field label="Response method" htmlFor="invite-mode">
          <NativeSelect id="invite-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="Invitation">Questionnaire-only invitation</option>
            <option value="Interview">Interview recorded by auditor</option>
          </NativeSelect>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Respondent name" htmlFor="invite-name">
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Respondent email" htmlFor="invite-email" optional={mode === "Interview"}>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Department or position" htmlFor="invite-department" optional>
            <Input id="invite-department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </Field>
          <Field label="Invitation deadline" htmlFor="invite-due">
            <Input id="invite-due" type="date" value={due} min={todayIso()} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Questions for this respondent</legend>
          {qs.map((q) => (
            <label key={q.id} className="flex min-h-8 items-center gap-3 text-sm">
              <Checkbox
                checked={selected.includes(q.id)}
                onCheckedChange={(v) => setSelected(v === true ? [...selected, q.id] : selected.filter((id) => id !== q.id))}
              />
              {q.text}
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-overdue">
            {error}
          </p>
        )}
        <Button variant="outline" className="self-start" disabled={saving || !name.trim() || !selected.length} onClick={prepare}>
          {mode === "Interview" ? "Prepare interview questionnaire" : "Prepare respondent invitation"}
        </Button>
        <ScrollList label="Respondent invitations" count={invitations.length}>
          {invitations.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft py-3 text-sm">
              <div className="min-w-0">
                <p className="break-words font-medium">{i.name}</p>
                <p className="break-all text-xs text-muted-foreground">
                  {i.email} · due {formatDate(i.expiresOn)}
                </p>
                <Badge tone={i.status === "Revoked" ? "draft" : "progress"}>
                  {i.status === "Revoked" ? "Revoked" : i.expiresOn < todayIso() ? "Expired" : i.identity}
                </Badge>
              </div>
              {i.status === "Active" && i.expiresOn >= todayIso() && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={
                        i.identity === "Interview recorded by auditor"
                          ? `/audits/${auditId}/questionnaires/${i.assignmentId}`
                          : `/respond-preview/${i.id}`
                      }
                    >
                      {i.identity === "Interview recorded by auditor" ? "Record interview answers" : "Open respondent preview"}
                    </Link>
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => {
                      auditCommand({ kind: "revokeRespondentInvitation", auditId, invitationId: i.id })
                      toast("Respondent invitation revoked")
                    }}
                  >
                    Revoke invitation
                  </Button>
                </div>
              )}
            </div>
          ))}
        </ScrollList>
      </CardContent>
    </Card>
  )
}
