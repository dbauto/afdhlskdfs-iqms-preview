import * as React from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { ORG } from "@/data/org"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SettingRow } from "@/components/app/form"
import { SettingsHeader } from "./layout"

export default function Security() {
  const [ms, setMs] = React.useState(true)
  const [email, setEmail] = React.useState(true)
  const [twoStep, setTwoStep] = React.useState("Everyone")
  const [domains, setDomains] = React.useState(["arden.example"])
  const [domain, setDomain] = React.useState("")
  const [timeout, setTimeoutValue] = React.useState("8 hours")
  const [minLen, setMinLen] = React.useState("12")
  const [human, setHuman] = React.useState(true)
  const [approval, setApproval] = React.useState(true)
  const [lockout, setLockout] = React.useState("5")

  function addDomain() {
    const d = domain.trim().toLowerCase().replace(/^@/, "")
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) || domains.includes(d)) return
    setDomains([...domains, d])
    setDomain("")
  }

  return (
    <>
      <SettingsHeader
        title="Sign-in and security"
        description={`How people at ${ORG.name} sign in, and the rules that keep accounts safe. The server enforces these; they apply to everyone in your company.`}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Ways to sign in</CardTitle>
            <CardDescription>At least one must stay on.</CardDescription>
          </div>
        </CardHeader>
        <SettingRow first title="Microsoft 365" hint="Recommended. People use their work account, and leavers lose access when IT disables them in Microsoft 365." htmlFor="sec-ms">
          <Switch id="sec-ms" checked={ms} onCheckedChange={(v) => (v || email) && setMs(v)} disabled={ms && !email} />
        </SettingRow>
        <SettingRow title="Email and password" hint="For people without a Microsoft 365 account, such as guest auditors." htmlFor="sec-email">
          <Switch id="sec-email" checked={email} onCheckedChange={(v) => (v || ms) && setEmail(v)} disabled={email && !ms} />
        </SettingRow>
        <SettingRow title="Allowed email domains" hint="Only these addresses can request an account. Guests from other domains need an invitation.">
          <div className="flex flex-col items-end gap-2">
            <ul className="flex flex-wrap justify-end gap-1.5">
              {domains.map((d) => (
                <li key={d} className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pl-2.5 pr-1 text-[0.8125rem]">
                  @{d}
                  <button type="button" disabled={domains.length === 1} onClick={() => setDomains(domains.filter((x) => x !== d))} className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Remove ${d}`}>
                    <XIcon className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDomain()} placeholder="company.com.ph" className="h-9 w-48" aria-label="Add a domain" />
              <Button variant="outline" size="sm" className="h-9" onClick={addDomain}>
                <PlusIcon /> Add
              </Button>
            </div>
          </div>
        </SettingRow>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account safety</CardTitle>
        </CardHeader>
        <SettingRow first title="Require two-step sign-in" hint="A code from an authenticator app after the password. Microsoft 365 users follow their own company rules." htmlFor="sec-2s">
          <NativeSelect id="sec-2s" value={twoStep} onChange={(e) => setTwoStep(e.target.value)} className="w-48">
            <option>Everyone</option>
            <option>Administrators only</option>
            <option>No one</option>
          </NativeSelect>
        </SettingRow>
        <SettingRow title="Sign people out after" hint="Of no activity. Shorter is safer on shared computers on the shop floor." htmlFor="sec-to">
          <NativeSelect id="sec-to" value={timeout} onChange={(e) => setTimeoutValue(e.target.value)} className="w-48">
            <option>30 minutes</option>
            <option>2 hours</option>
            <option>8 hours</option>
            <option>7 days</option>
          </NativeSelect>
        </SettingRow>
        <SettingRow title="Shortest password" hint="For email and password sign-in." htmlFor="sec-len">
          <NativeSelect id="sec-len" value={minLen} onChange={(e) => setMinLen(e.target.value)} className="w-48">
            <option value="10">10 characters</option>
            <option value="12">12 characters</option>
            <option value="14">14 characters</option>
          </NativeSelect>
        </SettingRow>
        <SettingRow title="Lock an account after" hint="Wrong passwords in a row. It unlocks after 15 minutes, or an administrator can unlock it." htmlFor="sec-lock">
          <NativeSelect id="sec-lock" value={lockout} onChange={(e) => setLockout(e.target.value)} className="w-48">
            <option value="5">5 tries</option>
            <option value="10">10 tries</option>
          </NativeSelect>
        </SettingRow>
        <SettingRow title="Human check on the sign-in page" hint="Cloudflare checks the person is real before the password is tried." htmlFor="sec-human">
          <Switch id="sec-human" checked={human} onCheckedChange={setHuman} />
        </SettingRow>
        <SettingRow title="Administrator approves new accounts" hint="People who request access wait until an administrator approves them and picks their role." htmlFor="sec-appr">
          <Switch id="sec-appr" checked={approval} onCheckedChange={setApproval} />
        </SettingRow>
      </Card>

      {twoStep === "No one" && <Alert tone="warning" title="Two-step sign-in is off">Anyone with a password can open your QMS records. We recommend requiring it at least for administrators.</Alert>}

      <div className="flex justify-end">
        <Button onClick={() => toast("Security settings saved", { description: "They apply from each person’s next sign-in." })}>Save changes</Button>
      </div>
    </>
  )
}
