import * as React from "react"
import { CheckIcon, ImageUpIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ORG } from "@/data/org"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { applyTheme, BRAND_PRESETS, brandCheck, DEFAULT_BRAND, isHex, mix, type Brand, type SidebarStyle } from "@/lib/theme"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"

const MAX_LOGO_KB = 500

const SIDEBARS: { value: SidebarStyle; label: string; hint: string }[] = [
  { value: "Light", label: "Light", hint: "Plain, like the page" },
  { value: "Tinted", label: "Tinted", hint: "A soft wash of your colour" },
  { value: "Brand", label: "Brand", hint: "Filled with your colour" },
]

/** A small drawing of the sidebar style, coloured with the chosen brand colour. */
function SidebarSwatch({ style, color }: { style: SidebarStyle; color: string }) {
  const c = isHex(color) ? color : DEFAULT_BRAND.color
  const bg = style === "Brand" ? c : style === "Tinted" ? mix("#f5f6f7", c, 0.08) : "#ffffff"
  const line = style === "Brand" ? "rgba(255,255,255,.55)" : "#c3c9d1"
  const active = style === "Brand" ? "rgba(255,255,255,.22)" : mix("#ffffff", c, style === "Tinted" ? 0.2 : 0.12)
  return (
    <span className="flex h-20 w-full overflow-hidden rounded-sm border bg-[#f5f6f7]" aria-hidden="true">
      <span className="flex w-[38%] flex-col gap-1.5 border-r p-2" style={{ background: bg }}>
        <span className="mb-1 size-3 rounded-[3px]" style={{ background: style === "Brand" ? "#fff" : "#18202b" }} />
        <span className="h-1.5 w-4/5 rounded-full" style={{ background: line }} />
        <span className="flex h-3 items-center rounded-[3px] px-1" style={{ background: active }}>
          <span className="h-1.5 w-3/5 rounded-full" style={{ background: style === "Brand" ? "#fff" : "#18202b" }} />
        </span>
        <span className="h-1.5 w-3/5 rounded-full" style={{ background: line }} />
        <span className="h-1.5 w-4/5 rounded-full" style={{ background: line }} />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-2">
        <span className="h-1.5 w-1/2 rounded-full bg-[#c3c9d1]" />
        <span className="h-6 rounded-[3px] border bg-white" />
        <span className="h-2.5 w-8 rounded-[3px]" style={{ background: c }} />
      </span>
    </span>
  )
}

/** One image upload: preview on the surface it will sit on, upload or replace, remove, and a plain-language error. */
function LogoSlot({ id, title, hint, surface, square = false, value, onChange }: { id: string; title: string; hint: string; surface: "light" | "dark"; square?: boolean; value?: string; onChange: (v?: string) => void }) {
  const [error, setError] = React.useState("")
  const file = React.useRef<HTMLInputElement>(null)
  function pick(f?: File) {
    setError("")
    if (!f) return
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return setError("Use a PNG, JPG or WebP image. SVG isn’t accepted because it can contain scripts.")
    if (f.size > MAX_LOGO_KB * 1024) return setError(`The image must be ${MAX_LOGO_KB} KB or smaller. This one is ${Math.round(f.size / 1024)} KB.`)
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      if (!square) return onChange(url)
      const img = new Image()
      img.onload = () => {
        if (img.naturalWidth !== img.naturalHeight) return setError(`The browser icon must be square. This one is ${img.naturalWidth} by ${img.naturalHeight} pixels.`)
        if (img.naturalWidth < 32) return setError("The browser icon must be at least 32 by 32 pixels.")
        onChange(url)
      }
      img.onerror = () => setError("This image couldn’t be read. Try saving it again as PNG.")
      img.src = url
    }
    reader.readAsDataURL(f)
  }
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <span className="text-sm font-semibold">{title}</span>
      <span
        className={cn("flex h-20 items-center justify-center rounded-sm border", surface === "dark" ? "border-transparent bg-[var(--console)]" : "bg-card")}
        aria-label={value ? `${title} preview` : `No ${title.toLowerCase()} yet`}
        role="img"
      >
        {value ? (
          <img src={value} alt="" className={cn("object-contain", square ? "size-10" : "h-10 max-w-[80%]")} />
        ) : (
          <span className={cn("text-[0.8125rem]", surface === "dark" ? "text-[var(--console-text)]" : "text-muted-foreground")}>ThryveMS default</span>
        )}
      </span>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => file.current?.click()} aria-describedby={`${id}-hint`}>
          <ImageUpIcon /> {value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)} aria-label={`Remove ${title.toLowerCase()}`}>
            <Trash2Icon /> Remove
          </Button>
        )}
      </div>
      <p id={`${id}-hint`} className={cn("text-[0.8125rem]", error ? "font-medium text-overdue" : "text-muted-foreground")} role={error ? "alert" : undefined}>
        {error || `${hint} PNG, JPG or WebP, up to ${MAX_LOGO_KB} KB; converted to PNG when saved.`}
      </p>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" data-testid={`${id}-input`} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = "" }} />
    </div>
  )
}

