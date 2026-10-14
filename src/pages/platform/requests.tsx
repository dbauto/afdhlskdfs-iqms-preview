import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { PLATFORM_REQUESTS } from "@/data/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PlatformHeader } from "./shell"

export default function PlatformRequests() {
  const [decided, setDecided] = React.useState<Record<string, "yes" | "no" | undefined>>({})
  return (
    <>
      <PlatformHeader title="Requests" description="Only requests a client can’t decide come here: new organisations, more seats than the plan allows, and companies with no active admin. Access requests from people inside a company go to that company’s admin." />
      <Card>
        <ul>
          {PLATFORM_REQUESTS.map((r, i) => {
            const d = decided[r.id]
            return (
              <li key={r.id} className={cn("grid grid-cols-1 items-center gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_260px]", i > 0 && "border-t border-rule-soft")}>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="progress">{r.kind}</Badge>
                    <span className="text-sm font-semibold">{r.title}</span>
                  </span>
                  <span className="text-sm leading-normal">{r.detail}</span>
                  <span className="text-xs text-muted-foreground">{r.meta}</span>
                </div>
                <span className="flex flex-wrap items-center gap-2 md:justify-end">
                  {d ? (
                    <>
                      <Badge tone={d === "yes" ? "done" : "draft"}>{d === "yes" ? r.doneLabel : "Declined"}</Badge>
                      <Button variant="quiet" size="sm" onClick={() => setDecided((x) => ({ ...x, [r.id]: undefined }))}>
                        Undo
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setDecided((x) => ({ ...x, [r.id]: "no" }))}>
                        Decline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary text-primary"
                        onClick={() => {
                          setDecided((x) => ({ ...x, [r.id]: "yes" }))
                          toast(r.doneLabel, { description: "Logged in the client’s activity log." })
                        }}
                      >
                        {r.approveLabel}
                      </Button>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}
