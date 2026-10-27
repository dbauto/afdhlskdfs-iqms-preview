import * as React from "react"
import { useLocation } from "react-router-dom"
import { ImageIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { APP_VERSION, browserSummary, recentErrors } from "@/lib/diagnostics"
import { MAX_SCREENSHOTS, needsScreenshot, pastedImages, readScreenshot, screenshotProblem } from "@/lib/screenshots"
import { formatBytes } from "@/lib/uploads"
import type { SupportCategory, SupportImpact, SupportReport, SupportScreenshot, SupportState } from "@/data/types"
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
  const params = new URLSearchParams(search)
  const fromError = params.get("from") === "error"
  const errorRef = params.get("ref") ?? undefined
  const [category, setCategory] = React.useState<SupportCategory>("Something isn’t working")
  const [impact, setImpact] = React.useState<SupportImpact>(fromError ? "I can’t work" : "It slows me down")
  const [title, setTitle] = React.useState(fromError ? "A page stopped loading" : "")
  const [details, setDetails] = React.useState("")
  const [shots, setShots] = React.useState<SupportScreenshot[]>([])
  const [checked, setChecked] = React.useState(false)
  const [diag, setDiag] = React.useState(fromError)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [showDiag, setShowDiag] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const lastPage = React.useMemo(() => {
    try {
      return sessionStorage.getItem("iqms.lastPage") ?? ""
    } catch {
      return ""
    }
  }, [])
  const mine = state.supportReports.filter((r) => r.from === user.name)
  const seen = recentErrors()
  const required = needsScreenshot(category)

  async function addFiles(files: File[]) {
    let count = shots.length
    let problem = ""
    const added: SupportScreenshot[] = []
    for (const f of files) {
      problem = screenshotProblem(f, count) ?? ""
      if (problem) break
      try {
        added.push(await readScreenshot(f))
        count++
      } catch (e) {
        problem = (e as Error).message
        break
      }
    }
    if (added.length) {
      setShots((s) => [...s, ...added])
      setChecked(false)
    }
    setErrors((x) => ({ ...x, shots: problem }))
  }

  function send() {
    if (busy) return
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Say in a few words what’s wrong or what you need."
    if (!details.trim()) e.details = "Say what you did, what you expected and what happened instead."
    if (required && shots.length === 0) e.shots = "Add a screenshot of the problem. Press Print Screen or Windows+Shift+S, then paste it here."
    if (shots.length > 0 && !checked) e.checked = "Confirm you checked the screenshots before sending."
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
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
      attachments: shots.map((s) => s.name),
      screenshots: shots,
      errorRef,
      diagnostics: diag ? { app: APP_VERSION, browser: browserSummary(), time: new Date().toLocaleString("en-GB"), role: role.name, errors: seen.map((x) => `${x.ref}: ${x.message}`) } : undefined,
      state: "New",
      created: "Just now",
      updates: [{ when: "Just now", who: user.name, text: shots.length ? `Report sent with ${shots.length} screenshot${shots.length > 1 ? "s" : ""}.` : "Report sent." }],
    }
    add("supportReports", report)
    toast(`Report ${id} sent`, { description: `We’ll reply to ${user.email}. You can follow it below.` })
    setTitle("")
    setDetails("")
    setShots([])
    setChecked(false)
    setBusy(false)
  }

  return (
    <>
      <SettingsHeader title="Contact support" description="Tell the ThryveMS team about a problem, a question or an idea. Reports go to the ThryveMS support team, not to your company’s admin." />
      {fromError && (
        <div className="rounded-md border border-soon-border bg-soon-tint px-4 py-3 text-sm">
          A page stopped working{errorRef ? <> (reference <strong className="font-semibold">{errorRef}</strong>)</> : null}. Add a screenshot of what you saw and say what you were doing. The error is included in the technical details below.
        </div>
      )}
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
          <Field label="What happened" htmlFor="sp-det" error={errors.details} help="What you did, what you expected, and what happened instead. Don’t include passwords.">
            <Textarea id="sp-det" value={details} onChange={(e) => setDetails(e.target.value)} className="min-h-28" aria-invalid={!!errors.details} />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium" id="sp-shots-label">
              Screenshots{required ? "" : " (optional)"}
            </span>
            <div
              role="group"
              aria-labelledby="sp-shots-label"
              aria-describedby="sp-shots-help"
              tabIndex={0}
              onPaste={(e) => {
                const files = pastedImages(e)
                if (files.length) {
                  e.preventDefault()
                  void addFiles(files)
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                void addFiles(Array.from(e.dataTransfer.files))
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                errors.shots ? "border-destructive" : dragging ? "border-primary bg-highlight" : "border-input bg-hover"
              )}
            >
              <ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm">
                Paste a screenshot here (Ctrl+V), drop it, or{" "}
                <button type="button" onClick={() => fileInput.current?.click()} className="cursor-pointer font-medium text-primary hover:underline">
                  choose a file
                </button>
              </span>
              <span id="sp-shots-help" className="text-[0.8125rem] text-muted-foreground">
                PNG, JPG or WebP, up to 5 MB each, up to {MAX_SCREENSHOTS}. On Windows press Windows+Shift+S; on a Mac press Shift+Command+4.
              </span>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose screenshot files"
                onChange={(e) => {
                  void addFiles(Array.from(e.target.files ?? []))
                  e.target.value = ""
                }}
              />
            </div>
            {errors.shots && <span className="text-[0.8125rem] text-destructive">{errors.shots}</span>}
            {shots.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-3">
                {shots.map((s, i) => (
                  <li key={i} className="flex flex-col overflow-hidden rounded-md border">
                    <img src={s.data} alt={`Screenshot ${i + 1}, ${s.name}`} className="h-28 w-full bg-background object-contain" />
                    <span className="flex items-center gap-2 border-t border-rule-soft px-2.5 py-1.5">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[0.8125rem]">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.width}×{s.height}, {formatBytes(s.bytes)}
                        </span>
                      </span>
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${s.name}`} onClick={() => setShots((all) => all.filter((_, k) => k !== i))}>
                        <XIcon />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {shots.length > 0 && (
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-soon-border bg-soon-tint p-3">
                <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} className="mt-0.5" aria-invalid={!!errors.checked} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">I checked my screenshots</span>
                  <span className="text-[0.8125rem]">They don’t show passwords, and any confidential records or other people’s personal details are cropped out. The ThryveMS support team and our AI support assistant may see them.</span>
                  {errors.checked && <span className="text-[0.8125rem] text-destructive">{errors.checked}</span>}
                </span>
              </label>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-md border p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={diag} onCheckedChange={(v) => setDiag(!!v)} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Include technical details</span>
                <span className="text-[0.8125rem] text-muted-foreground">App version, browser and screen, your role, the page you were on and recent error messages with their references. No record contents or form entries are sent.</span>
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
                <dd>{seen.length ? seen.map((x) => `${x.ref}: ${x.message}`).join("; ") : "None"}</dd>
              </dl>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[0.8125rem] text-muted-foreground">Sent to the ThryveMS support team. Reports and screenshots are kept for 12 months under our privacy notice.</span>
            <Button onClick={send} disabled={busy}>
              Send report
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your reports</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">{mine.length}</span>
        </CardHeader>
        {mine.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">You haven’t sent any reports. Reports you send show here with their progress.</p>
        ) : (
          <ul>
            {mine.map((r, i) => {
              const s = STATE_FOR_REPORTER[r.state]
              const last = r.updates.filter((u) => u.who !== "AI agent").slice(-1)[0]
              const n = r.screenshots?.length ?? 0
              return (
                <li key={r.id} className={cn("flex items-start gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.id}, {r.category.toLowerCase()}, sent {r.created}
                      {n ? `, ${n} screenshot${n > 1 ? "s" : ""}` : ""}
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
