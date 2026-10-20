import type { CoverTint, Process, ProcessCover } from "@/data/types"

/** Emojis offered for a process cover, with the name screen readers announce. */
export const COVER_EMOJIS: [string, string][] = [
  ["🏭", "Factory"],
  ["⚙️", "Gear"],
  ["🔧", "Wrench"],
  ["🛠️", "Hammer and wrench"],
  ["📦", "Package"],
  ["🚚", "Delivery truck"],
  ["🔍", "Magnifying glass"],
  ["✅", "Check mark"],
  ["🧪", "Test tube"],
  ["📐", "Triangular ruler"],
  ["🤝", "Handshake"],
  ["🧾", "Receipt"],
  ["📈", "Chart going up"],
  ["📊", "Bar chart"],
  ["🧭", "Compass"],
  ["🎯", "Target"],
  ["👥", "People"],
  ["🎓", "Graduation cap"],
  ["🛡️", "Shield"],
  ["💡", "Light bulb"],
]

/** Background tints for an emoji cover. Each has a light and a dark value in index.css. */
export const COVER_TINTS: { id: CoverTint; label: string; className: string }[] = [
  { id: "slate", label: "Slate", className: "bg-cover-slate" },
  { id: "blue", label: "Blue", className: "bg-cover-blue" },
  { id: "green", label: "Green", className: "bg-cover-green" },
  { id: "amber", label: "Amber", className: "bg-cover-amber" },
  { id: "rose", label: "Rose", className: "bg-cover-rose" },
  { id: "violet", label: "Violet", className: "bg-cover-violet" },
]

export const tintClass = (t: CoverTint) => COVER_TINTS.find((x) => x.id === t)?.className ?? "bg-cover-slate"
export const emojiLabel = (e: string) => COVER_EMOJIS.find(([c]) => c === e)?.[1] ?? "Emoji"

const KNOWN: Record<string, [string, CoverTint]> = {
  leadership: ["🧭", "slate"],
  improvement: ["📈", "violet"],
  sales: ["🤝", "blue"],
  design: ["📐", "blue"],
  purchasing: ["📦", "amber"],
  operations: ["🏭", "slate"],
  inspection: ["🔍", "green"],
  people: ["👥", "green"],
  infrastructure: ["🛠️", "amber"],
}
const BY_BAND: Record<Process["band"], [string, CoverTint]> = {
  Management: ["🧭", "slate"],
  Core: ["⚙️", "blue"],
  Support: ["🛠️", "amber"],
}

/** The cover a process gets when nobody has chosen one, so no card is ever blank. */
export function defaultCover(p: Pick<Process, "id" | "band">): ProcessCover {
  const [emoji, tint] = KNOWN[p.id] ?? BY_BAND[p.band] ?? ["⚙️", "slate"]
  return { kind: "emoji", emoji, tint }
}

export const coverOf = (p: Process): ProcessCover => p.cover ?? defaultCover(p)
