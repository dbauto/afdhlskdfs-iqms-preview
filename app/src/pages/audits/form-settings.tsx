import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { Audit, Person } from "@/data/types"
import type { AuditChecklist, AuditFormRoute } from "@/data/audit-types"
import type { AuditFormSettings } from "@/lib/audit-form-commands"
import {
  auditTeam,
  formBuilderPath,
  NO_FORM_ROUTE,
} from "@/lib/audit-form-policy"
import { nextId, useStore } from "@/lib/store"
import { useDraftClose } from "@/lib/use-draft-close"
import { Field } from "@/components/app/form"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet"

function RouteEditor({
  label,
  route,
  onChange,
  people,
}: {
  label: string
  route: AuditFormRoute
  onChange: (r: AuditFormRoute) => void
  people: Person[]
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-md border p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <Field label="Approval rule" htmlFor={`${label}-mode`}>
        <NativeSelect
          id={`${label}-mode`}
          value={route.mode}
          onChange={(e) =>
            onChange({
              mode: e.target.value as AuditFormRoute["mode"],
              approverIds: e.target.value === "None" ? [] : route.approverIds,
            })
          }
        >
          <option value="None">No approval required</option>
          <option value="All">Everyone approves</option>
          <option value="Any">Anyone approves</option>
          <option value="Sequential">Approve in order</option>
        </NativeSelect>
      </Field>
      {route.mode !== "None" && (
        <>
          <p className="text-xs text-muted-foreground">
            Choose independent reviewers from this audit team. For ordered
            approval, select people in the required order.
          </p>
          {people.map((p) => (
            <label
              key={p.id}
              className="flex min-h-8 items-center gap-2 text-sm"
            >
              <Checkbox
                checked={route.approverIds.includes(p.id)}
                onCheckedChange={(v) =>
                  onChange({
                    ...route,
                    approverIds: v
                      ? [...route.approverIds, p.id]
                      : route.approverIds.filter((id) => id !== p.id),
                  })
                }
              />
              {p.name}
              {route.approverIds.includes(p.id) && route.mode === "Sequential"
                ? ` · step ${route.approverIds.indexOf(p.id) + 1}`
                : ""}
            </label>
          ))}
          {!people.length && (
            <p className="text-sm text-muted-foreground">
              Add another eligible auditor to the plan before setting an
              approval route.
            </p>
          )}
        </>
      )}
    </fieldset>
  )
}
export function AuditFormSettingsSheet({
  audit,
  form,
  kind = "Checklist",
  onClose,
}: {
  audit: Audit
  form?: AuditChecklist
  kind?: AuditFormSettings["kind"]
  onClose: () => void
}) {
  const { state, auditCommand, takenIds, user } = useStore(),
    navigate = useNavigate()
  const team = auditTeam(state, audit)
  const initial: AuditFormSettings = {
    title: form?.title ?? "",
    kind: form?.kind ?? kind,
    ownerId:
      form?.ownerId ??
      team.find(
        (p) =>
          p.id === user.id &&
          (p.name === audit.lead ||
            ["Add and edit", "Manage"].includes(
              state.roles.find((r) => r.id === p.roleId)?.access.Audits ??
                "None",
            )),
      )?.id ??
      team.find((p) => p.name === audit.lead)?.id ??
      user.id,
    members:
      form?.members ??
      (form
        ? team.map((p) => ({ personId: p.id, access: "Edit" as const }))
        : []),
    preparationRoute: structuredClone(form?.preparationRoute ?? NO_FORM_ROUTE),
    completionRoute: structuredClone(form?.completionRoute ?? NO_FORM_ROUTE),
  }
  const [settings, setSettings] = React.useState(initial),
    [dirty, setDirty] = React.useState(false),
    [error, setError] = React.useState(""),
    [saving, setSaving] = React.useState(false)
  const busy = React.useRef(false),
    close = useDraftClose(dirty, onClose)
  const patch = (v: Partial<AuditFormSettings>) => {
    setSettings((s) => ({ ...s, ...v }))
    setDirty(true)
  }
  const eligible = team.filter(
    (p) =>
      p.id !== settings.ownerId &&
      p.id !== user.id &&
      (p.name === audit.lead ||
        ["Add and edit", "Approve", "Manage"].includes(
          state.roles.find((r) => r.id === p.roleId)?.access.Audits ?? "None",
        )),
  )
  function save() {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    try {
      const id =
        form?.id ??
        nextId(
          takenIds("auditChecklists"),
          settings.kind === "Questionnaire" ? "AQF-" : "ACL-",
          4,
        )
      if (form)
        auditCommand({
          kind: "configureAuditForm",
          auditId: audit.id,
          checklistId: id,
          settings,
        })
      else
        auditCommand({
          kind: "createAuditForm",
          auditId: audit.id,
          id,
          settings,
        })
      toast(form ? "Form settings saved" : `${settings.kind} added`)
      onClose()
      if (!form)
        navigate(
          formBuilderPath({
            auditId: audit.id,
            id,
            kind: settings.kind,
          }),
        )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      busy.current = false
      setSaving(false)
    }
  }
  return (
    <Sheet open onOpenChange={(v) => !v && close.requestClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {form ? "Form settings" : `Add ${kind.toLowerCase()}`}
          </SheetTitle>
          <SheetDescription>
            Choose the form owner, collaborators and optional approval routes
            within this audit plan.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Form name" htmlFor="af-title">
            <Input
              id="af-title"
              value={settings.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </Field>
          <Field label="Form type">
            <p className="text-sm">{settings.kind}</p>
          </Field>
          {!team.some((p) => p.id === user.id) && (
            <Alert tone="info">
              You are not on this audit team. The owner prepares the questions.
              To edit them yourself, join the audit team and ask for Edit
              access.
            </Alert>
          )}
          <Field label="Form owner" htmlFor="af-owner">
            <NativeSelect
              id="af-owner"
              value={settings.ownerId}
              onChange={(e) => patch({ ownerId: e.target.value })}
            >
              {team
                .filter(
                  (p) =>
                    p.name === audit.lead ||
                    ["Add and edit", "Manage"].includes(
                      state.roles.find((r) => r.id === p.roleId)?.access
                        .Audits ?? "None",
                    ),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-2 text-sm font-medium">
              Share with audit team
            </legend>
            <p className="text-xs text-muted-foreground">
              The lead and form owner have access. Approvers can read the form
              and decide their assigned step. Question responsibility stays with
              its assigned auditor.
            </p>
            {team
              .filter((p) => p.name !== audit.lead && p.id !== settings.ownerId)
              .map((p) => (
                <Field key={p.id} label={p.name} htmlFor={`member-${p.id}`}>
                  <NativeSelect
                    id={`member-${p.id}`}
                    value={
                      settings.members.find((m) => m.personId === p.id)
                        ?.access ?? "None"
                    }
                    onChange={(e) =>
                      patch({
                        members: [
                          ...settings.members.filter(
                            (m) => m.personId !== p.id,
                          ),
                          ...(e.target.value === "None"
                            ? []
                            : [
                                {
                                  personId: p.id,
                                  access: e.target.value as "View" | "Edit",
                                },
                              ]),
                        ],
                      })
                    }
                  >
                    <option value="None">No access</option>
                    <option>View</option>
                    {["Add and edit", "Manage"].includes(
                      state.roles.find((r) => r.id === p.roleId)?.access
                        .Audits ?? "None",
                    ) && <option>Edit</option>}
                  </NativeSelect>
                </Field>
              ))}
          </fieldset>
          <RouteEditor
            label="Before use"
            route={settings.preparationRoute}
            people={eligible}
            onChange={(preparationRoute) => patch({ preparationRoute })}
          />
          <RouteEditor
            label="After completion"
            route={settings.completionRoute}
            people={eligible}
            onChange={(completionRoute) => patch({ completionRoute })}
          />
        </SheetBody>
        <SheetFooter>
          {close.discarding ? (
            <>
              <span className="mr-auto text-sm">Discard unsaved changes?</span>
              <Button variant="outline" onClick={close.keep}>
                Keep editing
              </Button>
              <Button variant="destructive-solid" onClick={close.discard}>
                Discard changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={close.requestClose}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={save}>
                {form
                  ? "Save settings"
                  : settings.kind === "Questionnaire"
                    ? "Create questionnaire"
                    : "Add form"}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
