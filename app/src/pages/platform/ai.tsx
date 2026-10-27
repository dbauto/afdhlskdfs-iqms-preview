import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ASSISTANTS, MODELS, PESO_PER_USD, PROVIDERS, RATE_NOTE, peso, tokens, type AiProvider, type Assistant, type Effort, type ProviderKey } from "@/data/platform"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { Switch } from "@/components/ui/switch"
import { setAiSupportOn, useAiSupportOn } from "@/lib/ai-support"
import { useConsole } from "@/lib/console-store"
import { usePlatformAccess } from "@/lib/platform-access"
import { PlatformHeader } from "./shell"

const EFFORTS: Effort[] = ["Low", "Medium", "High"]

function ProviderRow({ p, onSave, first }: { p: ProviderKey; onSave: (p: ProviderKey) => void; first: boolean }) {
  const [key, setKey] = React.useState("")
  const [editing, setEditing] = React.useState(!p.last4)
  const [error, setError] = React.useState("")
  const save = () => {
    const k = key.trim()
    if (k.length < 20) return setError("Paste the whole key from the provider’s console. It’s usually more than 40 characters.")
    onSave({ ...p, last4: k.slice(-4), tested: "Just now" })
    setKey("")
    setError("")
    setEditing(false)
    toast(`${p.provider} key saved`, { description: "Stored in the secret vault. Only the last four characters are shown from now on." })
  }
  return (
    <div className={cn("grid items-center gap-3 px-5 py-3.5 md:grid-cols-[12rem_minmax(0,1fr)_auto]", !first && "border-t border-rule-soft")}>
      <span className="font-semibold">{p.provider}</span>
      {editing ? (
        <Field label="API key" htmlFor={`key-${p.provider}`} error={error}>
          <Input id={`key-${p.provider}`} type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste key" aria-invalid={!!error} />
        </Field>
      ) : (
        <span className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[0.8125rem] text-muted-foreground">••••••••••••{p.last4}</span>
          <Badge tone="done">Connected · tested {p.tested}</Badge>
        </span>
      )}
      <span className="flex gap-2 md:justify-end">
        {editing ? (
          <>
            {p.last4 && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={save}>
              {p.last4 ? "Save new key" : "Connect"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => toast(`${p.provider} answered`, { description: "The key works. No data was sent." })}>
              Test
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Replace key
            </Button>
          </>
        )}
      </span>
    </div>
  )
}

function SupportOnOff() {
  const on = useAiSupportOn()
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] font-medium">
      <Switch checked={on} onCheckedChange={(v) => { setAiSupportOn(v); toast(v ? "AI support turned on" : "AI support turned off") }} aria-label="AI support on or off" />
      {on ? "On" : "Off"}
    </label>
  )
}

function UsageBars({ daily }: { daily: number[] }) {
  const max = Math.max(...daily, 1)
  return (
    <div className="flex h-14 items-end gap-1" aria-hidden="true">
      {daily.map((d, i) => (
        <div key={i} className="min-w-0 flex-1 rounded-t-[2px] bg-info-border" style={{ height: `${Math.max(4, (d / max) * 100)}%` }} />
      ))}
    </div>
  )
}

