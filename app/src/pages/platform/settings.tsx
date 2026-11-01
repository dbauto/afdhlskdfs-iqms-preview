import * as React from "react"
import { toast } from "sonner"

import { ALERT_EVENTS } from "@/data/platform"
import { Checkbox } from "@/components/ui/checkbox"

import { useStore } from "@/lib/store"
import type { Appearance } from "@/lib/theme"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { KeyFacts } from "@/components/app/page"
import { PlatformHeader } from "./shell"
import { usePlatformAccess } from "@/lib/platform-access"
import { ENVIRONMENTS, entraStatus, entraValidation, type EntraStatus } from "@/lib/identity-providers"

/**
 * Alerts to Facebook Messenger (ADR-039). Uses the Messenger Send API with a Page access token kept in the secret vault.
 * Messages carry reference numbers only, never client records or report text.
 */
function MessengerAlerts() {
  const [token, setToken] = React.useState("")
  const [last4, setLast4] = React.useState<string>()
  const [pageId, setPageId] = React.useState("")
  const [recipient, setRecipient] = React.useState("")
  const [events, setEvents] = React.useState(ALERT_EVENTS)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const connect = () => {
    const e: Record<string, string> = {}
    if (token.trim().length < 30) e.token = "Paste the whole Page access token from Meta for Developers › your app › Messenger › Settings."
    if (!/^\d{5,}$/.test(pageId.trim())) e.pageId = "Enter the Facebook Page ID, numbers only. It’s on the Page’s About › Page transparency."
    if (!/^\d{5,}$/.test(recipient.trim())) e.recipient = "Message your Page once from your Messenger, then paste the ID shown in the Page inbox webhook (numbers only)."
    setErrors(e)
    if (Object.keys(e).length) return
    setLast4(token.trim().slice(-4))
    setToken("")
    toast("Messenger connected", { description: "Token stored in the secret vault. Send a test message to check it." })
  }
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Alerts to Facebook Messenger</CardTitle>
          <span className="text-xs text-muted-foreground">Get a Messenger message from your ThryveMS Page when something breaks. Messages show reference numbers only, never client records.</span>
        </span>
        <Badge tone={last4 ? "done" : "draft"}>{last4 ? "Connected" : "Not connected"}</Badge>
      </CardHeader>
      <div className="grid gap-4 px-5 py-4 md:grid-cols-3">
        {last4 ? (
          <Field label="Page access token" htmlFor="ms-token-set">
            <span id="ms-token-set" className="flex h-10 items-center gap-3">
              <span className="font-mono text-[0.8125rem] text-muted-foreground">••••••••••••{last4}</span>
              <Button variant="outline" size="sm" onClick={() => setLast4(undefined)}>
                Replace token
              </Button>
            </span>
          </Field>
        ) : (
          <Field label="Page access token" htmlFor="ms-token" error={errors.token}>
            <Input id="ms-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token" aria-invalid={!!errors.token} />
          </Field>
        )}
        <Field label="Facebook Page ID" htmlFor="ms-page" error={errors.pageId}>
          <Input id="ms-page" inputMode="numeric" value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="104857362918274" aria-invalid={!!errors.pageId} />
        </Field>
        <Field label="Your Messenger ID for this Page" htmlFor="ms-psid" error={errors.recipient}>
          <Input id="ms-psid" inputMode="numeric" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="6283015749261840" aria-invalid={!!errors.recipient} />
        </Field>
      </div>
      <div className="flex flex-col gap-2 border-t border-rule-soft px-5 py-4">
        <span className="text-[0.8125rem] font-semibold">Send me a message for</span>
        {events.map((ev, i) => (
          <label key={ev.key} className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={ev.on} disabled={ev.critical} onCheckedChange={(v) => setEvents((all) => all.map((x, k) => (k === i ? { ...x, on: !!v } : x)))} className="mt-0.5" />
            <span className="flex flex-col">
              <span className="text-sm">
                {ev.label}
                {ev.critical ? " (always on)" : ""}
              </span>
              <span className="text-xs text-muted-foreground">{ev.help}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule-soft px-5 py-3">
        <span className="max-w-[640px] text-xs text-muted-foreground">
          Meta only lets a Page message you within 24 hours of your last message to it, unless the app is approved for a message tag. Message your Page once a day, or apply for the tag; email and phone alerts still go out either way.
        </span>
        <span className="flex gap-2">
          {last4 ? (
            <Button variant="outline" size="sm" onClick={() => toast("Test message sent to Messenger", { description: "“ThryveMS test: alerts are working. Ref ER-TEST01.”" })}>
              Send test message
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={connect}>
              Connect Messenger
            </Button>
          )}
        </span>
      </div>
    </Card>
  )
}

const ENTRA_TONE: Record<EntraStatus, "draft" | "overdue" | "done"> = { "Not configured": "draft", "Check failed": "overdue", Connected: "done" }

/**
 * Sign-in providers for the console and client workspaces (ADR-047). WorkOS is the working sign-in today.
 * Microsoft Entra ID is planned and shows only what the backend has validated; nothing is entered or stored here.
 */
function SignInProviders() {
  const envs = ENVIRONMENTS.map((e) => ({ env: e, status: entraStatus(entraValidation(e)) }))
  const overall: EntraStatus = envs.some((e) => e.status === "Connected") ? "Connected" : envs.some((e) => e.status === "Check failed") ? "Check failed" : "Not configured"
  return (
    <Card className="lg:col-span-2" aria-label="Sign-in providers">
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Sign-in providers</CardTitle>
          <span className="text-xs text-muted-foreground">How people sign in to ThryveMS. Keys and secrets stay in the server’s secret store and are never shown or saved in your browser.</span>
        </span>
      </CardHeader>
      <div className="grid lg:grid-cols-2">
        <section aria-label="WorkOS" className="flex flex-col border-b border-rule-soft lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
            <h3 className="text-[0.9375rem] font-semibold">WorkOS</h3>
            <Badge tone="done">Available</Badge>
          </div>
          <KeyFacts
            className="px-5 py-1"
            facts={[
              { k: "Used for", v: "Console sign-in with a passkey, and people without a Microsoft account" },
              { k: "Development", v: "The sign-in to use while Microsoft isn’t set up" },
              { k: "Identifies people by", v: "Their WorkOS user ID, never their email address" },
            ]}
          />
        </section>
        <section aria-label="Microsoft Entra ID" className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
            <h3 className="text-[0.9375rem] font-semibold">Microsoft Entra ID</h3>
            <Badge tone={ENTRA_TONE[overall]}>{overall}</Badge>
          </div>
          <p className="px-5 pt-1 text-[0.8125rem] text-muted-foreground">Microsoft sign-in can be set up later. Until the server has checked it, the Microsoft option stays off and nobody can sign in with it.</p>
          <KeyFacts
            className="px-5 py-1"
            facts={[
              { k: "App registration", v: "One multi-tenant app per environment, managed by the platform team" },
              { k: "Client tenants", v: "Each organisation’s allowed Microsoft tenants are set separately" },
              { k: "Accounts", v: "Never created or linked by matching email. Linking needs both sign-ins in one step." },
              ...envs.map((e) => ({ k: e.env, v: <Badge tone={ENTRA_TONE[e.status]}>{e.status}</Badge> })),
            ]}
          />
        </section>
      </div>
      <div className="border-t border-rule-soft px-5 py-3 text-xs text-muted-foreground">
        Shows Connected only after the server has checked the app registration, its signing keys and each redirect address. Microsoft 365 for documents is set up by each client in Settings › Integrations.
      </div>
    </Card>
  )
}

/** The signed-in platform admin's own settings, pinned at the bottom of the console menu like the client's Settings. */
export default function PlatformSettings() {
  const { appearance, setAppearance } = useStore()
  const { me } = usePlatformAccess()
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
              { k: "Name", v: me.name },
              { k: "Role", v: me.role },
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
        <SignInProviders />
        <MessengerAlerts />
      </div>
    </>
  )
}
