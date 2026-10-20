import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Appearance as View } from "@/lib/theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsHeader } from "./layout"
import { PROCESS_LAYOUTS, type ProcessLayout } from "@/lib/settings"

const OPTIONS: { value: View; label: string; hint: string; icon: typeof SunIcon }[] = [
  { value: "Light", label: "Light", hint: "Dark text on a light page", icon: SunIcon },
  { value: "Dark", label: "Dark", hint: "Light text on a dark page, easier at night", icon: MoonIcon },
  { value: "Device", label: "Match my device", hint: "Follows your computer or phone setting", icon: MonitorIcon },
]

/** A small drawing of the page in light or dark. */
function ViewSwatch({ dark, half }: { dark?: boolean; half?: boolean }) {
  const page = (d: boolean) => (d ? "#0f141a" : "#f5f6f7")
  const card = (d: boolean) => (d ? "#171d25" : "#ffffff")
  const line = (d: boolean) => (d ? "#3a4553" : "#c3c9d1")
  const draw = (d: boolean) => (
    <span className="flex h-full flex-1 gap-1.5 p-2" style={{ background: page(d) }}>
      <span className="flex w-1/3 flex-col gap-1.5 rounded-[3px] p-1.5" style={{ background: card(d) }}>
        <span className="h-1.5 w-4/5 rounded-full" style={{ background: line(d) }} />
        <span className="h-1.5 w-3/5 rounded-full bg-primary" />
        <span className="h-1.5 w-4/5 rounded-full" style={{ background: line(d) }} />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 rounded-[3px] p-1.5" style={{ background: card(d) }}>
        <span className="h-1.5 w-1/2 rounded-full" style={{ background: line(d) }} />
        <span className="h-1.5 w-4/5 rounded-full" style={{ background: line(d) }} />
        <span className="mt-auto h-2.5 w-8 rounded-[3px] bg-primary" />
      </span>
    </span>
  )
  return (
    <span className="flex h-20 w-full overflow-hidden rounded-sm border" aria-hidden="true">
      {half ? (
        <>
          {draw(false)}
          {draw(true)}
        </>
      ) : (
        draw(!!dark)
      )}
    </span>
  )
}

/** A small drawing of each Processes page layout. */
function LayoutSwatch({ layout }: { layout: ProcessLayout }) {
  const card = "rounded-[3px] border bg-card"
  const line = "h-1.5 rounded-full bg-border"
  if (layout === "list")
    return (
      <span className="flex h-20 w-full flex-col gap-1.5 rounded-sm border bg-background p-2" aria-hidden="true">
        {[0, 1].map((g) => (
          <span key={g} className={cn(card, "flex flex-col gap-1 p-1.5")}>
            <span className={cn(line, "w-1/3 bg-muted-foreground/40")} />
            <span className={cn(line, "w-4/5")} />
          </span>
        ))}
      </span>
    )
  return (
    <span className="grid h-20 w-full grid-cols-3 gap-1.5 rounded-sm border bg-background p-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn(card, "flex flex-col overflow-hidden")}>
          {layout === "covers" ? <span className="h-5 bg-cover-blue" /> : <span className="m-1.5 mb-0 size-3 rounded-full bg-secondary" />}
          <span className="flex flex-1 flex-col gap-1 p-1.5">
            <span className={cn(line, "w-4/5")} />
            <span className={cn(line, "w-3/5")} />
            {layout === "actions" && <span className="mt-auto h-1.5 w-1/2 rounded-full bg-primary" />}
          </span>
        </span>
      ))}
    </span>
  )
}

export default function Appearance() {
  const { appearance, setAppearance, user, settings, saveSettings } = useStore()
  const layout = settings.processLayout[user.id] ?? "actions"
  return (
    <>
      <SettingsHeader title="Appearance" description="Choose light or dark view, and how the Processes page looks. These settings are yours only; your company’s logo and colours come from Branding." />
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>View</CardTitle>
            <CardDescription>Changes straight away.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="View" className="grid gap-3 sm:grid-cols-3">
            {OPTIONS.map((o) => {
              const on = appearance === o.value
              const Icon = o.icon
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setAppearance(o.value)}
                  className={cn("flex cursor-pointer flex-col gap-2.5 rounded-md border bg-card p-3 text-left transition-colors hover:bg-hover", on && "border-primary ring-1 ring-primary")}
                >
                  <ViewSwatch dark={o.value === "Dark"} half={o.value === "Device"} />
                  <span className="flex items-start gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold">{o.label}</span>
                      <span className="text-[0.8125rem] text-muted-foreground">{o.hint}</span>
                    </span>
                    {on && <CheckIcon className="size-4 text-primary" />}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Processes page</CardTitle>
            <CardDescription>How QMS › Processes shows your processes. Changes straight away.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Processes page layout" className="grid gap-3 sm:grid-cols-3">
            {PROCESS_LAYOUTS.map((o) => {
              const on = layout === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => saveSettings("processLayout", { ...settings.processLayout, [user.id]: o.value })}
                  className={cn("flex cursor-pointer flex-col gap-2.5 rounded-md border bg-card p-3 text-left transition-colors hover:bg-hover", on && "border-primary ring-1 ring-primary")}
                >
                  <LayoutSwatch layout={o.value} />
                  <span className="flex items-start gap-2">
                    <span className="flex flex-1 flex-col">
                      <span className="text-sm font-semibold">{o.label}</span>
                      <span className="text-[0.8125rem] text-muted-foreground">{o.hint}</span>
                    </span>
                    {on && <CheckIcon className="size-4 text-primary" />}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
