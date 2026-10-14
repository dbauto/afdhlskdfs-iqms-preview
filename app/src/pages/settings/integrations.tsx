import * as React from "react"
import { FolderOpenIcon, MailIcon, MessagesSquareIcon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SettingRow } from "@/components/app/form"
import { SettingsHeader } from "./layout"

type Status = "Connected" | "Needs attention" | "Not connected"

function StatusBadge({ s }: { s: Status }) {
  return <Badge tone={s === "Connected" ? "done" : s === "Needs attention" ? "soon" : "draft"}>{s}</Badge>
}

/** The Microsoft logo as four squares, drawn so it works in light and dark. */
function MicrosoftMark() {
  return (
    <span className="grid size-5 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="bg-[#f25022]" />
      <span className="bg-[#7fba00]" />
      <span className="bg-[#00a4ef]" />
      <span className="bg-[#ffb900]" />
    </span>
  )
}

function IntegrationCard({
  icon,
  name,
  status,
  about,
  details,
  actions,
  children,
}: {
  icon: React.ReactNode
  name: string
  status: Status
  about: string
  details?: [string, string][]
  actions: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4 px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">{icon}</span>
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="text-[0.9375rem] font-semibold">{name}</span>
            <StatusBadge s={status} />
          </span>
          <span className="text-[0.8125rem] leading-normal text-muted-foreground">{about}</span>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {details && details.length > 0 && (
        <dl className="grid gap-x-6 gap-y-2 border-t border-rule-soft px-5 py-3 text-[0.8125rem] sm:grid-cols-3">
          {details.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </Card>
  )
}

export default function Integrations() {
  const [m365, setM365] = React.useState<Status>("Connected")
  const [mail, setMail] = React.useState<Status>("Connected")
  const [teams, setTeams] = React.useState<Status>("Not connected")
  const [sites, setSites] = React.useState(["Quality", "Engineering drawings"])
  const [site, setSite] = React.useState("")
  const [checkLinks, setCheckLinks] = React.useState(true)

  return (
    <>
      <SettingsHeader
        title="Integrations"
        description="The services iQMS works with. Files stay in your SharePoint or OneDrive; iQMS keeps the links, revisions and approvals."
      />

      <IntegrationCard
        icon={<MicrosoftMark />}
        name="Microsoft 365"
        status={m365}
        about="Sign-in with work accounts, and the people list for owners, reviewers and approvers."
        details={m365 === "Connected" ? [["Tenant", "arden.onmicrosoft.com"], ["Connected by", "Aaron Lim, 3 Mar 2026"], ["Last checked", "Today, 16:40"]] : undefined}
        actions={
          m365 === "Connected" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => toast("Microsoft 365 is working", { description: "Sign-in and the people list were checked just now." })}>
                <RefreshCwIcon /> Test
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setM365("Not connected"); toast("Microsoft 365 disconnected", { description: "People can still sign in with email and password if that is turned on." }) }}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => { setM365("Connected"); toast("Microsoft 365 connected") }}>
              Connect
            </Button>
          )
        }
      />

      <IntegrationCard
        icon={<FolderOpenIcon className="size-5 text-muted-foreground" />}
        name="SharePoint and OneDrive"
        status={m365 === "Connected" ? "Connected" : "Needs attention"}
        about={m365 === "Connected" ? "Where your documents and evidence files live. Links to these sites are checked and previewed." : "Connect Microsoft 365 first. Links to files can’t be checked until then."}
        actions={null}
      >
        <SettingRow first title="Sites iQMS can link to" hint="Links to other sites are refused, so files aren’t kept somewhere uncontrolled.">
          <div className="flex flex-col items-end gap-2">
            <ul className="flex flex-wrap justify-end gap-1.5">
              {sites.map((s) => (
                <li key={s} className="inline-flex h-7 items-center gap-1 rounded-full border bg-card pl-2.5 pr-1 text-[0.8125rem]">
                  {s}
                  <button type="button" onClick={() => setSites(sites.filter((x) => x !== s))} className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={`Remove ${s}`}>
                    <XIcon className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input value={site} onChange={(e) => setSite(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && site.trim()) { setSites([...sites, site.trim()]); setSite("") } }} placeholder="Site name" className="h-9 w-44" aria-label="Add a site" />
              <Button variant="outline" size="sm" className="h-9" onClick={() => { if (site.trim()) { setSites([...sites, site.trim()]); setSite("") } }}>
                <PlusIcon /> Add
              </Button>
            </div>
          </div>
        </SettingRow>
        <SettingRow title="Check links every night" hint="Tells the owner when a linked file was moved, deleted or its sharing changed." htmlFor="int-links">
          <Switch id="int-links" checked={checkLinks} onCheckedChange={setCheckLinks} />
        </SettingRow>
      </IntegrationCard>

      <IntegrationCard
        icon={<MailIcon className="size-5 text-muted-foreground" />}
        name="Email"
        status={mail}
        about="Reminders, approvals and summaries are sent from your own mailbox, so people recognise them."
        details={mail === "Connected" ? [["Sends from", "qms@arden.example"], ["Sent this month", "1,284"], ["Last failure", "None"]] : undefined}
        actions={
          mail === "Connected" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => toast("Test email sent", { description: "Check aaron.lim@arden.example." })}>
                Send test email
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setMail("Not connected"); toast("Email disconnected", { description: "iQMS will send from noreply@iqms.ph instead." }) }}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => { setMail("Connected"); toast("Email connected") }}>
              Connect mailbox
            </Button>
          )
        }
      />

      <IntegrationCard
        icon={<MessagesSquareIcon className="size-5 text-muted-foreground" />}
        name="Microsoft Teams"
        status={teams}
        about="Post overdue items and approvals to a Teams channel, as well as by email."
        details={teams === "Connected" ? [["Channel", "Quality, General"], ["Posts", "Overdue items, approvals"], ["Connected by", "Aaron Lim, today"]] : undefined}
        actions={
          teams === "Connected" ? (
            <Button variant="ghost" size="sm" onClick={() => { setTeams("Not connected"); toast("Teams disconnected") }}>
              Disconnect
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => { setTeams("Connected"); toast("Teams connected", { description: "Posting to Quality, General." }) }}>
              Connect
            </Button>
          )
        }
      />
    </>
  )
}
