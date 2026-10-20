import * as React from "react"
import { LaptopIcon, ShieldCheckIcon, SmartphoneIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { Avatar } from "@/components/ui/avatar"
import { PHOTO_TYPES, reencodePhoto } from "@/lib/photo"
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
  const { user, update, rename } = useStore()
  const photo = user.photo ?? { source: "microsoft" as const }
  const fileRef = React.useRef<HTMLInputElement>(null)
  const setPhoto = (p: NonNullable<typeof user.photo>, message: string) => {
    update("people", user.id, { photo: p })
    toast(message)
  }
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
            <Avatar name={name || user.name} src={photo.source === "upload" ? photo.url : undefined} size={56} tone="accent" />
            <div className="flex flex-col">
              <span className="text-[0.9375rem] font-semibold">{name || user.name}</span>
              <span className="text-[0.8125rem] text-muted-foreground">{user.email}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2" role="group" aria-labelledby="pf-photo-label">
            <span id="pf-photo-label" className="text-sm font-medium">
              Profile photo
            </span>
            <span className="text-[0.8125rem] text-muted-foreground">
              {photo.source === "upload"
                ? "Your own photo. Others see it next to your name."
                : photo.source === "microsoft"
                  ? "Your Microsoft 365 photo, refreshed each time you sign in. In this preview Microsoft photos can’t be fetched, so your initials show."
                  : "No photo: your initials show."}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <UploadIcon /> {photo.source === "upload" ? "Upload a different photo" : "Upload a photo"}
              </Button>
              {photo.source !== "microsoft" && (
                <Button variant="outline" size="sm" onClick={() => setPhoto({ source: "microsoft" }, "Using your Microsoft 365 photo")}>
                  Use my Microsoft 365 photo
                </Button>
              )}
              {photo.source !== "none" && (
                <Button variant="ghost" size="sm" onClick={() => setPhoto({ source: "none" }, "Photo removed")}>
                  Remove photo
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={PHOTO_TYPES.join(",")}
              className="sr-only"
              aria-label="Choose a profile photo"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (!file) return
                try {
                  setPhoto({ source: "upload", url: await reencodePhoto(file) }, "Photo updated")
                } catch (err) {
                  toast.error((err as Error).message)
                }
              }}
            />
            <span className="text-xs text-muted-foreground">JPG, PNG or WebP up to 5 MB. ThryveMS crops it to a square and saves a small copy, not your file.</span>
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
                try {
                  rename("person", user.id, name)
                } catch (err) {
                  return toast((err as Error).message)
                }
                update("people", user.id, { title: title.trim() })
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
                  <span className="text-[0.8125rem] text-muted-foreground">
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
