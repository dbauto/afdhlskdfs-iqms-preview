/**
 * Preview only: records point to people and processes by name, so a rename must reach every place
 * the exact old name is stored (owners, reviewers, sign-offs, process fields, scopes…). The backend
 * uses membership and process IDs (plan v3 §9), where a rename is a single update.
 * Only whole values equal to the old name change; free text that mentions it is left alone.
 */
export function replaceEverywhere<T>(value: T, from: string, to: string): T {
  if (typeof value === "string") return (value === from ? to : value) as T
  if (Array.isArray(value)) {
    let changed = false
    const out = value.map((v) => {
      const n = replaceEverywhere(v, from, to)
      if (n !== v) changed = true
      return n
    })
    return (changed ? out : value) as T
  }
  if (value && typeof value === "object") {
    let changed = false
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      const n = replaceEverywhere(v, from, to)
      if (n !== v) changed = true
      out[k] = n
    }
    return (changed ? out : value) as T
  }
  return value
}
