import { test, expect } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

/** Phase 1 source discovery evidence — never asserts Play is already implemented. */
test("G1: enumerate actual JSX controls and event handlers from all current UI TSX files", async ({}, info) => {
  const root = path.resolve(process.cwd(), "src")
  const files: string[] = []
  const collect = (dir: string) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name)
      if (item.isDirectory()) collect(full)
      else if (item.name.endsWith(".tsx")) files.push(full)
    }
  }
  collect(path.join(root, "pages"))
  collect(path.join(root, "components", "app"))

  const tagPattern = /^(button|input|textarea|select|a|Button|Link|ContentLink|RecordLink|OutsideLink|TabsTrigger|DropdownMenuItem|RowActions|Checkbox|NativeSelect|SheetTrigger|DialogTrigger|AlertDialogAction|Switch|RadioGroupItem|ChipChoice|PeoplePicker|ProcessPicker|ClausePicker|EvidencePicker|RecordPicker)$/i
  const originalEventPattern = /^on(Click|Change|Submit|Select|KeyDown|KeyUp|ValueChange|CheckedChange|OpenChange|PointerDown|PointerUp|MouseDown|MouseUp|Blur|Focus)$/
  // Include callback props such as RowActions.onEdit/onRemove and form onSave.
  // They were omitted by the original allowlist and cannot silently leave G1 scope.
  const eventPattern = /^on[A-Z]/
  const findings: { file: string; line: number; kind: string; tag: string; attribute?: string }[] = []
  const controlSites = new Set<string>()
  let n = 0
  for (const filepath of files.sort()) {
    const text = fs.readFileSync(filepath, "utf8")
    const source = ts.createSourceFile(filepath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const relative = path.relative(path.resolve(process.cwd()), filepath).split(path.sep).join("/")
    const walk = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source)
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
        if (tagPattern.test(tag) || node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && eventPattern.test(attr.name.getText(source)))) {
          controlSites.add(`${relative}:${node.getStart(source)}`)
        }
        if (tagPattern.test(tag)) findings.push({ file: relative, line, kind: "interactive-tag", tag })
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr)) continue
          const name = attr.name.getText(source)
          if (eventPattern.test(name)) {
            const start = source.getLineAndCharacterOfPosition(attr.getStart(source)).line + 1
            findings.push({ file: relative, line: start, kind: "event-handler", tag, attribute: name })
          }
        }
      }
      ts.forEachChild(node, walk)
    }
    walk(source)
    n++
  }
  const summary = {
    currentUiFiles: n,
    observations: findings.length,
    uniqueFiles: new Set(findings.map((x) => x.file)).size,
    tagTargets: findings.filter((x) => x.kind === "interactive-tag").length,
    eventHandlers: findings.filter((x) => x.kind === "event-handler").length,
    addedCallbackAttributes: findings.filter((x) => x.kind === "event-handler" && !originalEventPattern.test(x.attribute!)).length,
    controlSites: controlSites.size,
    source: "GitHub Check tested PR branch based on current main (not the old Phase 1 manifest)",
    // These are lexical nodes, not verified independently working user actions.
    findings,
  }
  fs.writeFileSync(info.outputPath("walkthrough-phase1-current-jsx-control-inventory.json"), JSON.stringify(summary, null, 2))
  console.log(`G1 AST inventory: ${summary.currentUiFiles} files, ${summary.observations} JSX target/event occurrences (${summary.tagTargets} tags, ${summary.eventHandlers} handlers)`)
  // The complete inventory is attached as JSON; keep CI logs to the exact summary.
  // Exact current-source census. A future UI change must refresh the G1 source pin/register.
  expect(n).toBe(123)
  expect(summary.tagTargets).toBe(1324)
  expect(summary.eventHandlers).toBe(1304)
  expect(summary.addedCallbackAttributes).toBe(90)
  expect(summary.controlSites).toBe(1569)
  expect(findings).toHaveLength(2628)
})
