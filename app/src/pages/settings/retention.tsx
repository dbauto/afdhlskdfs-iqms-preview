import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/input"
import { SettingsHeader } from "./layout"

const ROWS = [
  ["Superseded and archived documents", "10 years", "After they stop being in force"],
  ["Audit reports and checklists", "6 years", "Two certification cycles"],
  ["Nonconformities and corrective actions", "6 years", "After closing"],
  ["Management review records", "10 years", ""],
  ["Training and competence records", "5 years", "After the person leaves"],
  ["Activity log", "3 years", "Who viewed, changed, approved or shared"],
  ["Sign-in history", "90 days", "Security only"],
]

export default function Retention() {
  return (
    <>
      <SettingsHeader title="Record retention" description="How long records are kept before they are removed. ISO 9001 clause 7.5.3 and the Data Privacy Act both expect you to decide this." />
      <Alert tone="info">Records are never removed while they are in use, linked to an open item, or under legal hold. The data protection officer gets a list a month before anything is removed.</Alert>
      <Card>
        <ul>
          {ROWS.map(([what, keep, note], i) => (
            <li key={what} className={cn("grid grid-cols-1 items-center gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_180px]", i > 0 && "border-t border-rule-soft")}>
              <span className="flex flex-col">
                <span className="text-sm font-medium">{what}</span>
                {note && <span className="text-[0.8125rem] text-muted-foreground">{note}</span>}
              </span>
              <NativeSelect aria-label={`Keep ${what} for`} defaultValue={keep} className="h-9 text-[0.8125rem]">
                {["90 days", "1 year", "3 years", "5 years", "6 years", "10 years", "Forever"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </NativeSelect>
            </li>
          ))}
        </ul>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => toast("Retention saved")}>Save changes</Button>
      </div>
    </>
  )
}
