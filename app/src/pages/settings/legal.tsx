import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { ExternalLinkIcon, FilePenLineIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { LEGAL_DOCS, LEGAL_STATUS, type LegalDoc } from "@/legal"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Field } from "@/components/app/form"
import { Markdown } from "@/components/app/markdown"
import { SettingsHeader } from "./layout"

const ORG = "Arden & Co."

/** Who may accept for the company: Owners and Administrators (Settings › Manage). */
export function useAgreementsStatus() {
  const { state } = useStore()
  const needed = LEGAL_DOCS.filter((d) => d.acceptance === "company")
  const accepted = (d: LegalDoc) => state.agreements.find((a) => a.code === d.code && a.version === d.version)
  return { needed, accepted, pending: needed.filter((d) => !accepted(d)) }
}

export default function LegalSettings() {
  const { state, add, can, user, role } = useStore()
  const { accepted, pending } = useAgreementsStatus()
  const [reading, setReading] = React.useState<LegalDoc>()
  const [accepting, setAccepting] = React.useState<LegalDoc>()
  const [authorised, setAuthorised] = React.useState(false)
  const [signed, setSigned] = React.useState("")
  const [error, setError] = React.useState("")
  const mayAccept = can("Settings", "Manage")

  function accept() {
    if (!accepting) return
    if (!authorised) return setError(`Confirm you’re authorised to accept for ${ORG}.`)
    if (signed.trim().toLowerCase() !== user.name.toLowerCase()) return setError(`Type your full name, ${user.name}, to sign.`)
    add("agreements", { id: `ag-${Date.now()}`, code: accepting.code, version: accepting.version, acceptedBy: user.name, role: role.name, signedName: signed.trim(), at: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) })
    toast(`${accepting.title} accepted`, { description: "A copy is emailed to your administrators and kept with the agreement history." })
    setAccepting(undefined)
  }

  return (
    <>
      <SettingsHeader title="Legal and agreements" description={`The agreements between ${ORG} and ThryveMS, and the notices that apply to everyone who uses this workspace.`} />
      {LEGAL_STATUS === "draft" && (
        <Alert tone="info" title="Drafts for review">
          These documents are version 1.0 drafts. Review them with your legal adviser and Data Protection Officer, and send questions to legal@iqms.ph before accepting.
        </Alert>
      )}
      {mayAccept && pending.length > 0 && (
        <Alert tone="warning" title={`${pending.length} agreement${pending.length > 1 ? "s" : ""} to accept before go-live`}>
          An Owner or Administrator accepts the {pending.map((d) => d.title).join(" and the ")} for {ORG}{ORG.endsWith(".") ? "" : "."}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Agreements</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">Accepted once for the company</span>
        </CardHeader>
        <ul>
          {LEGAL_DOCS.filter((d) => d.acceptance === "company").map((d, i) => {
            const a = accepted(d)
            return (
              <li key={d.code} className={cn("grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]", i > 0 && "border-t border-rule-soft")}>
                <span className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{d.title}</span>
                    <span className="text-xs text-muted-foreground">Version {d.version}</span>
                    {a ? <Badge tone="done">Accepted</Badge> : <Badge tone="soon">Not accepted yet</Badge>}
                  </span>
                  <span className="text-[0.8125rem] text-muted-foreground">{d.summary}</span>
                  {a && (
                    <span className="text-xs text-muted-foreground">
                      Accepted by {a.acceptedBy}, {a.role}, on {a.at}
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap gap-2 sm:justify-end">
                  <Button size="sm" variant="outline" onClick={() => setReading(d)}>
                    Read
                  </Button>
                  {!a && mayAccept && (
                    <Button size="sm" onClick={() => { setAuthorised(false); setSigned(""); setError(""); setAccepting(d) }}>
                      <FilePenLineIcon /> Review and accept
                    </Button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        {!mayAccept && <p className="border-t px-5 py-3 text-[0.8125rem] text-muted-foreground">Only Owners and Administrators can accept agreements for the company.</p>}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notices and policies</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">Apply to everyone in the workspace</span>
        </CardHeader>
        <ul>
          {LEGAL_DOCS.filter((d) => d.acceptance === "none").map((d, i) => (
            <li key={d.code} className={cn("flex flex-wrap items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">{d.title}</span>
                <span className="text-[0.8125rem] text-muted-foreground">{d.summary}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setReading(d)}>
                Read
              </Button>
            </li>
          ))}
        </ul>
        <div className="border-t px-5 py-3 text-[0.8125rem]">
          <Link to="/legal" target="_blank" className="inline-flex items-center gap-1.5 font-medium text-primary">
            Open the public legal page <ExternalLinkIcon className="size-3.5" />
          </Link>
          <span className="text-muted-foreground"> to print or share a document.</span>
        </div>
      </Card>

      {state.agreements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Acceptance history</CardTitle>
          </CardHeader>
          <ul>
            {state.agreements.map((a, i) => (
              <li key={a.id} className={cn("flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[0.8125rem]", i > 0 && "border-t border-rule-soft")}>
                <span>
                  <b>{LEGAL_DOCS.find((d) => d.code === a.code)?.title}</b> version {a.version}
                </span>
                <span className="text-muted-foreground">
                  {a.acceptedBy} ({a.role}), signed as “{a.signedName}”, {a.at}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={!!reading} onOpenChange={(o) => !o && setReading(undefined)}>
        <SheetContent className="max-w-[760px]">
          <SheetHeader>
            <SheetTitle>{reading?.title}</SheetTitle>
            <SheetDescription>
              Version {reading?.version}. Effective: {reading?.effective}.{LEGAL_STATUS === "draft" ? " Draft for review." : ""}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>{reading && <Markdown source={reading.body} skipTitle />}</SheetBody>
          <SheetFooter>
            <Link to={`/legal/${reading?.code}`} target="_blank" className="mr-auto inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-primary">
              Open to print <ExternalLinkIcon className="size-3.5" />
            </Link>
            {reading && reading.acceptance === "company" && !accepted(reading) && mayAccept && (
              <Button onClick={() => { const d = reading; setReading(undefined); setAuthorised(false); setSigned(""); setError(""); setAccepting(d) }}>Accept</Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!accepting} onOpenChange={(o) => !o && setAccepting(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept the {accepting?.title}</DialogTitle>
            <DialogDescription>
              Version {accepting?.version}, for {ORG}. Your acceptance is recorded with your name, role, date and time, and has the same effect as a signature under the Electronic Commerce Act of 2000.
            </DialogDescription>
          </DialogHeader>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={authorised} onCheckedChange={(v) => setAuthorised(!!v)} className="mt-0.5" />
            <span>I have read the {accepting?.title} and I’m authorised to accept it on behalf of {ORG}.</span>
          </label>
          <Field label="Type your full name to sign" htmlFor="ag-name" error={error || undefined}>
            <Input id="ag-name" value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={user.name} aria-invalid={!!error} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAccepting(undefined)}>
              Cancel
            </Button>
            <Button onClick={accept}>Accept for {ORG}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
