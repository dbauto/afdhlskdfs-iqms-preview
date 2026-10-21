import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"
import { useStore } from "@/lib/store"
import { DEFAULT_NOTIFICATION_PREFS, NOTIFICATION_EVENTS } from "@/lib/settings"

export default function Notifications() {
  const { user, settings, saveSettings } = useStore()
  const [prefs, setPrefs] = React.useState(() => settings.notifications[user.id] ?? DEFAULT_NOTIFICATION_PREFS)
  const [digest, setDigest] = React.useState(settings.digests[user.id] ?? "Weekly, Monday morning")
  return (
    <>
      <SettingsHeader title="Notifications" description="What ThryveMS tells you about, and where. These settings are yours only." />
      <Card>
        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-3 border-b px-5 py-3 text-xs text-muted-foreground">
          <span>Tell me when</span>
          <span className="text-center">In ThryveMS</span>
          <span className="text-center">Email</span>
        </div>
        <ul>
          {NOTIFICATION_EVENTS.map(({ label: t, help: h }, i) => (
            <li key={t} className={cn("grid grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
              <span className="flex flex-col">
                <span className="text-sm font-medium">{t}</span>
                {h && <span className="text-[0.8125rem] text-muted-foreground">{h}</span>}
              </span>
              {(["app", "email"] as const).map((k) => (
                <span key={k} className="flex justify-center">
                  <Checkbox checked={prefs[i][k]} onCheckedChange={(v) => setPrefs((p) => p.map((x, j) => (j === i ? { ...x, [k]: !!v } : x)))} aria-label={`${t}, ${k === "app" ? "in ThryveMS" : "by email"}`} />
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
            <NativeSelect id="digest" value={digest} onChange={(e) => setDigest(e.target.value)} className="sm:w-72">
              <option>Daily, 7:00</option>
              <option>Weekly, Monday morning</option>
              <option>Never</option>
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            saveSettings("notifications", { ...settings.notifications, [user.id]: prefs })
            saveSettings("digests", { ...settings.digests, [user.id]: digest })
            toast("Notification settings saved", { description: "Anything you turned off no longer reaches your bell. Work waiting on you still shows in My tasks." })
          }}
        >
          Save changes
        </Button>
      </div>
    </>
  )
}
