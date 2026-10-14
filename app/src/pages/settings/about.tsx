import * as React from "react"
import { Link } from "react-router-dom"
import { CheckIcon, ChevronRightIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { ORG } from "@/data/org"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyFacts } from "@/components/app/page"
import { SettingsHeader } from "./layout"

const VERSION = "2.4.1"
const BUILD = "2026.10.2"

function browserName() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Unknown browser"
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : ""
  return os ? `${b} on ${os}` : b
}

export default function About() {
  const { user, role, state } = useStore()
  const [copied, setCopied] = React.useState(false)
  const used = state.people.filter((p) => p.status === "Active").length

  const sys = [
    { k: "Version", v: `${VERSION} (build ${BUILD})` },
    { k: "Workspace", v: `${ORG.name}, ID ${ORG.workspaceId}` },
    { k: "Plan", v: `${ORG.plan}, ${used} of ${ORG.seats} seats` },
    { k: "Data stored in", v: "Singapore (Microsoft Azure, Southeast Asia)" },
    { k: "Documents", v: "Your SharePoint. iQMS keeps links only." },
    { k: "Signed in as", v: `${user.email}, with Microsoft 365` },
    { k: "Your role", v: `${role.name}, ${role.scope.toLowerCase()}` },
    { k: "Browser", v: browserName() },
    { k: "Time zone", v: Intl.DateTimeFormat().resolvedOptions().timeZone },
  ]

  async function copy() {
    const text = sys.map((s) => `${s.k}: ${s.v}`).join("\n")
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard can be blocked; the toast still confirms what to copy */
    }
    setCopied(true)
    toast("System information copied", { description: "Paste it into your support request." })
  }

  return (
    <>
      <SettingsHeader
        title="About iQMS"
        description="Version, system details and legal notices. Copy the system information when you contact support."
        actions={
          <Button onClick={copy}>
            {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy system information"}
          </Button>
        }
      />
      <Card>
        <div className="flex items-center gap-4 border-b border-rule-soft px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-md bg-foreground text-[13px] font-bold text-background">iQ</span>
          <span className="flex flex-col">
            <span className="text-base font-semibold">iQMS {VERSION}</span>
            <span className="text-[13px] text-muted-foreground">Released 6 October 2026. You’re on the latest version.</span>
          </span>
          <Badge tone="done" className="ml-auto">
            Up to date
          </Badge>
        </div>
        <CardContent className="py-1">
          <KeyFacts facts={sys} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <span className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full bg-done" /> All services are working
            </span>
            <span className="text-[13px] text-muted-foreground">Last incident: email notifications were delayed for 20 minutes on 2 October. Resolved.</span>
            <a href="#" className="text-[13px] font-medium text-primary">
              Open the status page
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <span>Email support@iqms.example or ask your administrator. Include the system information above.</span>
            <span className="text-[13px] text-muted-foreground">Monday to Friday, 8:00 to 18:00 (UTC+8)</span>
            <a href="mailto:support@iqms.example" className="text-[13px] font-medium text-primary">
              Open a support request
            </a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What’s new in 2.4</CardTitle>
        </CardHeader>
        <ul>
          {[
            ["6 Oct 2026", "Several people can now share one task, report or routing step."],
            ["22 Sep 2026", "Custom checklists: build your own audit checklist and save it as a template."],
            ["8 Sep 2026", "Tables keep 10 rows in view and let you pick 10, 50 or 100 rows per page."],
          ].map(([d, t], i) => (
            <li key={d} className={cn("grid grid-cols-[110px_minmax(0,1fr)] gap-4 px-5 py-3 text-sm", i > 0 && "border-t border-rule-soft")}>
              <span className="text-muted-foreground">{d}</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal</CardTitle>
        </CardHeader>
        <ul>
          {[
            ["Terms of Service", "Updated 1 September 2026", "#"],
            ["Privacy notice", "How your personal data is handled", "/settings/privacy"],
            ["Data processing agreement", "Signed by Arden & Co. on 14 January 2026", "#"],
            ["Subprocessors", "Companies that help us run iQMS", "#"],
            ["Open-source licences", "Software iQMS is built with", "#"],
          ].map(([n, d, to], i) => (
            <li key={n} className={cn(i > 0 && "border-t border-rule-soft")}>
              <Link to={to} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-hover">
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{n}</span>
                  <span className="text-xs text-muted-foreground">{d}</span>
                </span>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-[13px] text-muted-foreground">iQMS helps you run a quality management system. ISO 9001 certification is granted by your certification body, not by iQMS.</p>
    </>
  )
}
