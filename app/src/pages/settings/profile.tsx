import * as React from "react"
import { LaptopIcon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, SettingRow } from "@/components/app/form"
import { SettingsHeader } from "./layout"

const DEVICES = [
  { id: "d1", icon: LaptopIcon, name: "Edge on Windows", where: "Makati, Philippines", when: "This device, now" },
  { id: "d2", icon: SmartphoneIcon, name: "Safari on iPhone", where: "Makati, Philippines", when: "2 hours ago" },
  { id: "d3", icon: LaptopIcon, name: "Chrome on Windows", where: "Laguna, Philippines", when: "3 days ago" },
]

export default function Profile() {
  const { user, update } = useStore()
  const [name, setName] = React.useState(user.name)
  const [title, setTitle] = React.useState(user.title)
  const [phone, setPhone] = React.useState("")
  const [twoStep, setTwoStep] = React.useState(true)
  const [devices, setDevices] = React.useState(DEVICES)
  const [pw, setPw] = React.useState(false)
  const [pwForm, setPwForm] = React.useState({ now: "", next: "", again: "" })
  const [pwError, setPwError] = React.useState("")

  React.useEffect(() => {
    setName(user.name)
    setTitle(user.title)
  }, [user])

  return (
    <>
      <SettingsHeader title="Profile and security" description="Your name and details as others see them, and how you sign in. These settings are yours only." />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Profile</CardTitle>
            <CardDescription>Shown on records you own, approve or comment on.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={name || user.name} size={56} tone="accent" />
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold">{name || user.name}</span>
              <span className="text-[13px] text-muted-foreground">{user.email}</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="pf-name">
              <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Job title" htmlFor="pf-title">
              <Input id="pf-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Work email" htmlFor="pf-email" help="Comes from your Microsoft 365 account. Ask your administrator to change it.">
              <Input id="pf-email" value={user.email} readOnly className="text-muted-foreground" />
            </Field>
            <Field label="Mobile number" htmlFor="pf-phone" optional help="Only used for sign-in codes if you choose text messages.">
              <Input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" inputMode="tel" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!name.trim()}
              onClick={() => {
                update("people", user.id, { name: name.trim(), title: title.trim() })
                toast("Profile saved")
              }}
            >
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signing in</CardTitle>
        </CardHeader>
        <SettingRow first title="Microsoft 365" hint={`You can sign in with ${user.email}. Documents open in SharePoint with the same account.`}>
          <Badge tone="done">Connected</Badge>
        </SettingRow>
        <SettingRow title="Password" hint="For signing in with email and password. Last changed 4 months ago.">
          <Button variant="outline" onClick={() => { setPwForm({ now: "", next: "", again: "" }); setPwError(""); setPw(true) }}>
            Change password
          </Button>
        </SettingRow>
        <SettingRow
          title={
            <span className="inline-flex items-center gap-2">
              Two-step sign-in {twoStep && <ShieldCheckIcon className="size-4 text-done" />}
            </span>
          }
          hint={twoStep ? "On. After your password, you confirm with the Microsoft Authenticator app." : "Off. Anyone with your password can sign in. Your administrator may require it."}
        >
          <Button
            variant={twoStep ? "outline" : "default"}
            onClick={() => {
              setTwoStep(!twoStep)
              toast(twoStep ? "Two-step sign-in turned off" : "Two-step sign-in turned on")
            }}
          >
            {twoStep ? "Turn off" : "Set up"}
          </Button>
        </SettingRow>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Where you’re signed in</CardTitle>
            <CardDescription>If you don’t recognise a device, sign it out and change your password.</CardDescription>
          </div>
          {devices.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDevices((d) => d.slice(0, 1))
                toast("Signed out of all other devices")
              }}
            >
              Sign out everywhere else
            </Button>
          )}
        </CardHeader>
        <ul>
          {devices.map((d, i) => {
            const Icon = d.icon
            return (
              <li key={d.id} className={i > 0 ? "flex items-center gap-4 border-t border-rule-soft px-5 py-3" : "flex items-center gap-4 px-5 py-3"}>
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {d.where}, {d.when}
                  </span>
                </span>
                {i === 0 ? (
                  <Badge tone="progress">This device</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => { setDevices((x) => x.filter((y) => y.id !== d.id)); toast(`${d.name} signed out`) }}>
                    Sign out
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Dialog open={pw} onOpenChange={setPw}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>At least 12 characters. You stay signed in here; other devices are signed out.</DialogDescription>
          </DialogHeader>
          <Field label="Current password" htmlFor="pw-now">
            <Input id="pw-now" type="password" autoComplete="current-password" value={pwForm.now} onChange={(e) => setPwForm({ ...pwForm, now: e.target.value })} />
          </Field>
          <Field label="New password" htmlFor="pw-next" error={pwError}>
            <Input id="pw-next" type="password" autoComplete="new-password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} aria-invalid={!!pwError} />
          </Field>
          <Field label="New password again" htmlFor="pw-again">
            <Input id="pw-again" type="password" autoComplete="new-password" value={pwForm.again} onChange={(e) => setPwForm({ ...pwForm, again: e.target.value })} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPw(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pwForm.now) return setPwError("Enter your current password first.")
                if (pwForm.next.length < 12) return setPwError("Use at least 12 characters.")
                if (pwForm.next !== pwForm.again) return setPwError("The two new passwords don’t match.")
                setPw(false)
                setDevices((d) => d.slice(0, 1))
                toast("Password changed", { description: "Other devices were signed out." })
              }}
            >
              Change password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