export default function Branding() {
  const { brand, setBrand, appearance } = useStore()
  const [draft, setDraft] = React.useState<Brand>(brand)
  const [hex, setHex] = React.useState(brand.color)
  const dirty = JSON.stringify(draft) !== JSON.stringify(brand)
  const check = brandCheck(hex)

  // Show changes across the whole app while editing; put the saved branding back when leaving unsaved.
  React.useEffect(() => {
    applyTheme(draft, appearance)
  }, [draft, appearance])
  const saved = React.useRef({ brand, appearance })
  saved.current = { brand, appearance }
  React.useEffect(() => () => applyTheme(saved.current.brand, saved.current.appearance), [])

  const set = (patch: Partial<Brand>) => setDraft((d) => ({ ...d, ...patch }))

  function pickColor(v: string) {
    setHex(v)
    if (isHex(v)) set({ color: v.toLowerCase() })
  }

  return (
    <>
      <SettingsHeader
        title="Branding"
        description={`How ThryveMS looks for everyone at ${ORG.name}: your logo, your colour for buttons, links and highlights, and the sidebar. Each person can still choose light or dark view in Appearance.`}
        actions={
          <Button variant="outline" onClick={() => { setDraft(DEFAULT_BRAND); setHex(DEFAULT_BRAND.color) }}>
            <RotateCcwIcon /> Use ThryveMS default
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Logo and browser icon</CardTitle>
            <CardDescription>Without a logo, the ThryveMS logo is shown. Once you add yours, it replaces the ThryveMS logo at the top of the sidebar for everyone in your company.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <LogoSlot
            id="logo-light"
            title="Logo for light backgrounds"
            hint="Used on a white or light sidebar. Dark lettering works best."
            surface="light"
            value={draft.logo}
            onChange={(v) => set({ logo: v })}
          />
          <LogoSlot
            id="logo-dark"
            title="Logo for dark backgrounds"
            hint="Used on a dark sidebar and in dark view. Light lettering works best. If you skip it, the light logo is used."
            surface="dark"
            value={draft.logoDark}
            onChange={(v) => set({ logoDark: v })}
          />
          <LogoSlot
            id="favicon"
            title="Browser icon"
            hint="Shown in the browser tab and the collapsed sidebar. A square image, at least 32 by 32 pixels."
            surface="light"
            square
            value={draft.favicon}
            onChange={(v) => set({ favicon: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Brand colour</CardTitle>
            <CardDescription>Used for buttons, links, selected items and progress. Status colours (done, due soon, overdue) stay the same so they always mean the same thing.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div role="radiogroup" aria-label="Preset colours" className="flex flex-wrap gap-2.5">
            {BRAND_PRESETS.map((p) => {
              const on = draft.color.toLowerCase() === p.color
              return (
                <button
                  key={p.color}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={p.name}
                  title={p.name}
                  onClick={() => pickColor(p.color)}
                  className={cn("flex size-10 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow", on && "ring-2 ring-foreground")}
                  style={{ background: p.color }}
                >
                  {on && <CheckIcon className="size-4 text-white" />}
                </button>
              )
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-[auto_200px_minmax(0,1fr)] sm:items-end">
            <Field label="Your colour" htmlFor="brand-picker">
              <input id="brand-picker" type="color" value={isHex(hex) ? hex : DEFAULT_BRAND.color} onChange={(e) => pickColor(e.target.value)} className="h-10 w-16 cursor-pointer rounded-sm border border-input bg-card p-1" />
            </Field>
            <Field label="Hex code" htmlFor="brand-hex">
              <Input id="brand-hex" value={hex} onChange={(e) => pickColor(e.target.value)} spellCheck={false} aria-invalid={!isHex(hex)} />
            </Field>
            <p className={cn("pb-2.5 text-[0.8125rem]", check.ok ? "text-muted-foreground" : "font-medium text-soon")}>{check.note}</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Preview</span>
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-4">
              <Button>Add document</Button>
              <Button variant="outline">Cancel</Button>
              <a href="#preview" onClick={(e) => e.preventDefault()} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                QMS-PRO-011
              </a>
              <Badge tone="progress">In review</Badge>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked /> Notify the owner
              </label>
              <span className="flex gap-0.5" aria-hidden="true">
                {[1, 1, 1, 0, 0].map((d, i) => (
                  <span key={i} className={cn("h-1 w-4 rounded-full", d ? "bg-primary" : "bg-border")} />
                ))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Sidebar</CardTitle>
            <CardDescription>How the menu on the left looks.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Sidebar style" className="grid gap-3 sm:grid-cols-3">
            {SIDEBARS.map((s) => {
              const on = draft.sidebar === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ sidebar: s.value })}
                  className={cn("flex cursor-pointer flex-col gap-2.5 rounded-md border bg-card p-3 text-left transition-colors hover:bg-hover", on && "border-primary ring-1 ring-primary")}
                >
                  <SidebarSwatch style={s.value} color={draft.color} />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="text-[0.8125rem] text-muted-foreground">{s.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
        <span className="mr-auto text-[0.8125rem] text-muted-foreground">{dirty ? "You’re seeing your changes across ThryveMS. They aren’t saved yet." : "Saved branding is shown."}</span>
        <Button variant="ghost" disabled={!dirty} onClick={() => { setDraft(brand); setHex(brand.color) }}>
          Discard changes
        </Button>
        <Button
          disabled={!dirty || !isHex(draft.color)}
          onClick={() => {
            setBrand(draft)
            toast("Branding saved", { description: `Everyone at ${ORG.name} sees it the next time a page opens.` })
          }}
        >
          Save branding
        </Button>
      </div>
    </>
  )
}
