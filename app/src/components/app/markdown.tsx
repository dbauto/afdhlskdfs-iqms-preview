import * as React from "react"
import { Link } from "react-router-dom"

/**
 * A small, safe markdown renderer for our own legal documents: headings, paragraphs,
 * bullet and numbered lists, tables, bold, inline code and links. No raw HTML is ever rendered.
 */
function inline(text: string, key = "i"): React.ReactNode[] {
  const out: React.ReactNode[] = []
  // **bold**, `code`, [label](href)
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let n = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[2]) out.push(<strong key={`${key}b${n}`}>{m[2]}</strong>)
    else if (m[3]) out.push(<code key={`${key}c${n}`} className="rounded-sm bg-secondary px-1 py-0.5 font-mono text-[0.8125em]">{m[3]}</code>)
    else if (m[4]) {
      const href = m[5]
      // only our own pages, mail and https
      if (href.startsWith("/")) out.push(<Link key={`${key}l${n}`} to={href} className="font-medium text-primary underline underline-offset-2">{m[4]}</Link>)
      else if (/^(https:|mailto:)/.test(href)) out.push(<a key={`${key}l${n}`} href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">{m[4]}</a>)
      else out.push(m[4])
    }
    last = m.index + m[0].length
    n++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block = { kind: "h1" | "h2" | "h3" | "p"; text: string } | { kind: "ul" | "ol"; items: string[] } | { kind: "table"; head: string[]; rows: string[][] }

function parse(src: string): Block[] {
  const lines = src.replace(/\r/g, "").split("\n")
  const blocks: Block[] = []
  let i = 0
  const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim())
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }
    const h = /^(#{1,3})\s+(.*)$/.exec(l)
    if (h) { blocks.push({ kind: (["h1", "h2", "h3"] as const)[h[1].length - 1], text: h[2] }); i++; continue }
    if (l.trim().startsWith("|")) {
      const head = cells(l)
      i += 2 // skip the separator row
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]))
      blocks.push({ kind: "table", head, rows })
      continue
    }
    if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
      const ordered = /^\s*\d+\.\s+/.test(l)
      const items: string[] = []
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
        let item = lines[i].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, "")
        i++
        // indented continuation lines and nested bullets fold into the item
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += " " + lines[i++].trim().replace(/^[-*]\s+/, "· ")
        items.push(item)
      }
      blocks.push({ kind: ordered ? "ol" : "ul", items })
      continue
    }
    let text = l
    i++
    while (i < lines.length && lines[i].trim() && !/^(#|\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) text += " " + lines[i++]
    blocks.push({ kind: "p", text })
  }
  return blocks
}

export function Markdown({ source, skipTitle }: { source: string; skipTitle?: boolean }) {
  const blocks = React.useMemo(() => parse(source), [source])
  return (
    <div className="flex flex-col gap-3 text-[0.9375rem] leading-relaxed">
      {blocks.map((b, k) => {
        if (b.kind === "h1") return skipTitle ? null : <h1 key={k} className="text-2xl font-semibold">{inline(b.text, `${k}`)}</h1>
        if (b.kind === "h2") return <h2 key={k} className="mt-4 scroll-mt-24 text-lg font-semibold" id={b.text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>{inline(b.text, `${k}`)}</h2>
        if (b.kind === "h3") return <h3 key={k} className="mt-2 text-[0.9375rem] font-semibold">{inline(b.text, `${k}`)}</h3>
        if (b.kind === "p") return <p key={k}>{inline(b.text, `${k}`)}</p>
        if (b.kind === "ul" || b.kind === "ol") {
          const L = b.kind
          return (
            <L key={k} className={L === "ul" ? "flex list-disc flex-col gap-1.5 pl-5" : "flex list-decimal flex-col gap-1.5 pl-5"}>
              {b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
            </L>
          )
        }
        if (b.kind !== "table") return null
        return (
          <div key={k} className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[34rem] border-collapse text-[0.875rem]">
              <thead>
                <tr className="bg-background">
                  {b.head.map((c, j) => <th key={j} className="border-b px-3 py-2 text-left font-semibold">{inline(c, `${k}h${j}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j} className="border-b border-rule-soft last:border-b-0 align-top">
                    {r.map((c, x) => <td key={x} className="px-3 py-2">{inline(c, `${k}r${j}${x}`)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
