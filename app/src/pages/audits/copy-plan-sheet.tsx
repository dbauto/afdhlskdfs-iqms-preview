import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Audit } from "@/data/types";
import { auditForms, formTitle } from "@/lib/audit-form-policy";
import { blockedReason } from "@/lib/auditors";
import { nextId, useStore } from "@/lib/store";
import { todayIso } from "@/lib/periods";
import { useDraftClose } from "@/lib/use-draft-close";
import { Field } from "@/components/app/form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, NativeSelect } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";

export function CopyAuditPlanSheet({
  audit,
  onClose,
}: {
  audit: Audit;
  onClose: () => void;
}) {
  const { state, user, role, auditCommand, takenIds } = useStore(),
    navigate = useNavigate(),
    forms = auditForms(state, audit.id);
  const [process, setProcess] = React.useState(""),
    [leadId, setLead] = React.useState(""),
    [team, setTeam] = React.useState<string[]>([]),
    [selected, setSelected] = React.useState(forms.map((c) => c.id)),
    [date, setDate] = React.useState(todayIso()),
    [dirty, setDirty] = React.useState(false),
    [saving, setSaving] = React.useState(false),
    [error, setError] = React.useState("");
  const close = useDraftClose(dirty, onClose),
    busy = React.useRef(false);
  const available = state.people.filter(
    (p) =>
      p.status !== "Deactivated" &&
      (!p.accessEndsOn || p.accessEndsOn >= todayIso()) &&
      state.auditors.some(
        (a) =>
          a.name === p.name &&
          a.status === "Active" &&
          !blockedReason(a, process, state.processes, state.people),
      ),
  );
  function save() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const id = nextId(takenIds("audits"), `IA-${date.slice(0, 4)}-`, 2);
      auditCommand({
        kind: "copyAuditPlan",
        auditId: audit.id,
        id,
        process,
        leadId,
        auditorIds: team,
        date,
        formIds: selected,
      });
      toast("Audit plan copied");
      onClose();
      navigate(`/audits/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <Sheet open onOpenChange={(v) => !v && close.requestClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Copy to another process</SheetTitle>
          <SheetDescription>
            Create an independent draft audit from selected forms. Review its
            clauses, collaborators and approval routes before release.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {error && <Alert tone="danger">{error}</Alert>}
          <Alert tone="info">
            Questions and form structure are copied. Answers, findings, evidence
            links, previous approvals and access grants stay with the source
            audit. Approval routes start turned off for you to configure.
          </Alert>
          <Field label="Destination process" htmlFor="copy-process">
            <NativeSelect
              id="copy-process"
              value={process}
              onChange={(e) => {
                setProcess(e.target.value);
                setLead("");
                setTeam([]);
                setDirty(true);
              }}
            >
              <option value="">Choose a process</option>
              {state.processes
                .filter(
                  (p) =>
                    ["All processes", "Not their own process"].includes(
                      role.scope,
                    ) ||
                    p.owner === user.name ||
                    p.members?.includes(user.name),
                )
                .map((p) => (
                  <option key={p.id}>{p.name}</option>
                ))}
            </NativeSelect>
          </Field>
          <Field label="Audit date" htmlFor="copy-date">
            <Input
              id="copy-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
          <Field label="Lead auditor" htmlFor="copy-lead">
            <NativeSelect
              id="copy-lead"
              value={leadId}
              onChange={(e) => {
                setLead(e.target.value);
                setTeam((t) => t.filter((id) => id !== e.target.value));
                setDirty(true);
              }}
            >
              <option value="">Choose an independent lead auditor</option>
              {available
                .filter(
                  (p) =>
                    state.auditors.find((a) => a.name === p.name)?.level ===
                    "Lead auditor",
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Audit team</legend>
            {available
              .filter((p) => p.id !== leadId)
              .map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-8 items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={team.includes(p.id)}
                    onCheckedChange={(v) => {
                      setTeam((t) =>
                        v ? [...t, p.id] : t.filter((id) => id !== p.id),
                      );
                      setDirty(true);
                    }}
                  />
                  {p.name}
                </label>
              ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Forms to copy</legend>
            {forms.map((c) => (
              <label
                key={c.id}
                className="flex min-h-8 items-start gap-2 text-sm"
              >
                <Checkbox
                  checked={selected.includes(c.id)}
                  onCheckedChange={(v) => {
                    setSelected((ids) =>
                      v ? [...ids, c.id] : ids.filter((id) => id !== c.id),
                    );
                    setDirty(true);
                  }}
                />
                {formTitle(c)} · version {c.version}
              </label>
            ))}
          </fieldset>
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
              <Button
                onClick={save}
                disabled={saving || !process || !leadId || !selected.length}
              >
                Copy audit plan
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
