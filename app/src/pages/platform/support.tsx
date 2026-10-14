import { toast } from "sonner"

import { SUPPORT_SESSIONS } from "@/data/admin"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/app/data-table"
import { StateBadge } from "@/components/app/status"
import { PlatformHeader } from "./shell"

export default function SupportAccess() {
  return (
    <>
      <PlatformHeader title="Support access" description="Times a client let your team into their workspace. Access is granted by the client admin, ends on its own, and everything opened is logged on their side too." />
      <Alert tone="info">Highly confidential records stay hidden even during support access. To see one, the record owner must share it with the support engineer.</Alert>
      <DataTable
        label="Support access"
        rows={SUPPORT_SESSIONS}
        getRowId={(s) => s.ticket}
        minWidth={820}
        columns={[
          { id: "o", header: "Organisation", cell: (s) => <span className="font-medium">{s.org}</span> },
          { id: "t", header: "Ticket", cell: (s) => <span className="font-mono text-[0.8125rem]">{s.ticket}</span> },
          { id: "g", header: "Granted by", cell: (s) => s.grantedBy },
          { id: "w", header: "Used by", cell: (s) => s.who },
          { id: "u", header: "Until", cell: (s) => s.until },
          { id: "s", header: "State", cell: (s) => <StateBadge value={s.state} /> },
          { id: "x", header: <span className="sr-only">Actions</span>, className: "w-32", cell: (s) => (s.state === "Active" ? <Button variant="quiet" size="sm" className="text-destructive" onClick={() => toast("Support access ended early")}>End now</Button> : null) },
        ]}
      />
    </>
  )
}
