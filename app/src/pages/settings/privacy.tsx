import * as React from "react"
import { LockIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmRemove } from "@/components/app/record-actions"
import { KeyFacts } from "@/components/app/page"
import { SettingsHeader } from "./layout"

const KEPT = [
  ["Name, work email, job title", "To sign you in and show who owns, reviews and approves records", "While your account is active"],
  ["Role and process scope", "To decide what you can see and do", "While your account is active"],
  ["Activity log", "ISO 9001 traceability: who changed, approved or shared what", "3 years"],
  ["Sign-in history", "Security, such as spotting unusual sign-ins", "90 days"],
]

export default function Privacy() {
  const { can } = useStore()
  const [req, setReq] = React.useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const isAdmin = can("Settings", "Manage")

  const rights = [
    { id: "dl", name: "Download my data", help: "Your profile, roles and your activity, as a file. Ready within 24 hours.", action: "Request download", sent: "Preparing, we’ll email you" },
    { id: "fix", name: "Correct my data", help: "Your name and job title come from Microsoft 365. Ask us to correct anything else.", action: "Request a correction", sent: "Sent to the DPO" },
    { id: "del", name: "Delete my data", help: "Your account is removed. Quality records you approved stay as ISO evidence, with your name kept only where the record needs it.", action: "Request deletion", sent: "Sent to the DPO", danger: true },
  ]

  return (
    <>
      <SettingsHeader title="Privacy" description="What personal data iQMS keeps about you, why, and how to use your rights under the Data Privacy Act of 2012." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Privacy notice</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>How your company and iQMS collect, use, keep and protect your personal data.</p>
            <p className="text-[13px] text-muted-foreground">Last updated 1 September 2026</p>
            <a href="#" className="text-[13px] font-medium text-primary">
              Read the privacy notice
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data protection officers</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">Arden &amp; Co.</span>
              <span className="font-medium">Nina Flores</span>
              <a href="mailto:dpo@arden.example" className="text-[13px] text-primary">dpo@arden.example</a>
            </span>
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">iQMS, processing data for Arden &amp; Co.</span>
              <span className="font-medium">Data Protection Office</span>
              <a href="mailto:privacy@iqms.example" className="text-[13px] text-primary">privacy@iqms.example</a>
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <ul>
          {rights.map((r, i) => (
            <li key={r.id} className={cn("grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_220px]", i > 0 && "border-t border-rule-soft")}>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-[13px] leading-normal text-muted-foreground">{r.help}</span>
              </span>
              <span className="flex sm:justify-end">
                {req[r.id] ? (
                  <Badge tone="progress">{r.sent}</Badge>
                ) : (
                  <Button
                    variant={r.danger ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (r.danger) return setConfirmDelete(true)
                      setReq((x) => ({ ...x, [r.id]: true }))
                      toast(r.sent)
                    }}
                  >
                    {r.action}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>What iQMS keeps about you</CardTitle>
            <span className="text-[13px] text-muted-foreground">iQMS never opens or stores the content of your documents. It keeps links and descriptions only.</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <tr>
                <TableHead>Data</TableHead>
                <TableHead>Why</TableHead>
                <TableHead>Kept for</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {KEPT.map(([a, b, c]) => (
                <TableRow key={a}>
                  <TableCell className="font-medium">{a}</TableCell>
                  <TableCell className="text-muted-foreground">{b}</TableCell>
                  <TableCell className="whitespace-nowrap">{c}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace privacy settings</CardTitle>
          {!isAdmin && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LockIcon className="size-3.5" /> Only administrators can change these
            </span>
          )}
        </CardHeader>
        <CardContent className="py-1">
          <KeyFacts
            facts={[
              { k: "Data stored in", v: "Singapore (Microsoft Azure, Southeast Asia). This is outside the Philippines, so iQMS stays accountable for it under the Data Privacy Act and the data processing agreement." },
              { k: "Activity log kept", v: "3 years" },
              { k: "Processing agreement", v: <span>Signed 14 January 2026. <a href="#" className="font-medium text-primary">View</a></span> },
              { k: "Subprocessors", v: <span>Microsoft Azure (hosting), Cloudflare (security), an email delivery provider. <a href="#" className="font-medium text-primary">Full list</a></span> },
              { k: "Breach contact", v: "Nina Flores. iQMS tells her within 24 hours so the company can notify the National Privacy Commission within 72 hours." },
              { k: "Confidential records", v: "Links only. Descriptions must not include personal or confidential details." },
            ]}
          />
        </CardContent>
      </Card>
      <p className="text-[13px] text-muted-foreground">Hosting region, subprocessors and DPO details are placeholders. Replace them with your real ones before launch.</p>

      <ConfirmRemove
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        kind="delete"
        name="your data"
        onConfirm={() => setReq((x) => ({ ...x, del: true }))}
      />
    </>
  )
}
