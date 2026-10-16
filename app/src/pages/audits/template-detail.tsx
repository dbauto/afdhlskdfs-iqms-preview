import { useParams, useSearchParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { todayIso } from "@/lib/periods"
import type { ChecklistSection } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ChecklistEditor } from "@/components/app/checklist-editor"
import { PageHeader } from "@/components/app/page"
import NotFound from "@/pages/not-found"

export default function ChecklistTemplateDetail() {
  const { templateId } = useParams()
  return <TemplateWorkspace key={templateId} templateId={templateId ?? ""} />
}
function TemplateWorkspace({ templateId }: { templateId: string }) {
  const { state, update, user, can } = useStore()
  const [params, setParams] = useSearchParams()
  const template = state.templates.find((t) => t.id === templateId)
  if (
    !template ||
    !can("Audits") ||
    user.status === "Deactivated" ||
    (user.accessEndsOn && user.accessEndsOn < todayIso())
  )
    return <NotFound />
  const canEdit = can("Audits", "Add and edit")
  const editable = canEdit && params.get("mode") !== "view"
  const sections = template.sections ?? []
  function save(
    next: ChecklistSection[],
    usesQuestionnaire = template!.usesQuestionnaire ?? false,
  ) {
    if (!editable) return
    try {
      update("templates", templateId, {
        sections: structuredClone(next),
        usesQuestionnaire,
        questions: next
          .flatMap((s) => s.items)
          .filter((q) => q.type !== "Instruction").length,
        version: (template!.version ?? 1) + 1,
        updated: "Today",
      })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const process = state.processes.find((p) => p.name === template.process)
  const clauses = [
    ...new Set([
      ...(process?.clauses ?? []),
      ...sections.map((s) => s.clause),
      "9.2",
    ]),
  ]
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: "Checklist templates", to: "/audits/templates" },
          { label: template.name },
        ]}
        title={template.name}
        description={`${template.process} · Version ${template.version ?? 1} · ${sections.flatMap((s) => s.items).filter((q) => q.type !== "Instruction").length} questions. ${editable ? "Changes save automatically." : "Read-only checklist."}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/audits/templates">Back to checklist templates</Link>
            </Button>
            {canEdit && !editable && (
              <Button onClick={() => setParams({})}>Edit questions</Button>
            )}
          </>
        }
      />
      <Alert tone="info">
        {editable
          ? "Edit questions and choices directly. Open each question’s settings with the ⋯ button. Changes apply to this template; audits already started keep their copied version."
          : "Open any question’s settings to view its rules. Audits already started keep their copied version."}
      </Alert>
      <Card>
        <CardContent className="py-4">
          <label className="flex min-h-8 items-center gap-2 text-sm">
            <Switch
              aria-label="Use pre-audit questionnaire"
              checked={template.usesQuestionnaire ?? false}
              disabled={!editable}
              onCheckedChange={(uses) => save(sections, uses)}
            />
            Use pre-audit questionnaire
          </label>
        </CardContent>
      </Card>
      <ChecklistEditor
        sections={sections}
        onChange={save}
        editable={editable}
        clauses={clauses}
        auditors={state.auditors
          .filter((a) => a.status === "Active")
          .map((a) => a.name)}
        defaultAuditor={template.owner}
        usesQuestionnaire={template.usesQuestionnaire ?? false}
        idPrefix={template.id}
      />
    </>
  )
}
