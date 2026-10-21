import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CircleCheckIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { ORG } from "@/data/org"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"
import { useStore } from "@/lib/store"

export default function OrgProfile() {
  const { settings, saveSettings } = useStore()
  const [f, setF] = React.useState(settings.org)
  const [error, setError] = React.useState("")
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  return (
    <>
      <SettingsHeader title="Organization profile" description="Your company details. They appear on reports, exports and the audit pack." />
      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Name shown in ThryveMS" htmlFor="o-name">
            <Input id="o-name" value={f.name} onChange={set("name")} />
          </Field>
          <Field label="Registered name" htmlFor="o-legal">
            <Input id="o-legal" value={f.legal} onChange={set("legal")} />
          </Field>
          <Field label="TIN" htmlFor="o-tin" help="Printed on invoices.">
            <Input id="o-tin" value={f.tin} onChange={set("tin")} />
          </Field>
          <Field label="Industry" htmlFor="o-ind">
            <Input id="o-ind" value={f.industry} onChange={set("industry")} />
          </Field>
          <Field label="Address" htmlFor="o-addr" className="md:col-span-2">
            <Input id="o-addr" value={f.address} onChange={set("address")} />
          </Field>
          <Field label="Time zone" htmlFor="o-tz">
            <NativeSelect id="o-tz" value={f.tz} onChange={set("tz")}>
              <option>Asia/Manila</option>
              <option>Asia/Singapore</option>
            </NativeSelect>
          </Field>
          <Field label="Logo" optional help="Shown on exported reports. Set it in Branding: PNG, JPG or WebP, converted to PNG when saved.">
            <Link to="/settings/branding" className="text-sm font-medium text-primary">Change the logo in Branding</Link>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ISO 9001 certification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>The certification body, the kind of audit coming up and its dates are kept in Certification.</span>
          <Link to="/settings/certification" className="font-medium text-primary">Open Certification settings</Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SharePoint and OneDrive</CardTitle>
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-done">
            <CircleCheckIcon className="size-4" /> Connected
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm leading-normal">
          <p>ThryveMS checks that document links still open, once an hour. It never opens or copies confidential files.</p>
          <p className="text-muted-foreground">Connected by Aaron Lim on 14 Jan 2026. Last check 22:41, 63 links fine.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={() => toast("Checking all document links")}>
            <RefreshCwIcon /> Check links now
          </Button>
          <Button variant="quiet" size="sm" onClick={() => toast("Opening Microsoft to reconnect")}>
            Reconnect
          </Button>
        </CardFooter>
      </Card>

      <div className="flex justify-end gap-2">
        {error && <span className="self-center text-[0.8125rem] font-medium text-overdue">{error}</span>}
        <Button
          onClick={() => {
            if (!f.name.trim()) return setError("Give the company a name to show in ThryveMS.")
            setError("")
            saveSettings("org", { ...f, name: f.name.trim() })
            toast("Organization profile saved", { description: "Reports, exports and the audit pack use it from now on." })
          }}
        >
          Save changes
        </Button>
      </div>
    </>
  )
}
