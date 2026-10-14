import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"

const EVENTS = [
  ["Something is waiting on you", "Approvals, reviews, verifications, tasks"],
  ["Something you own is overdue", "Documents, actions, risk reviews"],
  ["A record you follow changes", "Comments, stage changes"],
  ["Someone shares a record with you", ""],
  ["An audit you’re in is planned or changed", ""],
  ["A policy needs your acknowledgement", ""],
]

export default function Notifications() {
  const [prefs, setPrefs] = React.useState(() => EVENTS.map((_, i) => ({ app: true, email: i < 3 || i === 5 })))
  return (
    <>
      <SettingsHeader title="Notifications" description="What iQMS tells you about, and where. These settings are yours only." />
      <Card>
        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-3 border-b px-5 py-3 text-xs text-muted-foreground">
          <span>Tell me when</span>
          <span className="text-center">In iQMS</span>
          <span className="text-center">Email</span>
        </div>
        <ul>
          {EVENTS.map(([t, h], i) => (
            <li key={t} className={cn("grid grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
              <span className="flex flex-col">
                <span className="text-sm font-medium">{t}</span>
                {h && <span className="text-[13px] text-muted-foreground">{h}</span>}
              </span>
              {(["app", "email"] as const).map((k) => (
                <span key={k} className="flex justify-center">
                  <Checkbox checked={prefs[i][k]} onCheckedChange={(v) => setPrefs((p) => p.map((x, j) => (j === i ? { ...x, [k]: !!v } : x)))} aria-label={`${t}, ${k === "app" ? "in iQMS" : "by email"}`} />
                </span>
              ))}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Summary email</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Send me a summary" htmlFor="digest">
            <NativeSelect id="digest" defaultValue="Weekly, Monday morning" className="sm:w-72">
              <option>Daily, 7:00</option>
              <option>Weekly, Monday morning</option>
              <option>Never</option>
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => toast("Notification settings saved")}>Save changes</Button>
      </div>
    </>
  )
}