function AssistantCard({ a, connected, onChange }: { a: Assistant; connected: AiProvider[]; onChange: (a: Assistant) => void }) {
  const [newKnowledge, setNewKnowledge] = React.useState(false)
  const [kName, setKName] = React.useState("")
  const cost = a.usage.usd * PESO_PER_USD
  const pct = Math.min(100, Math.round((cost / a.budget) * 100))
  const models = connected.includes(a.provider) ? MODELS[a.provider] : MODELS.OpenAI
  return (
    <Card className="min-w-0">
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>{a.name}</CardTitle>
          <span className="text-xs text-muted-foreground">{a.runs}</span>
        </span>
        {a.id === "support" ? <SupportOnOff /> : <Badge tone="progress">{a.trigger}</Badge>}
      </CardHeader>
      <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
        <Field label="Provider" htmlFor={`${a.id}-prov`}>
          <NativeSelect id={`${a.id}-prov`} value={a.provider} onChange={(e) => { const provider = e.target.value as AiProvider; onChange({ ...a, provider, model: MODELS[provider][0] }) }}>
            {PROVIDERS.map((p) => (
              <option key={p.provider} value={p.provider} disabled={!connected.includes(p.provider)}>
                {p.provider}
                {connected.includes(p.provider) ? "" : " (not connected)"}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Model" htmlFor={`${a.id}-model`}>
          <NativeSelect id={`${a.id}-model`} value={a.model} onChange={(e) => onChange({ ...a, model: e.target.value })}>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium" id={`${a.id}-eff`}>
            Effort
          </span>
          <div role="radiogroup" aria-labelledby={`${a.id}-eff`} className="flex h-10 overflow-hidden rounded-sm border border-input">
            {EFFORTS.map((e, i) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={a.effort === e}
                onClick={() => onChange({ ...a, effort: e })}
                className={cn("flex-1 cursor-pointer text-[0.8125rem] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", i > 0 && "border-l border-input", a.effort === e ? "bg-accent font-semibold text-accent-foreground" : "bg-card hover:bg-hover")}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-5 pb-4">
        <Field label="System prompt" htmlFor={`${a.id}-prompt`} help="Saved as a new version when you save. You can compare and go back to an earlier version.">
          <Textarea id={`${a.id}-prompt`} value={a.prompt} onChange={(e) => onChange({ ...a, prompt: e.target.value })} className="min-h-36" />
        </Field>
        <Field label="Monthly budget (₱)" htmlFor={`${a.id}-budget`} help="The assistant pauses and you’re notified when it’s reached.">
          <Input id={`${a.id}-budget`} type="number" min={0} step={500} value={a.budget} onChange={(e) => onChange({ ...a, budget: Number(e.target.value) || 0 })} className="max-w-48" />
        </Field>
      </div>
      <div className="flex flex-col gap-1 border-t border-rule-soft px-5 py-3">
        <span className="flex items-center justify-between">
          <span className="text-[0.8125rem] font-semibold">Knowledge</span>
          <Button variant="outline" size="sm" onClick={() => setNewKnowledge(true)}>
            Add knowledge
          </Button>
        </span>
        <ul>
          {a.knowledge.map((k, i) => (
            <li key={k.name} className="flex items-center justify-between gap-3 border-t border-rule-soft py-2 text-[0.8125rem] first:border-t-0">
              <span>{k.name}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                {k.meta}
                <Button variant="ghost" size="sm" aria-label={`Remove ${k.name}`} onClick={() => onChange({ ...a, knowledge: a.knowledge.filter((_, x) => x !== i) })}>
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3 border-t border-rule-soft px-5 py-4">
        <span className="text-[0.8125rem] font-semibold">Usage this month</span>
        <div className="grid grid-cols-3 gap-3">
          <span className="flex flex-col">
            <span className="text-[1.375rem] font-semibold tracking-[-0.02em]">{tokens(a.usage.tokensIn + a.usage.tokensOut)}</span>
            <span className="text-xs text-muted-foreground">
              tokens · {tokens(a.usage.tokensIn)} in, {tokens(a.usage.tokensOut)} out
            </span>
          </span>
          <span className="flex flex-col">
            <span className="text-[1.375rem] font-semibold tracking-[-0.02em]">{peso(cost)}</span>
            <span className="text-xs text-muted-foreground">US${a.usage.usd.toFixed(2)}</span>
          </span>
          <span className="flex flex-col">
            <span className="text-[1.375rem] font-semibold tracking-[-0.02em]">{a.usage.units ? peso(cost / a.usage.units) : "No data"}</span>
            <span className="text-xs text-muted-foreground">
              per {a.usage.unitLabel} ({a.usage.units} {a.usage.unitLabel}s)
            </span>
          </span>
        </div>
        <span className="flex flex-col gap-1">
          <span className="h-1.5 rounded-full bg-secondary" role="progressbar" aria-label={`${a.name} budget used`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <span className={cn("block h-1.5 rounded-full", pct >= 90 ? "bg-overdue" : pct >= 70 ? "bg-soon-bar" : "bg-primary")} style={{ width: `${pct}%` }} />
          </span>
          <span className="text-xs text-muted-foreground">
            {peso(cost)} of {peso(a.budget)} monthly budget
          </span>
        </span>
        <UsageBars daily={a.usage.daily} />
      </div>
      <Dialog open={newKnowledge} onOpenChange={setNewKnowledge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add knowledge to {a.name}</DialogTitle>
            <DialogDescription>A guide, a list of known errors or a policy. Don’t add client records: assistants only work from ThryveMS’s own material.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor={`${a.id}-kname`}>
            <Input id={`${a.id}-kname`} value={kName} onChange={(e) => setKName(e.target.value)} placeholder="Release notes 2026.10" />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewKnowledge(false)}>
              Cancel
            </Button>
            <Button
              disabled={!kName.trim()}
              onClick={() => {
                onChange({ ...a, knowledge: [...a.knowledge, { name: kName.trim(), meta: "Added just now" }] })
                setKName("")
                setNewKnowledge(false)
              }}
            >
              Add knowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default function AiAssistants() {
  const c = useConsole()
  const { me } = usePlatformAccess()
  const [providers, setProviders] = React.useState(PROVIDERS)
  const [assistants, setAssistants] = React.useState(ASSISTANTS)
  const [dirty, setDirty] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const connected = providers.filter((p) => p.last4).map((p) => p.provider)
  return (
    <>
      <PlatformHeader
        title="AI assistants"
        description="Connect providers, then set each assistant’s instructions, knowledge, model and effort. Changes are logged and need a second platform admin to approve."
        actions={
          <Button
            disabled={!dirty || busy}
            onClick={() => {
              setBusy(true)
              setDirty(false)
              c.request(me, { kind: "AI settings", title: "AI assistant settings change", detail: assistants.map((a) => `${a.name}: ${a.model}, ${a.effort.toLowerCase()} effort, budget ₱${a.budget.toLocaleString("en-PH")}`).join(" · "), second: true })
              toast("Changes sent for approval", { description: "A second platform admin approves in Approvals before the new settings are used." })
              setBusy(false)
            }}
          >
            Save changes
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Providers and API keys</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">A key is shown once when you paste it, then kept in the secret vault. It can be replaced, never viewed.</span>
        </CardHeader>
        {providers.map((p, i) => (
          <ProviderRow key={p.provider} p={p} first={i === 0} onSave={(n) => { setProviders((all) => all.map((x) => (x.provider === n.provider ? n : x))); c.log(me, "saved a new API key for", n.provider, "AI") }} />
        ))}
        <p className="border-t border-rule-soft px-5 py-3 text-[0.8125rem] text-muted-foreground">
          Pesos use the BSP reference rate of the day the tokens were used ({RATE_NOTE}: ₱{PESO_PER_USD.toFixed(2)} per US$1). The provider’s US$ invoice stays the record for your accountant.
        </p>
      </Card>
      <div className="grid gap-4 2xl:grid-cols-2">
        {assistants.map((a) => (
          <AssistantCard
            key={a.id}
            a={a}
            connected={connected}
            onChange={(n) => {
              setAssistants((all) => all.map((x) => (x.id === n.id ? n : x)))
              setDirty(true)
            }}
          />
        ))}
      </div>
      <Alert tone="info" title="Limits that always apply">
        Assistants see code, error details, screenshots a person has cleared and synthetic data. They never read client records from the database. Every answer is saved with its model, prompt version, tokens and cost, and a person sends every reply or confirms every finding.
      </Alert>
    </>
  )
}
