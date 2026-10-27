import type * as React from "react"
import type { SupportCategory, SupportScreenshot } from "@/data/types"
import { formatBytes } from "@/lib/uploads"

/**
 * Screenshots for support reports (ADR-038).
 * - Images only: PNG, JPEG or WebP, up to 5 MB each, up to 3 per report.
 * - Re-encoded in the browser before sending: resized to at most 1600 px and saved as JPEG,
 *   which also drops hidden photo data (location, camera). The server re-checks type and size and scans the file.
 * - Kept with the report for 12 months, like the report itself. Not used for anything else.
 */
export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"]
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
export const MAX_SCREENSHOTS = 3
/** problem reports need a screenshot; questions and ideas don't */
export const needsScreenshot = (c: SupportCategory) => c !== "Question" && c !== "Idea"
const MAX_SIDE = 1600

/** why this file can't be used as a screenshot, in one sentence; undefined when it can */
export function screenshotProblem(file: { name: string; size: number; type: string }, already: number): string | undefined {
  if (already >= MAX_SCREENSHOTS) return `You can add up to ${MAX_SCREENSHOTS} screenshots. Remove one to add another.`
  if (!SCREENSHOT_TYPES.includes(file.type)) return `${file.name} isn’t a picture. Add a PNG, JPG or WebP screenshot.`
  if (file.size > MAX_SCREENSHOT_BYTES) return `${file.name} is ${formatBytes(file.size)}. Screenshots can be up to 5 MB; crop it or save it as JPG.`
  if (file.size === 0) return `${file.name} is empty.`
  return undefined
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("unreadable"))
    img.src = src
  })
}

/** Reads and re-encodes one screenshot. Rejects with a sentence for people when the picture can't be read. */
export async function readScreenshot(file: File): Promise<SupportScreenshot> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url).catch(() => {
      throw new Error(`${file.name} couldn’t be opened. Take the screenshot again and add it.`)
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error(`${file.name} couldn’t be opened. Try another browser.`)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    const data = canvas.toDataURL("image/jpeg", 0.82)
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return { name, width, height, bytes: Math.round((data.length - data.indexOf(",") - 1) * 0.75), data }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** files from a paste event (Ctrl+V / Cmd+V of a copied screenshot) */
export function pastedImages(e: ClipboardEvent | React.ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items ?? [])
  return items.filter((i) => i.kind === "file" && i.type.startsWith("image/")).map((i) => i.getAsFile()).filter((f): f is File => !!f)
}

/** a short reference people can quote, made when the app catches an error */
export function errorReference(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return `ER-${(h % 46656).toString(36).toUpperCase().padStart(3, "0")}${Date.now().toString(36).slice(-3).toUpperCase()}`
}
