import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { PLATFORM_TEAM } from "@/data/admin"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/app/data-table"
import { RowActions } from "@/components/app/record-actions"
import { PlatformHeader } from "./shell"

export default function PlatformTeam() {
  return (
    <>
      <PlatformHeader
        title="Platform team"
        description="Your own staff who can open this console. Developers get read-only logs. Nobody here can open client records without support access."
        actions={
          <Button onClick={() => toast("Invitation sent")}>
            <PlusIcon /> Add team member
          </Button>
        }
      />
      <DataTable
        label="Platform team" empty={{ title: "No one on the platform team yet", body: "Invite the people who run ThryveMS for all clients." }}
        rows={PLATFORM_TEAM}
        getRowId={(p) => p.email}
        minWidth={720}
        columns={[
          { id: "n", header: "Person", cell: (p) => <span className="flex items-center gap-3"><Avatar name={p.name} size={30} /><span className="flex flex-col"><span className="font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{p.email}</span></span></span> },
          { id: "r", header: "Role", cell: (p) => p.role },
          { id: "l", header: "Last active", cell: (p) => <span className="text-muted-foreground">{p.last}</span> },
          { id: "x", header: <span className="sr-only">Actions</span>, className: "w-12", cell: (p) => <RowActions name={p.name} onEdit={() => toast("Edit role")} extra={[{ label: "Remove access", onSelect: () => toast(`${p.name} removed`) }]} /> },
        ]}
      />
    </>
  )
}
