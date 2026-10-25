import type { Classification, StoredFile } from "@/data/types"
import { isLocked } from "@/data/types"
import { todayIso } from "@/lib/periods"

/**
 * File uploads to ThryveMS storage (plan v3 D12, revised 25 Oct 2026).
 * - Public and Internal documents and evidence only. Confidential and Highly confidential stay as links.
 * - Up to 25 MB a file.
 * - No videos and no .exe files. The server checks the same rules and scans every file before it can be opened.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export const MAX_UPLOAD_LABEL = "25 MB"

const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "avi", "mkv", "wmv", "flv", "webm", "mpg", "mpeg", "3gp", "3g2", "ogv", "ts", "mts", "m2ts", "vob"]
const BLOCKED_EXTENSIONS = ["exe"]

/** the file input's accept list can't exclude types, so it is left open and every file is checked here */
export const uploadsAllowed = (classification: Classification) => !isLocked(classification)

function extension(name: string) {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(i + 1).toLowerCase() : ""
}

/** why this file can't be uploaded, in one sentence for people; undefined when it can */
export function uploadProblem(file: { name: string; size: number; type: string }): string | undefined {
  const ext = extension(file.name)
  if (file.type.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext)) return `${file.name} is a video. Videos can’t be uploaded; link them from SharePoint or OneDrive instead.`
  if (BLOCKED_EXTENSIONS.includes(ext)) return `${file.name} is a program (.exe). Programs can’t be uploaded.`
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name} is ${formatBytes(file.size)}. Files can be up to ${MAX_UPLOAD_LABEL}; link larger ones from SharePoint or OneDrive.`
  if (file.size === 0) return `${file.name} is empty.`
  return undefined
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

export function storedFile(file: File, uploadedBy: string): StoredFile {
  const key = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  keepPreview(key, file)
  return { key, name: file.name, size: file.size, type: file.type || "application/octet-stream", uploadedBy, uploadedOn: todayIso() }
}

/**
 * Preview only: the browser keeps the file contents for this session so Open works.
 * The backend stores them in R2 and serves them through an authenticated route instead.
 */
const previewFiles = new Map<string, string>()
export function keepPreview(key: string, file: File) {
  try {
    previewFiles.set(key, URL.createObjectURL(file))
  } catch {
    /* object URLs unavailable; Open just won't work in the preview */
  }
}
export const previewUrl = (key: string) => previewFiles.get(key)

/** the folder of a file picked with "Upload folder": "Calibration/2026/cert.pdf" → "Calibration/2026" */
export function folderOf(file: File, under = "") {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? ""
  const parts = rel.split("/").filter(Boolean).slice(0, -1)
  return cleanFolder([under, ...parts].filter(Boolean).join("/"))
}

/** tidy a typed folder path: no leading or trailing slashes, no empty or dot parts */
export function cleanFolder(path: string) {
  return path
    .split("/")
    .map((p) => p.trim())
    .filter((p) => p && p !== "." && p !== "..")
    .join("/")
}
