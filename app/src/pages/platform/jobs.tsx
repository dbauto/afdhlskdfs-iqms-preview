import { toast } from "sonner"

import { JOBS } from "@/data/admin"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/app/data-table"
import { StateBadge } from "@/components/app/status"
import { PlatformHeader } from "./shell"

export default function Jobs() {
  return (
    <>
      <PlatformHeader title="Background jobs" description="Scheduled work that runs for every organisation. Failing jobs also show in Logs." />
      <DataTable
        label="Background jobs"
        rows={JOBS}
        getRowId={(j) => j.name}
        minWidth={900}
        columns={[
          { id: "n", header: "Job", cell: (j) => <span className="flex flex-col"><span className="font-mono text-[0.8125rem] font-medium">{j.name}</span><span className="text-xs text-muted-foreground">{j.what}</span></span> },
          { id: "s", header: "Runs", cell: (j) => j.schedule },
          { id: "l", header: "Last run", cell: (j) => <span className="text-muted-foreground">{j.last}</span> },
          { id: "q", header: "Queued", cell: (j) => j.queue },
          { id: "st", header: "State", cell: (j) => <StateBadge value={j.state} /> },
          { id: "x", header: <span className="sr-only">Run now</span>, className: "w-28", cell: (j) => <Button variant="quiet" size="sm" onClick={() => toast(`${j.name} started`)}>Run now</Button> },
        ]}
      />
    </>
  )
}
