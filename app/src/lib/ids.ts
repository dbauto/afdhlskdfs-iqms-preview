/** Use the unfiltered ID set; the backend assigns these in a transaction. */
export function nextId(ids: string[], prefix: string, width = 3) {
  const nums = ids.filter(i => i.startsWith(prefix)).map(i => parseInt(i.slice(prefix.length), 10) || 0)
  return prefix + String(Math.max(0, ...nums) + 1).padStart(width, '0')
}
