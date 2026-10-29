import type { State } from "@/lib/store"
import { ORG } from "@/data/org"

/**
 * File storage used by this organization (ADR-044). Only Public and Internal documents and evidence,
 * logos, profile photos and 24-hour exports are uploaded (plan v3 D12–D13); links take no space.
 * The preview adds the sample company's earlier uploads to whatever is uploaded in this browser;
 * production reads the totals from the uploads store.
 */
export const PLAN_STORAGE_GB: Record<string, number> = { Starter: 5, Base: 5, Business: 25, Mid: 25, Enterprise: 100 }
export const GB = 1024 ** 3
export type StorageKind = "Documents" | "Evidence" | "Exports, kept 24 hours" | "Logos and profile photos"
export interface StoredItem { name: string; kind: StorageKind; process: string; by: string; on: string; size: number; to?: string; key?: string; parent?: { collection: "documents" | "evidence"; id: string; removePatch: object; restorePatch: object } }

/** The sample company's uploads before this preview session, as totals and a few large files. */
const SAMPLE: Record<StorageKind, { bytes: number; files: number }> = {
  Documents: { bytes: 5.84 * GB, files: 412 },
  Evidence: { bytes: 3.71 * GB, files: 1038 },
  "Exports, kept 24 hours": { bytes: 0.18 * GB, files: 3 },
  "Logos and profile photos": { bytes: 0.02 * GB, files: 58 },
}
const MB = 1024 ** 2
const SAMPLE_FILES: StoredItem[] = [
  { name: "Records export, all processes.zip", kind: "Exports, kept 24 hours", process: "", by: "Aaron Lim", on: "Today, deleted in 21 hours", size: 176 * MB },
  { name: "Calibration certificates 2026.pdf", kind: "Evidence", process: "Infrastructure & equipment", by: "Paolo Ramos", on: "24 Oct 2026", size: 38.2 * MB },
  { name: "QMS manual QMS-MAN-001 rev 07.docx", kind: "Documents", process: "Leadership & planning", by: "Maria Santos", on: "18 Oct 2026", size: 21.7 * MB },
  { name: "Supplier audit photos, Calamba.zip", kind: "Evidence", process: "Purchasing & suppliers", by: "Joy Aquino", on: "9 Oct 2026", size: 19.4 * MB },
  { name: "Training matrix 2026.xlsx", kind: "Evidence", process: "People & competence", by: "Rosa Tan", on: "2 Oct 2026", size: 4.1 * MB },
]
const SAMPLE_BY_PROCESS: Record<string, number> = { "Leadership & planning": 2.31, Operations: 1.82, "Infrastructure & equipment": 1.47, "Purchasing & suppliers": 1.1, "People & competence": 0.85 }

export function storageUsage(state: State) {
  const limit = (PLAN_STORAGE_GB[ORG.plan] ?? 25) * GB
  const uploaded: StoredItem[] = [
    ...state.documents.filter((d) => d.file).map((d) => ({ name: d.file!.name, key: d.file!.key, kind: "Documents" as const, process: d.process, by: d.file!.uploadedBy, on: d.file!.uploadedOn, size: d.file!.size, to: `/documents/${d.id}`, parent: { collection: "documents" as const, id: d.id, removePatch: { file: undefined }, restorePatch: { file: d.file } } })),
    ...state.evidence.flatMap((e) => (e.files ?? []).filter((f) => f.stored).map((f) => ({ name: f.stored!.name, key: f.stored!.key, kind: "Evidence" as const, process: e.processes[0] ?? "", by: f.stored!.uploadedBy, on: f.stored!.uploadedOn, size: f.stored!.size, to: `/evidence/${e.id}`, parent: { collection: "evidence" as const, id: e.id, removePatch: { files: (e.files ?? []).filter((x) => x !== f) }, restorePatch: { files: e.files } } }))),
  ]
  const kinds = (Object.keys(SAMPLE) as StorageKind[]).map((kind) => {
    const mine = uploaded.filter((u) => u.kind === kind)
    return { kind, bytes: SAMPLE[kind].bytes + mine.reduce((t, u) => t + u.size, 0), files: SAMPLE[kind].files + mine.length }
  })
  const used = kinds.reduce((t, k) => t + k.bytes, 0)
  const byProcess = Object.entries(SAMPLE_BY_PROCESS).map(([name, gb]) => ({ name, bytes: gb * GB + uploaded.filter((u) => u.process === name).reduce((t, u) => t + u.size, 0) }))
  const listed = byProcess.reduce((t, p) => t + p.bytes, 0)
  const docsAndEvidence = kinds.filter((k) => k.kind === "Documents" || k.kind === "Evidence").reduce((t, k) => t + k.bytes, 0)
  byProcess.push({ name: "Other processes", bytes: Math.max(0, docsAndEvidence - listed) })
  const links = state.documents.filter((d) => d.link && !d.file).length + state.evidence.reduce((t, e) => t + (e.files ?? []).filter((f) => f.kind === "Link").length, 0)
  const pct = Math.round((used / limit) * 100)
  const status = pct >= 100 ? ("Full" as const) : pct >= 80 ? ("Nearly full" as const) : ("Healthy" as const)
  // files in Deleted still use space until they're removed for good
  const gone = new Set(state.deleted.filter((d) => d.kind === "file").map((d) => (d.item as { key?: string }).key))
  return { limit, used, pct, status, kinds, byProcess, links, largest: [...uploaded, ...SAMPLE_FILES].filter((f) => !gone.has(f.key ?? f.name)).sort((a, b) => b.size - a.size) }
}

export const fmtBytes = (b: number) => (b >= GB ? `${(b / GB).toFixed(2)} GB` : b >= MB ? `${(b / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
