import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/input"
import { SettingsHeader } from "./layout"
import { useStore } from "@/lib/store"
import { RETENTION_ROWS } from "@/lib/settings"

export default function Retention() {
  const { settings, saveSettings } = useStore()
  const [keep, setKeep] = React.useState<Record<string, string>>(settings.retention)
  return (
    <>
      <SettingsHeader title="Record retention" description="How long records are kept before they are removed. ISO 9001 clause 7.5.3 and the Data Privacy Act both expect you to decide this." />
      <Alert tone="info">Records are never removed while they are in use, linked to an open item, or under legal hold. The data protection officer gets a list a month before anything is removed.</Alert>
      <Card>
        <ul>
          {RETENTION_ROWS.map(([what, , note], i) => (
            <li key={what} className={cn("grid grid-cols-1 items-center gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_180px]", i > 0 && "border-t border-rule-soft")}>
              <span className="flex flex-col">
                <span className="text-sm font-medium">{what}</span>
                {note && <span className="text-[0.8125rem] text-muted-foreground">{note}</span>}
              </span>
              <NativeSelect aria-label={`Keep ${what} for`} value={keep[what]} onChange={(e) => setKeep({ ...keep, [what]: e.target.value })} className="h-9 text-[0.8125rem]">
                {["90 days", "1 year", "3 years", "5 years", "6 years", "10 years", "Forever"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </NativeSelect>
            </li>
          ))}
        </ul>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => { saveSettings("retention", keep); toast("Retention saved", { description: "The data protection officer is told a month before anything is removed." }) }}>Save changes</Button>
      </div>
    </>
  )
}
