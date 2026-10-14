import * as React from "react"
import { CopyIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { PageHeader } from "@/components/app/page"
import { RowActions } from "@/components/app/record-actions"
import { Field, PeopleOptions, ProcessOptions } from "@/components/app/form"

type Tpl = ReturnType<typeof useStore>["state"]["templates"][number]

export default function ChecklistTemplates() {
  const { state, add, update, remove, user, can } = useStore()
  const [edit, setEdit] = React.useState<{ open: boolean; tpl?: Tpl }>({ open: false })
  const [f, setF] = React.useState({ name: "", process: "Operations", owner: user.name })
  const canEdit = can("Audits", "Add and edit")

  function open(tpl?: Tpl) {
    setF({ name: tpl?.name ?? "", process: tpl?.process ?? "Operations", owner: tpl?.owner ?? user.name })
    setEdit({ open: true, tpl })
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Audits", to: "/audits" }, { label: "Checklist templates" }]}
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
        label="Checklist templates" empty={{ title: "No templates yet", body: "Save a checklist as a template from any audit, so the next audit of that process starts from it." }}
        rows={state.templates}
        getRowId={(t) => t.id}
        minWidth={860}
        columns={[
          { id: "n", header: "Template", cell: (t) => <span className="font-medium">{t.name}</span> },
          { id: "p", header: "Process", cell: (t) => <span className="text-muted-foreground">{t.process}</span> },
          { id: "q", header: "Questions", cell: (t) => t.questions },
          { id: "o", header: "Kept by", cell: (t) => t.owner },
          { id: "u", header: "Updated", cell: (t) => t.updated },
          { id: "used", header: "Used", cell: (t) => `${t.used} times` },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-12",
            cell: (t) => (
              <RowActions
                name={t.name}
                onEdit={canEdit ? () => open(t) : undefined}
                extra={canEdit ? [{ label: "Duplicate", icon: <CopyIcon />, onSelect: () => { add("templates", { ...t, id: `CT-${Date.now()}`, name: `${t.name} (copy)`, used: 0, updated: "Today" }); toast(`Duplicated ${t.name}`) } }] : undefined}
                removeKind={canEdit ? "delete" : undefined}
                onRemove={() => remove("templates", t.id)}
              />
            ),
          },
        ]}
      />

      <Dialog open={edit.open} onOpenChange={(o) => setEdit((e) => ({ ...e, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit.tpl ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>Add the questions in the checklist workspace after you save.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="t-name">
            <Input id="t-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="t-proc">
              <NativeSelect id="t-proc" value={f.process} onChange={(e) => setF({ ...f, process: e.target.value })}>
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="Kept by" htmlFor="t-owner">
              <NativeSelect id="t-owner" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
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
                if (edit.tpl) update("templates", edit.tpl.id, { ...f, updated: "Today" })
                else add("templates", { id: `CT-${Date.now()}`, ...f, questions: 0, updated: "Today", used: 0 })
                toast(edit.tpl ? "Template saved" : `Template “${f.name}” created`)
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
