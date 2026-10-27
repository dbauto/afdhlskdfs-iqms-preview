import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Appearance } from "@/lib/theme"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { KeyFacts } from "@/components/app/page"
import { PlatformHeader } from "./shell"

/** The signed-in platform admin's own settings, pinned at the bottom of the console menu like the client's Settings. */
export default function PlatformSettings() {
  const { appearance, setAppearance } = useStore()
  return (
    <>
      <PlatformHeader title="Settings" description="Your own account in the platform console. Console-wide rules, like who can approve deploys, are in Platform team." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
          </CardHeader>
          <KeyFacts
            className="px-5 py-1"
            facts={[
              { k: "Name", v: "Leo Navarro" },
              { k: "Role", v: "Platform admin" },
              { k: "Sign-in", v: "WorkOS with passkey, behind Cloudflare Access" },
              { k: "Second step", v: <Badge tone="done">Passkey set up</Badge> },
              { k: "Session", v: "Ends after 30 minutes idle or 8 hours" },
            ]}
          />
          <div className="border-t border-rule-soft px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => toast("Signed out on other devices")}>
              Sign out other devices
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Appearance and alerts</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4 px-5 py-4">
            <Field label="Appearance" htmlFor="ps-app">
              <NativeSelect id="ps-app" value={appearance} onChange={(e) => setAppearance(e.target.value as Appearance)}>
                <option value="Light">Light</option>
                <option value="Dark">Dark</option>
                <option value="Device">Same as my device</option>
              </NativeSelect>
            </Field>
            <p className="text-[0.8125rem] text-muted-foreground">Critical alerts (security, failed backups, audit-log breaks) always reach you by email and phone and can’t be turned off.</p>
          </div>
        </Card>
      </div>
    </>
  )
}
