import * as React from "react"
import { useLocation } from "react-router-dom"
import { FileTextIcon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { APP_VERSION, browserSummary, recentErrors } from "@/lib/diagnostics"
import type { SupportCategory, SupportImpact, SupportReport, SupportState } from "@/data/types"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"

const CATEGORIES: SupportCategory[] = ["Something isn’t working", "Data looks wrong", "Access or sign-in", "Question", "Idea"]
const IMPACTS: SupportImpact[] = ["I can’t work", "It slows me down", "Minor"]

/** What the reporter sees. The AI agent and sandbox steps are internal, so they read as "We’re working on it". */
export const STATE_FOR_REPORTER: Record<SupportState, { label: string; tone: BadgeTone }> = {
  New: { label: "Sent", tone: "draft" },
  Investigating: { label: "We’re looking into it", tone: "progress" },
  "Fix in sandbox": { label: "Fix being tested", tone: "progress" },
  "Waiting for approval": { label: "Fix being tested", tone: "progress" },
  Deployed: { label: "Fixed", tone: "done" },
  Closed: { label: "Closed", tone: "done" },
}

export default function Support() {
  const { state, add, user, role } = useStore()
  const { search } = useLocation()
  const fromError = new URLSearchParams(search).get("from") === "error"
  const [category, setCategory] = React.useState<SupportCategory>(fromError ? "Something isn’t working" : "Something isn’t working")
  const [impact, setImpact] = React.useState<SupportImpact>(fromError ? "I can’t work" : "It slows me down")
  const [title, setTitle] = React.useState(fromError ? "A page stopped loading" : "")
  const [details, setDetails] = React.useState("")
  const [files, setFiles] = React.useState<string[]>([])
  const [diag, setDiag] = React.useState(true)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [showDiag, setShowDiag] = React.useState(false)
  const lastPage = React.useMemo(() => {
    try {
      return sessionStorage.getItem("iqms.lastPage") ?? ""
    } catch {
      return ""
    }
  }, [])
  const mine = state.supportReports.filter((r) => r.from === user.name)
  const seen = recentErrors()

  function send() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Say in a few words what’s wrong or what you need."
    if (!details.trim()) e.details = "Say what you did and what happened. Steps help us fix it faster."
    setErrors(e)
    if (Object.keys(e).length) return
    const id = nextId(state.supportReports.map((r) => r.id), "SR-", 4)
    const report: SupportReport = {
      id,
      source: "Person",
      org: "Arden & Co.",
      from: user.name,
      email: user.email,
      category,
      impact,
      title: title.trim(),
      details: details.trim(),
      page: lastPage || undefined,
      attachments: files,
      diagnostics: diag ? { app: APP_VERSION, browser: browserSummary(), time: new Date().toLocaleString("en-GB"), role: role.name, errors: seen.map((x) => x.message) } : undefined,
      state: "New",
      created: "Just now",
      updates: [{ when: "Just now", who: user.name, text: "Report sent." }],
    }
    add("supportReports", report)
    toast(`Report ${id} sent`, { description: `We’ll reply to ${user.email}. You can follow it below.` })
    setTitle("")
    setDetails("")
    setFiles([])
  }

  return (
    <>
      <SettingsHeader title="Contact support" description="Tell the iQMS team about a problem, a question or an idea. Reports go to the iQMS support team, not to your company’s admin." />
      {fromError && <div className="rounded-md border border-soon-border bg-soon-tint px-4 py-3 text-sm">Sorry, a page stopped working. The error is included in the technical details below, so you only need to say what you were doing.</div>}
      <Card>
        <CardHeader>
          <CardTitle>New report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What is it about" htmlFor="sp-cat">
              <NativeSelect id="sp-cat" value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="How much does it affect you" htmlFor="sp-imp">
              <NativeSelect id="sp-imp" value={impact} onChange={(e) => setImpact(e.target.value as SupportImpact)}>
                {IMPACTS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="In a few words" htmlFor="sp-title" error={errors.title}>
            <Input id="sp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Can’t upload the supplier evaluation file" aria-invalid={!!errors.title} />
          </Field>
          <Field label="What happened" htmlFor="sp-det" error={errors.details} help="What you did, what you expected, and what happened instead. Don’t include passwords or personal data you don’t need to.">
            <Textarea id="sp-det" value={details} onChange={(e) => setDetails(e.target.value)} className="min-h-28" aria-invalid={!!errors.details} />
          </Field>
          <Field label="Screenshots or files" optional>
            <div className="flex flex-col gap-2">
              {files.map((f) => (
                <span key={f} className="flex items-center gap-2 rounded-sm border px-3 py-2 text-[0.8125rem]">
                  <FileTextIcon className="size-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{f}</span>
                  <button type="button" onClick={() => setFiles(files.filter((x) => x !== f))} aria-label={`Remove ${f}`} className="cursor-pointer text-muted-foreground">
                    <XIcon className="size-3.5" />
                  </button>
                </span>
              ))}
              <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-input text-sm font-medium text-primary hover:bg-background">
                <UploadIcon className="size-4" /> Add screenshots
                <input type="file" multiple accept="image/*,.pdf" className="sr-only" onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [], (x: File) => x.name)]); e.target.value = "" }} />
              </label>
            </div>
          </Field>
          <div className="flex flex-col gap-2 rounded-md border p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={diag} onCheckedChange={(v) => setDiag(!!v)} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Include technical details</span>
                <span className="text-[0.8125rem] text-muted-foreground">App version, browser and screen, your role, the page you were on and recent error messages. No record contents or form entries are sent.</span>
              </span>
            </label>
            <button type="button" onClick={() => setShowDiag(!showDiag)} className="ml-7 cursor-pointer self-start text-[0.8125rem] font-medium text-primary hover:underline">
              {showDiag ? "Hide what’s included" : "See exactly what’s included"}
            </button>
            {showDiag && (
              <dl className="ml-7 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-sm bg-background p-3 text-xs">
                <dt className="text-muted-foreground">App</dt>
                <dd>{APP_VERSION}</dd>
                <dt className="text-muted-foreground">Browser</dt>
                <dd>{browserSummary()}</dd>
                <dt className="text-muted-foreground">Role</dt>
                <dd>{role.name}</dd>
                <dt className="text-muted-foreground">Page</dt>
                <dd>{lastPage || "This page"}</dd>
                <dt className="text-muted-foreground">Recent errors</dt>
                <dd>{seen.length ? seen.map((x) => x.message).join("; ") : "None"}</dd>
              </dl>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.8125rem] text-muted-foreground">Sent to the iQMS support team. Reports are kept for 12 months under our privacy notice.</span>
            <Button onClick={send}>Send report</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your reports</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">{mine.length}</span>
        </CardHeader>
        {mine.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">You haven’t sent any reports.</p>
        ) : (
          <ul>
            {mine.map((r, i) => {
              const s = STATE_FOR_REPORTER[r.state]
              const last = r.updates.filter((u) => u.who !== "AI agent").slice(-1)[0]
              return (
                <li key={r.id} className={cn("flex items-start gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.id}, {r.category.toLowerCase()}, sent {r.created}
                    </span>
                    {last && last.who !== r.from && <span className="text-[0.8125rem]">{last.text}</span>}
                  </span>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
