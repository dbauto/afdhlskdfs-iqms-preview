/**
 * White labelling and dark view.
 *
 * Branding is set once per company by a client admin (Settings › Branding).
 * Appearance (light, dark or match the device) is each person's own choice.
 * Everything here works by setting CSS variables on <html>, so every page
 * and component follows without knowing about it.
 */

export type SidebarStyle = "Light" | "Tinted" | "Brand"
export type Appearance = "Light" | "Dark" | "Device"

export interface Brand {
  /** shown in the sidebar and on the sign-in page; a data URL in the prototype, a file in storage later */
  logo?: string
  /** buttons, links, selected items and focus rings */
  color: string
  sidebar: SidebarStyle
}

export const DEFAULT_BRAND: Brand = { color: "#2b3a9e", sidebar: "Light" }

export const BRAND_PRESETS = [
  { name: "Indigo", color: "#2b3a9e" },
  { name: "Ocean", color: "#0b6bcb" },
  { name: "Teal", color: "#0f766e" },
  { name: "Navy", color: "#1e3a5f" },
  { name: "Plum", color: "#6b2f8f" },
  { name: "Rose", color: "#be185d" },
  { name: "Violet", color: "#5b3fd1" },
  { name: "Graphite", color: "#36404d" },
]

/* colour maths */

type RGB = [number, number, number]

export function isHex(v: string) {
  return /^#([0-9a-f]{6})$/i.test(v.trim())
}
function toRgb(hex: string): RGB {
  const h = hex.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
}
function toHex([r, g, b]: RGB) {
  return "#" + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("")
}
/** a weighted mix: amount 0 gives a, 1 gives b */
export function mix(a: string, b: string, amount: number) {
  const x = toRgb(a)
  const y = toRgb(b)
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as RGB)
}
function luminance(hex: string) {
  const c = toRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (l1 + 0.05) / (l2 + 0.05)
}

const LIGHT = { card: "#ffffff", background: "#f5f6f7", ink: "#18202b" }
const DARK = { card: "#171d25", background: "#0f141a", ink: "#e7eaef" }

/** Text colour that reads best on a filled brand button. */
function onColor(fill: string) {
  return contrast(fill, "#ffffff") >= contrast(fill, "#0f141a") ? "#ffffff" : "#0f141a"
}

/**
 * Brand colour adjusted for the view: in light view it must be readable as link text on white,
 * in dark view it is lightened until it reads on the dark card.
 */
export function brandFor(color: string, dark: boolean) {
  const base = isHex(color) ? color : DEFAULT_BRAND.color
  const surface = dark ? DARK.card : LIGHT.card
  let c = base
  for (let i = 1; i <= 10 && contrast(c, surface) < 4.5; i++) c = mix(base, dark ? "#ffffff" : "#000000", i * 0.08)
  return c
}

function hueSat(hex: string) {
  const [r, g, b] = toRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { hue: (h * 60 + 360) % 360, sat }
}

/** Status colours keep their meaning, so warn when the brand colour looks like one of them. */
const STATUS_HUES = [
  { name: "overdue (red)", hue: 4 },
  { name: "due soon (amber)", hue: 33 },
  { name: "done (green)", hue: 152 },
]

/** How readable the chosen colour is, for the hint on the Branding page. */
export function brandCheck(color: string) {
  if (!isHex(color)) return { ok: false, note: "Enter a colour as # and six characters, for example #2b3a9e." }
  const adjusted = brandFor(color, false) !== color.toLowerCase()
  const tooLight = contrast(color, "#ffffff") < 3
  const { hue, sat } = hueSat(color)
  const dist = (h: number) => Math.min(Math.abs(hue - h), 360 - Math.abs(hue - h))
  const nearest = [...STATUS_HUES].sort((a, b) => dist(a.hue) - dist(b.hue))[0]
  const clash = sat > 0.3 && dist(nearest.hue) < 22 ? nearest : undefined
  if (tooLight) return { ok: false, note: "This colour is too light for text on white, so links and buttons will use a darker shade of it." }
  if (clash) return { ok: false, note: `This colour is close to the ${clash.name} status colour, so items in progress may look like a warning. A different colour reads more clearly.` }
  if (adjusted) return { ok: true, note: "Links use a slightly darker shade so they stay readable." }
  return { ok: true, note: "Readable on white and in dark view." }
}

export function prefersDark() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  } catch {
    return false
  }
}

export function resolveDark(appearance: Appearance) {
  return appearance === "Dark" || (appearance === "Device" && prefersDark())
}

/** Apply the brand and view to the whole app. */
export function applyTheme(brand: Brand, appearance: Appearance) {
  const root = document.documentElement
  const dark = resolveDark(appearance)
  const s = dark ? DARK : LIGHT
  const primary = brandFor(brand.color, dark)
  const vars: Record<string, string> = {
    "--primary": primary,
    "--primary-hover": dark ? mix(primary, "#ffffff", 0.15) : mix(primary, "#000000", 0.2),
    "--primary-foreground": onColor(primary),
    "--accent": mix(s.card, primary, dark ? 0.18 : 0.1),
    "--accent-foreground": primary,
    "--ring": primary,
    "--progress": primary,
    "--progress-tint": mix(s.card, primary, dark ? 0.16 : 0.09),
    "--highlight": mix(s.card, primary, dark ? 0.08 : 0.04),
    "--info-border": mix(s.card, primary, dark ? 0.35 : 0.22),
  }

  // sidebar style
  if (brand.sidebar === "Tinted") {
    Object.assign(vars, {
      "--sidebar": mix(s.background, primary, dark ? 0.1 : 0.06),
      "--sidebar-foreground": s.ink,
      "--sidebar-muted": dark ? "#9ba5b3" : "#4a5463",
      "--sidebar-hover": mix(s.background, primary, dark ? 0.18 : 0.12),
      "--sidebar-active": mix(s.background, primary, dark ? 0.28 : 0.18),
      "--sidebar-active-foreground": s.ink,
      "--sidebar-border": mix(s.background, primary, dark ? 0.2 : 0.14),
    })
  } else if (brand.sidebar === "Brand") {
    const fill = dark ? mix(brand.color, "#000000", 0.45) : isHex(brand.color) ? brand.color : DEFAULT_BRAND.color
    const fg = onColor(fill)
    const light = fg === "#ffffff"
    Object.assign(vars, {
      "--sidebar": fill,
      "--sidebar-foreground": fg,
      "--sidebar-muted": light ? mix(fill, "#ffffff", 0.72) : mix(fill, "#000000", 0.6),
      "--sidebar-hover": mix(fill, light ? "#ffffff" : "#000000", 0.1),
      "--sidebar-active": mix(fill, light ? "#ffffff" : "#000000", 0.18),
      "--sidebar-active-foreground": fg,
      "--sidebar-border": mix(fill, "#000000", 0.15),
      "--logo-tile": fg,
      "--logo-tile-foreground": fill,
    })
  }

  // start clean so switching styles never leaves old values behind
  for (const k of ["--sidebar", "--sidebar-foreground", "--sidebar-muted", "--sidebar-hover", "--sidebar-active", "--sidebar-active-foreground", "--sidebar-border", "--logo-tile", "--logo-tile-foreground"]) root.style.removeProperty(k)
  root.classList.toggle("dark", dark)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", dark ? DARK.background : LIGHT.background)
}
