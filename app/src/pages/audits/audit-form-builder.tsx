import * as React from "react"
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/periods"
import { auditRights, latestChecklist } from "@/lib/audit-workflow"
import { auditLocked } from "@/lib/audit-report-policy"
import { nextId, useStore } from "@/lib/store"
import { useDraftClose } from "@/lib/use-draft-close"
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
import {
  auditForms,
  formBuilderPath,
  formKey,
  formRights,
  formContentLocked,
  latestFormApproval,
} from "@/lib/audit-form-policy"
import { AuditFormSettingsSheet } from "./form-settings"
import { AuditFormApprovalPanel } from "./form-approval"
import NotFound from "@/pages/not-found"

export function AuditFormBuilder({
  kind,
}: {
  kind: "Checklist" | "Questionnaire"
}) {
  const { id } = useParams(),
    [params] = useSearchParams()
  return (
    <AuditFormWorkspace
      key={`${kind}:${id}:${params.get("version") ?? params.get("form") ?? "default"}`}
      id={id ?? ""}
      kind={kind}
    />
  )
}

function AuditFormWorkspace({
  id,
  kind,
}: {
  id: string
  kind: "Checklist" | "Questionnaire"
}) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { state, add, auditCommand, user, role, takenIds, can } = useStore()
  const audit = state.audits.find((a) => a.id === id)
  const selectedId = params.get("version")
  const requested = state.auditChecklists.find(
    (c) => c.auditId === id && c.id === selectedId,
  )
  const questionnaire = kind === "Questionnaire"
  const label = questionnaire ? "questionnaire" : "checklist"
  const latest =
    requested || params.get("form")
      ? latestChecklist(
          state,
          id,
          false,
          requested ? formKey(requested) : params.get("form"),
        )
      : auditForms(state, id).find((c) => (c.kind ?? "Checklist") === kind)
  const stored = selectedId
    ? state.auditChecklists.find((c) => c.auditId === id && c.id === selectedId)
    : latest
  const draftId = React.useRef(nextId(takenIds("auditChecklists"), "ACL-", 4))
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [revision, setRevision] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [takeover, setTakeover] = React.useState(false)
  const [takeoverReason, setTakeoverReason] = React.useState("")
  const [takeoverError, setTakeoverError] = React.useState("")
  const revisionClose = useDraftClose(!!reason.trim(), () => setRevision(false))
  const takeoverClose = useDraftClose(!!takeoverReason.trim(), () => setTakeover(false))
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
  if (!audit || (selectedId && !stored) || (params.get("form") && !latest))
    return <NotFound />
  const rights = auditRights(audit, user, role)
  if (!rights.assigned && !rights.manage) return <NotFound />
  const issued = auditLocked(state, id)
  const access = stored ? formRights(state, stored, user, role) : undefined
  if (stored && !access?.view) return <NotFound />
  if (stored && (stored.kind ?? "Checklist") !== kind)
    return (
      <Navigate
        replace
        to={`${formBuilderPath(stored)}${params.get("mode") === "view" ? "&mode=view" : ""}`}
      />
    )
  if (questionnaire && !stored)
    return (
      <>
        <PageHeader
          title="Questionnaire builder"
          breadcrumbs={[
            { label: "Audits", to: "/audits" },
            { label: audit.id, to: `/audits/${id}` },
            { label: "Questionnaire builder" },
          ]}
          description="Create a questionnaire for auditees to answer."
          actions={
            <Button variant="outline" asChild>
              <Link to={`/audits/${id}`}>Back to audit</Link>
            </Button>
          }
        />
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-5">
            <p className="text-sm">
              No questionnaire has been created for this audit yet.
            </p>
            {rights.edit && (rights.lead || ["Add and edit", "Manage"].includes(role.access.Audits)) && !issued && (
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                Add questionnaire
              </Button>
            )}
          </CardContent>
        </Card>
        {settingsOpen && (
          <AuditFormSettingsSheet
            audit={audit}
            kind="Questionnaire"
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </>
    )
  const canRelease =
    rights.lead &&
    !issued &&
    (!stored || (stored.status !== "Released" && !stored.withdrawnAt))
  const canEdit =
    (stored ? !!access?.edit && !formContentLocked(stored) : rights.edit) &&
    !issued &&
    stored?.status !== "Released" &&
    (!stored || stored.id === latest?.id)
  const editable = canEdit && params.get("mode") !== "view"
  const sections = stored?.sections ?? audit.templateSnapshot?.sections ?? blank
  const usesQuestionnaire =
    questionnaire ||
    (stored?.usesQuestionnaire ?? audit.usesQuestionnaire ?? false)
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
        sections: questionnaire
          ? next.map((s) => ({
              ...s,
              items: s.items.map((q) => ({
                ...q,
                respondBy: "Auditee",
                auditeeRequired: q.type !== "Instruction" && q.required,
                assessmentRequired: q.assessmentRequired ?? false,
              })),
            }))
          : next,
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
          { label: questionnaire ? "Questionnaire builder" : "Checklist" },
        ]}
        title={
          questionnaire
            ? "Questionnaire builder"
            : stored?.formId && stored.formId !== `${audit.id}:checklist`
              ? (stored.title ?? "Audit form")
              : `Checklist for the ${audit.process} audit`
        }
        description={`${questionnaire ? `${stored?.title ?? "Audit questionnaire"}. ` : ""}${count} question${count === 1 ? "" : "s"} and ${instructions} instruction${instructions === 1 ? "" : "s"} in ${sections.length} section${sections.length === 1 ? "" : "s"}. Audit on ${audit.date}, lead ${audit.lead}. ${editable ? "Changes save automatically." : `Read-only ${label}.`}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/${id}`}>Back to audit</Link>
            </Button>
            {canEdit && !editable && (
              <Button
                onClick={() => setParams(stored ? { version: stored.id } : {})}
              >
                {questionnaire ? "Edit questions" : "Edit draft"}
              </Button>
            )}
            {stored && !canEdit && !issued && !formContentLocked(stored) && rights.manage && ["Add and edit", "Manage"].includes(role.access.Audits) && stored.id === latest?.id && (
              <Button onClick={() => setTakeover(true)}>Edit questions</Button>
            )}
            {stored && access?.configure && !formContentLocked(stored) && (
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                Form settings
              </Button>
            )}
            {editable && !questionnaire && can("Audits", "Add and edit") && (
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
            {(canEdit || canRelease) && (
              <Button
                variant={canEdit && !editable ? "outline" : "default"}
                disabled={
                  !rights.lead ||
                  (stored &&
                    latestFormApproval(stored, "Preparation")?.status ===
                      "Pending")
                }
                title={
                  !rights.lead
                    ? `Only ${audit.lead}, the lead auditor, can release this ${label}`
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
                  toast(
                    questionnaire
                      ? "Questionnaire marked ready"
                      : "Checklist marked ready",
                    {
                      description: `${audit.lead} and the team can use it on the day.`,
                    },
                  )
                  navigate(
                    questionnaire && stored
                      ? `/audits/${id}/questionnaires?form=${formKey(stored)}`
                      : `/audits/${id}`,
                  )
                }}
              >
                {questionnaire
                  ? "Mark questionnaire ready"
                  : "Mark checklist ready"}
              </Button>
            )}
            {stored && !rights.lead && access?.edit && !issued && stored.status !== "Released" && (
              <Button variant="outline" disabled={!!stored.readyRequestedAt} onClick={() => {
                try { auditCommand({ kind: "requestFormRelease", auditId: id, checklistId: stored.id }); toast("The lead was asked to mark this form ready") }
                catch(e) { toast.error((e as Error).message) }
              }}>{stored.readyRequestedAt ? `Waiting for ${audit.lead}` : "Ask lead to mark ready"}</Button>
            )}
            {stored?.status === "Released" &&
              latest?.id === stored.id &&
              rights.lead &&
              !issued && (
                <Button onClick={() => { setReason(stored.revisionRequested?.reason ?? ""); setRevision(true) }}>
                  Start {label} revision
                </Button>
              )}
            {stored?.status === "Released" && latest?.id === stored.id && !rights.lead && (access?.edit || rights.manage) && !issued && <Button variant="outline" disabled={!!stored.revisionRequested} onClick={() => setRevision(true)}>{stored.revisionRequested ? "Revision requested" : "Request revision"}</Button>}
          </>
        }
      />
      {stored?.withdrawnAt && (
        <Alert tone="warning">
          This form was withdrawn. {stored.withdrawalReason}
        </Alert>
      )}
      <Alert tone="info">
        {stored?.status === "Released"
          ? `This released version is read-only. Only ${audit.lead}, the lead auditor, can start a ${label} revision.`
          : questionnaire
            ? "Build questions for auditees here. Choose an answer type, write the question and choices, and set required answers or evidence in question settings. When ready, the lead assigns respondents from Questionnaires."
            : "Build the auditor’s checks here. Edit questions and choices directly. Open each question’s settings with the ⋯ button. The lead marks it ready and assigns respondents from Questionnaires."}
      </Alert>
      {stored?.revisionRequested && <Alert tone="info">{stored.revisionRequested.by} requested a revision: {stored.revisionRequested.reason}. {audit.lead} starts the new version; released questions and responses stay unchanged.</Alert>}
      {stored?.status !== "Released" && (!stored?.preparationRoute || stored.preparationRoute.mode === "None") && <p className="text-sm text-muted-foreground">
        No preparation approval is required. Saving keeps this form in Draft; {audit.lead} marks it ready for official use.
      </p>}
      {stored &&
        !canEdit &&
        stored.status !== "Released" &&
        !formContentLocked(stored) && (
          <Alert tone="info">
            Only the lead, form owner or a selected collaborator with Edit
            access can change these questions. The form owner is{" "}
            {state.people.find((p) => p.id === stored?.ownerId)?.name ??
              audit.lead}
            .
          </Alert>
        )}
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
          <Field
            label={
              questionnaire ? "Questionnaire version" : "Checklist version"
            }
            htmlFor="checklist-version"
          >
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
                .filter(
                  (c) =>
                    c.auditId === id &&
                    (!stored || formKey(c) === formKey(stored)),
                )
                .sort((a, b) => b.version - a.version)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Version {c.version} · {c.status}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          {!questionnaire && (
            <label className="flex min-h-8 items-center gap-2 text-sm">
              <Switch
                aria-label="Use pre-audit questionnaire"
                disabled={!editable}
                checked={usesQuestionnaire}
                onCheckedChange={(uses) => save(sections, uses)}
              />
              Use pre-audit questionnaire
            </label>
          )}
        </CardContent>
      </Card>
      <ChecklistEditor
        key={`${id}-${stored?.id ?? draftId.current}-${editable}`}
        mode={questionnaire ? "Questionnaire" : "Checklist"}
        sections={sections}
        onChange={save}
        editable={editable}
        clauses={audit.clauses}
        auditors={[audit.lead, ...audit.auditors].filter(
          (name) =>
            !stored ||
            state.people.some(
              (p) =>
                p.name === name &&
                (name === audit.lead ||
                  p.id === stored.ownerId ||
                  stored.members === undefined ||
                  stored.members.some(
                    (m) => m.personId === p.id && m.access === "Edit",
                  )),
            ),
        )}
        defaultAuditor={audit.lead}
        usesQuestionnaire={usesQuestionnaire}
        idPrefix={stored?.id ?? draftId.current}
      />
      {!!stored?.ownershipHistory?.length && <details className="text-sm"><summary>Form preparation history</summary>{stored.ownershipHistory.map((h, i) => <p key={i} className="mt-2">{h.by} took over preparation on {formatDate(h.at.slice(0, 10))}: {h.reason}</p>)}</details>}
      {stored && <AuditFormApprovalPanel key={stored.id} form={stored} />}
      <Dialog open={takeover} onOpenChange={v => !v && takeoverClose.requestClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Take over form preparation</DialogTitle><DialogDescription>
            You will own and edit this draft. Existing auditor assignments stay in place. {audit.lead} remains responsible for releasing it.
          </DialogDescription></DialogHeader>
          {takeoverError && <Alert tone="danger">{takeoverError}</Alert>}
          <Field label="Reason for taking over" htmlFor="takeover-reason"><Textarea id="takeover-reason" value={takeoverReason} onChange={e => setTakeoverReason(e.target.value)} /></Field>
          <DialogFooter>{takeoverClose.discarding ? <><span className="mr-auto text-sm">Discard takeover reason?</span><Button variant="outline" onClick={takeoverClose.keep}>Keep editing</Button><Button variant="destructive-solid" onClick={() => { setTakeoverReason(""); takeoverClose.discard() }}>Discard changes</Button></> : <><Button variant="ghost" onClick={takeoverClose.requestClose}>Cancel</Button><Button onClick={() => {
            try { auditCommand({ kind: "takeOverAuditForm", auditId: id, checklistId: stored!.id, reason: takeoverReason }); setParams({ version: stored!.id }); setTakeover(false); toast("You can now edit the questions") }
            catch(e) { setTakeoverError((e as Error).message) }
          }}>Take over and edit</Button></>}</DialogFooter>
        </DialogContent>
      </Dialog>
      {settingsOpen && stored && (
        <AuditFormSettingsSheet
          audit={audit}
          form={stored}
          onClose={() => setSettingsOpen(false)}
        />
      )}
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
      <Dialog open={revision} onOpenChange={v => !v && revisionClose.requestClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rights.lead ? "Start" : "Request"} {label} revision</DialogTitle>
            <DialogDescription>
              Released versions and their responses stay unchanged. The new
              version starts as a revision draft. {rights.lead ? "" : `${audit.lead} receives your request and starts that version.`}
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
            {revisionClose.discarding ? <><span className="mr-auto text-sm">Discard revision reason?</span><Button variant="outline" onClick={revisionClose.keep}>Keep editing</Button><Button variant="destructive-solid" onClick={() => { setReason(""); revisionClose.discard() }}>Discard changes</Button></> : <><Button variant="ghost" onClick={revisionClose.requestClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  if (!rights.lead && stored) {
                    auditCommand({ kind: "requestAuditFormRevision", auditId: id, checklistId: stored.id, reason }); setRevision(false); setReason(""); toast("Revision requested from the lead"); return
                  }
                  const next = nextId(
                    takenIds("auditChecklists"),
                    questionnaire ? "AQF-" : "ACL-",
                    4,
                  )
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
              {rights.lead ? "Create revision draft" : "Send revision request"}
            </Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
