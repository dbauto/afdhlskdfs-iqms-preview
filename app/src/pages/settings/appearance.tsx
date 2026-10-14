import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Appearance as View } from "@/lib/theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsHeader } from "./layout"

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

export default function Appearance() {
  const { appearance, setAppearance } = useStore()
  return (
    <>
      <SettingsHeader title="Appearance" description="Choose light or dark view. This setting is yours only; your company’s logo and colours come from Branding." />
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
    </>
  )
}
