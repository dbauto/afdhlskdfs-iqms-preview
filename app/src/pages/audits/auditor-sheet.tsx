import * as React from "react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { blockedReason } from "@/lib/auditors"
import type { Auditor, AuditorLevel } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { ChipChoice, Field, ProcessPicker } from "@/components/app/form"

export const LEVELS: { value: AuditorLevel; help: string }[] = [
  { value: "Lead auditor", help: "Runs audits, leads the team and signs the report" },
  { value: "Auditor", help: "Joins audits, fills in checklists and raises findings" },
  { value: "In training", help: "Observes and learns; can’t lead or sign, and always joins someone" },
]

const blank = (): Auditor => ({ id: `aud-${Date.now()}`, name: "", level: "Auditor", training: "", trainedOn: "", certificate: "", recheckBy: "", extraExclusions: [], status: "Active" })

export function AuditorSheet({ open, onOpenChange, auditor }: { open: boolean; onOpenChange: (v: boolean) => void; auditor?: Auditor }) {
  const { state, add, update } = useStore()
  const [a, setA] = React.useState<Auditor>(blank)
  const [who, setWho] = React.useState<"Someone in ThryveMS" | "Outside auditor">("Someone in ThryveMS")
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!open) return
    setA(auditor ?? blank())
    setWho(auditor?.external ? "Outside auditor" : "Someone in ThryveMS")
    setErrors({})
  }, [open, auditor])

  const set = (patch: Partial<Auditor>) => setA((x) => ({ ...x, ...patch }))
  const listed = new Set(state.auditors.filter((x) => x.id !== a.id).map((x) => x.name))
  const people = state.people.filter((p) => p.status !== "Deactivated" && !listed.has(p.name))
  const person = state.people.find((p) => p.name === a.name)
  const auto = state.processes.map((p) => ({ p: p.name, why: blockedReason({ ...a, extraExclusions: [] }, p.name, state.processes, state.people) })).filter((x) => x.why)

  function save() {
    const e: Record<string, string> = {}
    if (!a.name.trim()) e.name = who === "Outside auditor" ? "Enter their name." : "Choose a person."
    if (who === "Outside auditor" && !a.external?.email?.includes("@")) e.email = "Enter their email so they can be invited."
    if (!a.training.trim()) e.training = "Say what training makes them competent. Auditors are asked for this."
    setErrors(e)
    if (Object.keys(e).length) return
    const rec: Auditor = { ...a, name: a.name.trim(), external: who === "Outside auditor" ? a.external : undefined }
    if (auditor) {
      update("auditors", a.id, rec)
      toast(`${rec.name} saved`)
    } else {
      add("auditors", rec)
      toast(`${rec.name} added to the auditor list`, { description: who === "Outside auditor" ? "They get a guest invitation when first assigned to an audit." : "They can now be assigned to audits of other processes." })
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{auditor ? `Edit ${auditor.name}` : "Add auditor"}</SheetTitle>
          <SheetDescription>Anyone can be an auditor on top of their usual job. They only see the audits they’re assigned to, and never audit their own process.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {!auditor && (
            <Field label="Who">
              <ChipChoice label="Who" options={["Someone in ThryveMS", "Outside auditor"] as const} value={who} onChange={(v) => { setWho(v); set({ name: "", external: v === "Outside auditor" ? { organisation: "", email: "" } : undefined }) }} />
            </Field>
          )}
          {who === "Someone in ThryveMS" ? (
            <Field label="Person" htmlFor="au-person" error={errors.name} help={person ? `${person.title}. Their role stays the same.` : undefined}>
              <NativeSelect id="au-person" value={a.name} onChange={(e) => set({ name: e.target.value })} disabled={!!auditor} aria-invalid={!!errors.name}>
                <option value="">Choose a person</option>
                {people.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}, {p.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <>
              <Field label="Name" htmlFor="au-name" error={errors.name}>
                <Input id="au-name" value={a.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organisation" htmlFor="au-org">
                  <Input id="au-org" value={a.external?.organisation ?? ""} onChange={(e) => set({ external: { organisation: e.target.value, email: a.external?.email ?? "" } })} />
                </Field>
                <Field label="Email" htmlFor="au-email" error={errors.email}>
                  <Input id="au-email" type="email" value={a.external?.email ?? ""} onChange={(e) => set({ external: { organisation: a.external?.organisation ?? "", email: e.target.value } })} aria-invalid={!!errors.email} />
                </Field>
              </div>
            </>
          )}

          <Field label="Level">
            <RadioGroup value={a.level} onValueChange={(v) => set({ level: v as AuditorLevel })}>
              {LEVELS.map((l) => (
                <RadioCard key={l.value} value={l.value} title={l.value} help={l.help} />
              ))}
            </RadioGroup>
          </Field>

          <Field label="Training" htmlFor="au-training" error={errors.training} help="The course or experience that makes them competent. ISO 9001 clause 7.2.">
            <Input id="au-training" value={a.training} onChange={(e) => set({ training: e.target.value })} placeholder="ISO 9001:2026 internal auditor course, provider" aria-invalid={!!errors.training} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trained" htmlFor="au-on" optional>
              <Input id="au-on" value={a.trainedOn} onChange={(e) => set({ trainedOn: e.target.value })} placeholder="Mar 2026" />
            </Field>
            <Field label="Check competence again by" htmlFor="au-re" optional>
              <Input id="au-re" value={a.recheckBy} onChange={(e) => set({ recheckBy: e.target.value })} placeholder="Mar 2027" />
            </Field>
          </div>
          <Field label="Certificate" htmlFor="au-cert" optional help="A link to the certificate in SharePoint, kept as evidence of competence.">
            <Input id="au-cert" value={a.certificate ?? ""} onChange={(e) => set({ certificate: e.target.value })} placeholder="https://yourcompany.sharepoint.com/…" />
          </Field>

          <Field label="Can’t audit">
            <div className="flex flex-col gap-3">
              {auto.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Not independent, set automatically">
                  {auto.map((x) => (
                    <li key={x.p} className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-[0.8125rem]">
                      {x.p} <span className="text-muted-foreground">{x.why?.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[0.8125rem] text-muted-foreground">{a.name ? "They don’t own or work in any process." : "Set automatically from the processes they own or work in."}</p>
              )}
              <ProcessPicker label="Also not independent for" value={a.extraExclusions} onChange={(v) => set({ extraExclusions: v })} />
              <p className="text-[0.8125rem] text-muted-foreground">Add any other process they helped set up or work closely with.</p>
            </div>
          </Field>

          <label className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Available for audits</span>
              <span className="text-[0.8125rem] text-muted-foreground">Turn off while they’re on leave or their competence is being re-checked.</span>
            </span>
            <Switch checked={a.status === "Active"} onCheckedChange={(v) => set({ status: v ? "Active" : "Paused" })} />
          </label>

          {who === "Outside auditor" && <Alert tone="info">They get a guest account that only opens the audits they’re assigned to, and ends on a set date.</Alert>}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{auditor ? "Save changes" : "Add auditor"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
