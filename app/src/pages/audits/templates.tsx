import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import NotFound from "@/pages/not-found"
import { todayIso } from "@/lib/periods"
import { CopyIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore, startProcess, nextId } from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { PageHeader } from "@/components/app/page"
import { RowActions } from "@/components/app/record-actions"
import { Field, PeopleOptions, ProcessOptions } from "@/components/app/form"

type Tpl = ReturnType<typeof useStore>["state"]["templates"][number]

export default function ChecklistTemplates() {
  const { state, add, update, remove, user, role, can, takenIds } = useStore()
  const [edit, setEdit] = React.useState<{ open: boolean; tpl?: Tpl }>({
    open: false,
  })
  const [f, setF] = React.useState({
    name: "",
    process: startProcess(state.processes),
    owner: user.name,
  })
  const canEdit = can("Audits", "Add and edit")

  function open(tpl?: Tpl) {
    setF({
      name: tpl?.name ?? "",
      process: tpl?.process ?? startProcess(state.processes),
      owner: tpl?.owner ?? user.name,
    })
    setEdit({ open: true, tpl })
  }

  if (
    !can("Audits") ||
    role.id === "guest-auditor" ||
    user.status === "Deactivated" ||
    (user.accessEndsOn && user.accessEndsOn < todayIso())
  )
    return <NotFound />

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: "Checklist templates" },
        ]}
        title="Checklist templates"
        description="Reusable checklists. Start an audit from one, or build your own in the checklist workspace."
        actions={
          canEdit && (
            <Button onClick={() => open()}>
              <PlusIcon /> New template
            </Button>
          )
        }
      />
      <DataTable
        label="Checklist templates"
        empty={{
          title: "No templates yet",
          body: "Save a checklist as a template from any audit, so the next audit of that process starts from it.",
        }}
        rows={state.templates}
        getRowId={(t) => t.id}
        minWidth={860}
        columns={[
          {
            id: "n",
            header: "Template",
            cell: (t) => (
              <Link
                className="font-medium text-primary hover:underline"
                to={`/audits/templates/${t.id}?mode=view`}
              >
                {t.name}
              </Link>
            ),
          },
          {
            id: "p",
            header: "Process",
            cell: (t) => (
              <span className="text-muted-foreground">{t.process}</span>
            ),
          },
          {
            id: "q",
            header: "Questions",
            cell: (t) =>
              (t.sections ?? [])
                .flatMap((s) => s.items)
                .filter((q) => q.type !== "Instruction").length,
          },
          { id: "o", header: "Kept by", cell: (t) => t.owner },
          { id: "u", header: "Updated", cell: (t) => t.updated },
          { id: "used", header: "Used", cell: (t) => `${t.used} times` },
          {
            id: "open",
            header: "Checklist",
            cell: (t) => (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/audits/templates/${t.id}?mode=view`}>
                    Open checklist
                  </Link>
                </Button>
                {canEdit && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/audits/templates/${t.id}`}>Edit questions</Link>
                  </Button>
                )}
              </div>
            ),
          },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-12",
            cell: (t) => (
              <RowActions
                name={t.name}
                openTo={`/audits/templates/${t.id}?mode=view`}
                onEdit={canEdit ? () => open(t) : undefined}
                extra={
                  canEdit
                    ? [
                        {
                          label: "Duplicate",
                          icon: <CopyIcon />,
                          onSelect: () => {
                            add("templates", {
                              ...t,
                              id: nextId(takenIds("templates"), "CT-", 4),
                              name: `${t.name} (copy)`,
                              used: 0,
                              updated: "Today",
                            })
                            toast(`Duplicated ${t.name}`)
                          },
                        },
                      ]
                    : undefined
                }
                removeKind={canEdit ? "delete" : undefined}
                onRemove={() => remove("templates", t.id)}
              />
            ),
          },
        ]}
      />

      <Dialog
        open={edit.open}
        onOpenChange={(o) => setEdit((e) => ({ ...e, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit.tpl ? "Edit template" : "New template"}
            </DialogTitle>
            <DialogDescription>
              Open Edit questions from the template list to view and change its
              questions.
            </DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="t-name">
            <Input
              id="t-name"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="t-proc">
              <NativeSelect
                id="t-proc"
                value={f.process}
                onChange={(e) => setF({ ...f, process: e.target.value })}
              >
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="Kept by" htmlFor="t-owner">
              <NativeSelect
                id="t-owner"
                value={f.owner}
                onChange={(e) => setF({ ...f, owner: e.target.value })}
              >
                <PeopleOptions />
              </NativeSelect>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit({ open: false })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!f.name.trim()) return
                if (edit.tpl)
                  update("templates", edit.tpl.id, { ...f, updated: "Today" })
                else
                  add("templates", {
                    id: nextId(takenIds("templates"), "CT-", 4),
                    ...f,
                    sections: [],
                    version: 1,
                    questions: 0,
                    updated: "Today",
                    used: 0,
                  })
                toast(
                  edit.tpl ? "Template saved" : `Template “${f.name}” created`,
                )
                setEdit({ open: false })
              }}
            >
              {edit.tpl ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
