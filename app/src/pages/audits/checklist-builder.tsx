import * as React from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/periods"
import { auditRights, latestChecklist } from "@/lib/audit-workflow"
import { nextId, useStore } from "@/lib/store"
import type { ChecklistSection } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ChecklistEditor } from "@/components/app/checklist-editor"
import { PageHeader } from "@/components/app/page"
import { Field } from "@/components/app/form"
import { formKey, formRights, formContentLocked, latestFormApproval } from "@/lib/audit-form-policy"
import { AuditFormSettingsSheet } from "./form-settings"
import { AuditFormApprovalPanel } from "./form-approval"
import NotFound from "@/pages/not-found"

export default function ChecklistBuilder() {
  const { id } = useParams(), [params] = useSearchParams()
  return <AuditChecklistBuilder key={`${id}:${params.get("version") ?? params.get("form") ?? "default"}`} id={id ?? ""} />
}

function AuditChecklistBuilder({ id }: { id: string }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { state, add, auditCommand, user, role, takenIds, can } = useStore()
  const audit = state.audits.find((a) => a.id === id)
  const selectedId = params.get("version")
  const requested = state.auditChecklists.find(c => c.auditId === id && c.id === selectedId)
  const latest = latestChecklist(state, id, false, requested ? formKey(requested) : params.get("form"))
  const stored = selectedId
    ? state.auditChecklists.find((c) => c.auditId === id && c.id === selectedId)
    : latest
  const draftId = React.useRef(nextId(takenIds("auditChecklists"), "ACL-", 4))
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [revision, setRevision] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [template, setTemplate] = React.useState(false)
  const [tplName, setTplName] = React.useState("")
  const blank: ChecklistSection[] = React.useMemo(
    () => [
      {
        id: "s0",
        clause: "Start",
        title: "Opening meeting",
        items: [
          {
            id: "q0",
            type: "Instruction",
            text: "Confirm the scope and timetable with the process owner.",
            askedBy: audit?.lead ?? "",
            required: false,
            evidence: [],
            guidance: "",
          },
        ],
      },
    ],
    [audit?.lead],
  )
  if (!audit || (selectedId && !stored) || (params.get("form") && !latest)) return <NotFound />
  const rights = auditRights(audit, user, role)
  if (!rights.assigned && !rights.manage) return <NotFound />
  const issued =
    audit.state === "Report issued" ||
    state.auditReports.some((r) => r.auditId === id && r.status === "Issued")
  const access = stored ? formRights(state, stored, user, role) : undefined
  if (stored && !access?.view) return <NotFound />
  const canRelease = rights.lead && !issued && (!stored || stored.status !== "Released" && !stored.withdrawnAt)
  const canEdit =
    (stored ? !!access?.edit && !formContentLocked(stored) : rights.edit) &&
    !issued &&
    stored?.status !== "Released" &&
    (!stored || stored.id === latest?.id)
  const editable = canEdit && params.get("mode") !== "view"
  const sections = stored?.sections ?? audit.templateSnapshot?.sections ?? blank
  const usesQuestionnaire =
    stored?.usesQuestionnaire ?? audit.usesQuestionnaire ?? false
  const count = sections
    .flatMap((s) => s.items)
    .filter((q) => q.type !== "Instruction").length
  const instructions = sections.flatMap((s) => s.items).length - count
  function save(next: ChecklistSection[], uses = usesQuestionnaire) {
    if (!editable) return
    try {
      auditCommand({
        kind: "saveChecklist",
        auditId: id,
        id: stored?.id ?? draftId.current,
        sections: stored?.kind === "Questionnaire" ? next.map(s => ({ ...s, items: s.items.map(q => stored.sections.some(old => old.items.some(x => x.id === q.id)) ? q : { ...q, assessmentRequired: false }) })) : next,
        usesQuestionnaire: uses,
      })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: `${audit.id} ${audit.process}`, to: `/audits/${audit.id}` },
          { label: "Checklist" },
        ]}
        title={stored?.formId && stored.formId !== `${audit.id}:checklist` ? stored.title ?? "Audit form" : `Checklist for the ${audit.process} audit`}
        description={`${count} questions and ${instructions} instruction${instructions === 1 ? "" : "s"} in ${sections.length} sections. Audit on ${audit.date}, lead ${audit.lead}. ${editable ? "Changes save automatically." : "Read-only checklist."}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/${id}`}>Back to audit</Link>
            </Button>
            {canEdit && !editable && (
              <Button
                onClick={() => setParams(stored ? { version: stored.id } : {})}
              >
                Edit draft
              </Button>
            )}
            {stored && access?.configure && !formContentLocked(stored) && <Button variant="outline" onClick={() => setSettingsOpen(true)}>Form settings</Button>}
            {editable && can("Audits", "Add and edit") && (
              <Button
                variant="outline"
                onClick={() => {
                  setTplName(`${audit.process}, ${new Date().getFullYear()}`)
                  setTemplate(true)
                }}
              >
                <CopyIcon /> Save as template
              </Button>
            )}
            {(editable || canRelease) && (
              <Button
                variant={canEdit && !editable ? "outline" : "default"}
                disabled={!rights.lead || (stored && latestFormApproval(stored, "Preparation")?.status === "Pending")}
                title={
                  !rights.lead
                    ? `Only ${audit.lead}, the lead auditor, can release this checklist`
                    : undefined
                }
                onClick={() => {
                  try {
                    auditCommand({
                      kind: "releaseChecklist",
                      auditId: id,
                      id: stored?.id ?? draftId.current,
                      sections,
                      usesQuestionnaire,
                    })
                  } catch (e) {
                    return toast.error((e as Error).message)
                  }
                  toast("Checklist marked ready", {
                    description: `${audit.lead} and the team can use it on the day.`,
                  })
                  navigate(`/audits/${id}`)
                }}
              >
                Mark checklist ready
              </Button>
            )}
            {stored?.status === "Released" &&
              latest?.id === stored.id &&
              rights.lead &&
              !issued && (
                <Button onClick={() => setRevision(true)}>
                  Start checklist revision
                </Button>
              )}
          </>
        }
      />
      {stored?.withdrawnAt && <Alert tone="warning">This form was withdrawn. {stored.withdrawalReason}</Alert>}
      <Alert tone="info">
        {stored?.status === "Released"
          ? `This released version is read-only. Only ${audit.lead}, the lead auditor, can start a checklist revision.`
          : "Build the auditor’s checks here. Edit questions and choices directly. Open each question’s settings with the ⋯ button. The lead marks it ready and assigns respondents from Questionnaires."}
      </Alert>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <span className="text-sm">
            Version {stored?.version ?? 1} · {stored?.status ?? "Unsaved draft"}
          </span>
          {stored?.releasedBy && (
            <span className="text-xs text-muted-foreground">
              Released by {stored.releasedBy} at{" "}
              {formatDate(stored.releasedAt?.slice(0, 10))}
            </span>
          )}
          <Field label="Checklist version" htmlFor="checklist-version">
            <NativeSelect
              id="checklist-version"
              value={stored?.id ?? ""}
              onChange={(e) =>
                setParams({
                  version: e.target.value,
                  ...(params.get("mode") === "view" ? { mode: "view" } : {}),
                })
              }
            >
              {!stored && <option value="">Unsaved draft</option>}
              {state.auditChecklists
                .filter((c) => c.auditId === id && (!stored || formKey(c) === formKey(stored)))
                .sort((a, b) => b.version - a.version)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Version {c.version} · {c.status}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <label className="flex min-h-8 items-center gap-2 text-sm">
            <Switch
              aria-label="Use pre-audit questionnaire"
              disabled={!editable}
              checked={usesQuestionnaire}
              onCheckedChange={(uses) => save(sections, uses)}
            />
            Use pre-audit questionnaire
          </label>
        </CardContent>
      </Card>
      <ChecklistEditor
        key={`${id}-${stored?.id ?? draftId.current}-${editable}`}
        sections={sections}
        onChange={save}
        editable={editable}
        clauses={audit.clauses}
        auditors={[audit.lead, ...audit.auditors].filter(name => !stored || state.people.some(p => p.name === name && (name === audit.lead || p.id === stored.ownerId || stored.members === undefined || stored.members.some(m => m.personId === p.id && m.access === "Edit"))))}
        defaultAuditor={audit.lead}
        usesQuestionnaire={usesQuestionnaire}
        idPrefix={stored?.id ?? draftId.current}
      />
      {stored && <AuditFormApprovalPanel key={stored.id} form={stored} />}
      {settingsOpen && stored && <AuditFormSettingsSheet audit={audit} form={stored} onClose={() => setSettingsOpen(false)} />}
      <Dialog open={template} onOpenChange={setTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Next time you plan an audit of this process, you can start from
              this checklist.
            </DialogDescription>
          </DialogHeader>
          <Field label="Template name" htmlFor="tpl-name">
            <Input
              id="tpl-name"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTemplate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  add("templates", {
                    id: nextId(takenIds("templates"), "CT-", 4),
                    name: tplName.trim() || audit.process,
                    process: audit.process,
                    questions: count,
                    sections: structuredClone(sections),
                    version: 1,
                    usesQuestionnaire,
                    owner: audit.lead,
                    updated: "Today",
                    used: 0,
                  })
                } catch (e) {
                  return toast.error((e as Error).message)
                }
                toast(`Saved “${tplName}” to checklist templates`)
                setTemplate(false)
              }}
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={revision} onOpenChange={setRevision}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start checklist revision</DialogTitle>
            <DialogDescription>
              Released versions and their responses stay unchanged. The new
              version starts as a revision draft.
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason" htmlFor="revision-reason">
            <Textarea
              id="revision-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevision(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  const next = nextId(takenIds("auditChecklists"), "ACL-", 4)
                  auditCommand({
                    kind: "reviseChecklist",
                    checklistId: stored?.id,
                    auditId: id,
                    id: next,
                    reason,
                  })
                  setParams({ version: next })
                } catch (e) {
                  return toast.error((e as Error).message)
                }
                setRevision(false)
                setReason("")
                toast("Revision draft created")
              }}
            >
              Create revision draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
