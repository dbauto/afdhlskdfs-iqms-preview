import * as React from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Process } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { RowActions } from "@/components/app/record-actions"
import { ClausePicker, Field, PeopleOptions } from "@/components/app/form"
import { formatClauses, parseClauses } from "@/data/iso"
import { SettingsHeader } from "./layout"

export default function ProcessStructure() {
  const { state, add, update, remove } = useStore()
  const [edit, setEdit] = React.useState<{ open: boolean; p?: Process }>({ open: false })
  const [f, setF] = React.useState({ name: "", owner: "Maria Santos", band: "Core" as Process["band"], clauses: "" })

  function open(p?: Process) {
    setF({ name: p?.name ?? "", owner: p?.owner ?? "Maria Santos", band: p?.band ?? "Core", clauses: p?.clauses ?? "" })
    setEdit({ open: true, p })
  }

  return (
    <>
      <SettingsHeader
        title="Process structure"
        description="The processes that make up your QMS, who owns each, and which ISO 9001 clauses each covers. Owners get the tasks for their process."
        actions={
          <Button onClick={() => open()}>
            <PlusIcon /> Add process
          </Button>
        }
      />
      <DataTable
        label="Processes" empty={{ title: "No processes yet", body: "Add the processes your business runs, with an owner for each. ISO 9001 clause 4.4." }}
        rows={state.processes}
        getRowId={(p) => p.id}
        minWidth={700}
        columns={[
          { id: "n", header: "Process", cell: (p) => <span className="font-medium"><span className="text-muted-foreground">{p.id}</span> {p.name}</span> },
          { id: "b", header: "Group", cell: (p) => p.band },
          { id: "o", header: "Owner", cell: (p) => p.owner },
          { id: "c", header: "Clauses", cell: (p) => <span className="text-muted-foreground">{p.clauses}</span> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-12",
            cell: (p) => {
              const used = state.documents.some((d) => d.process === p.name)
              return <RowActions name={p.name} onEdit={() => open(p)} removeKind={used ? undefined : "delete"} onRemove={() => remove("processes", p.id)} />
            },
          },
        ]}
      />
      <Dialog open={edit.open} onOpenChange={(o) => setEdit((e) => ({ ...e, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit.p ? `Edit ${edit.p.name}` : "Add process"}</DialogTitle>
            <DialogDescription>Renaming a process updates every record linked to it.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="ps-n">
            <Input id="ps-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner" htmlFor="ps-o">
              <NativeSelect id="ps-o" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
                <PeopleOptions />
              </NativeSelect>
            </Field>
            <Field label="Group" htmlFor="ps-b">
              <NativeSelect id="ps-b" value={f.band} onChange={(e) => setF({ ...f, band: e.target.value as Process["band"] })}>
                <option>Management</option>
                <option>Core</option>
                <option>Support</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="ISO 9001 clauses" htmlFor="ps-c" help="Choose every clause this process is responsible for. Clauses 1 to 3 are informative, so they aren’t listed.">
            <ClausePicker id="ps-c" label="ISO 9001 clauses" value={parseClauses(f.clauses)} onChange={(v) => setF({ ...f, clauses: formatClauses(v) })} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit({ open: false })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!f.name.trim()) return
                if (edit.p) update("processes", edit.p.id, f)
                else add("processes", { id: String(state.processes.length + 1).padStart(2, "0"), ...f, purpose: "", inputs: [], activities: [], outputs: [], involved: "", feeds: "" })
                toast(edit.p ? "Process saved" : `${f.name} added`)
                setEdit({ open: false })
              }}
            >
              {edit.p ? "Save changes" : "Add process"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
