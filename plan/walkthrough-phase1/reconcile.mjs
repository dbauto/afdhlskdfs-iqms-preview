/** Reconcile the existing G1 registers with an exact, independently checked source tree.
 * Usage: node plan/walkthrough-phase1/reconcile.mjs --source-root ../walkthrough-runtime [--write]
 * No application imports/execution, network requests, or automatic semantic approvals.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const sourceRoot = path.resolve(args[args.indexOf('--source-root') + 1] || '.')
const write = args.includes('--write')
const here = path.dirname(fileURLToPath(import.meta.url))
const ts = createRequire(path.join(sourceRoot, 'app/package.json'))('typescript')
const git = (...a) => execFileSync('git', a, { cwd: sourceRoot, encoding: 'utf8' }).trim()
const sourceRefArg = args.indexOf('--source-ref')
const sourceRef = sourceRefArg >= 0 ? args[sourceRefArg + 1] : 'origin/main'
assert(sourceRef, '--source-ref requires a Git ref')
const pin = git('rev-parse', sourceRef)
const hash = s => createHash('sha256').update(s).digest('hex')
const counts = {}
function parse(text) {
  const rows = []; let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (c === ',' && !quoted) { row.push(cell); cell = '' }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  assert(!quoted, 'Unclosed CSV quote')
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row) }
  const header = rows.shift()
  return rows.filter(r => r.some(Boolean)).map((r, i) => {
    assert.equal(r.length, header.length, `Malformed CSV row ${i + 2}`)
    return Object.fromEntries(header.map((k, j) => [k.replace(/^\uFEFF/, ''), r[j]]))
  })
}
const csv = new Map()
// Read and parse EVERY existing CSV, including historical datasets. Nothing is silently skipped.
for (const name of fs.readdirSync(here).filter(n => n.endsWith('.csv')).sort()) {
  const rows = parse(fs.readFileSync(path.join(here, name), 'utf8'))
  counts[name] = rows.length; csv.set(name, rows)
}
function save(name, rows) {
  if (!write) return
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]
  const q = v => '"' + String(v ?? '').replaceAll('"', '""') + '"'
  fs.writeFileSync(path.join(here, name), [cols, ...rows.map(r => cols.map(c => r[c]))].map(r => r.map(q).join(',')).join('\n') + '\n')
}
const previousManifest = csv.get('source-manifest-current.csv')
const previousBlobs = new Map(previousManifest.map(r => [r.source_path, r.current_main_blob_sha]))
const sourcePaths = git('ls-tree', '-r', '--name-only', pin, 'app/src').split(/\r?\n/).filter(p => /\.(ts|tsx)$/.test(p))
const manifest = sourcePaths.map(source_path => {
  const current_main_blob_sha = git('rev-parse', `${pin}:${source_path}`)
  const previous_blob_sha = previousBlobs.get(source_path) || ''
  return {
    source_path,
    previous_blob_sha,
    current_main_blob_sha,
    size: fs.statSync(path.join(sourceRoot, source_path)).size,
    delta_status: previous_blob_sha ? (previous_blob_sha === current_main_blob_sha ? 'UNCHANGED' : 'CHANGED') : 'NEW',
    verification: 'Source file version only; workflow audit is separate',
  }
})
csv.set('source-manifest-current.csv', manifest)
save('source-manifest-current.csv', manifest)
const blobs = new Map(manifest.map(r => [r.source_path, r.current_main_blob_sha]))
for (const row of manifest) {
  assert.equal(git('rev-parse', `${pin}:${row.source_path}`), row.current_main_blob_sha, row.source_path)
  assert.equal(git('hash-object', '--', row.source_path), row.current_main_blob_sha, `Source drift: ${row.source_path}`)
}
assert.equal(manifest.length, 190)
const all = prefix => [...csv].filter(([n]) => n.startsWith(prefix)).flatMap(([, rows]) => rows)
const legacy = all('action-observations-')
const cross = all('control-crosswalk-')
assert.equal(legacy.length, 1506)
assert.deepEqual(legacy.map(r => r.observation_id).sort(), cross.map(r => r.observation_id).sort())
const flowRows = csv.get('workflow-candidates.csv')
const newFlows = [
  ['FLOW-135', 'Organization & Scope', 'Maintain sites, legal items and organization chart, then print the current scope profile', 'Administrator; Quality manager', 'app/src/pages/qms/org-sections.tsx'],
  ['FLOW-136', 'Processes', 'Map process inputs to outputs from other processes and supporting documents', 'Administrator; Quality manager; Process owner when scoped', 'app/src/pages/qms/process-detail.tsx'],
  ['FLOW-137', 'Processes', 'Inspect and maintain the process flow representation', 'Administrator; Quality manager; Process owner when scoped', 'app/src/pages/qms/process-flow.tsx'],
  ['FLOW-138', 'Documents', 'Browse procedures and work instructions through the dedicated QMS menu destination', 'Any role with permitted Documents access', 'app/src/pages/documents/register.tsx'],
  ['FLOW-139', 'Audits', 'Create an audit plan from an eligible template and audit type', 'Administrator; Quality manager; assigned audit manager', 'app/src/pages/audits/audit-plan.tsx'],
  ['FLOW-140', 'Audits', 'Configure an audit plan timetable, checklist and evidence pack', 'Administrator; Quality manager; assigned auditor', 'app/src/pages/audits/audit-plan.tsx'],
  ['FLOW-141', 'Audits', 'Release an audit report into corrective-action and improvement records', 'Administrator; Quality manager; authorized audit lead', 'app/src/pages/audits/audit-plan.tsx'],
]
for (const [flow_id, module, user_goal, actor_profile, source_file] of newFlows) if (!flowRows.some(r => r.flow_id === flow_id)) flowRows.push({
  flow_id, module, user_goal, actor_profile, source_file,
  precondition: 'Authorized current record and required source data; exact state guard pending semantic review',
  terminal_outcome: 'Current preview state reflects the completed user goal',
  alternate_or_blocked_paths: 'No data; denied scope; incomplete required fields; stale or unavailable record',
  status: 'New current-main candidate from PRs #42/#43; exact actions, states and runtime proof pending',
  supporting_source_previous: '', source_mapping_status: 'Primary source located; full semantic mapping pending', accountable_role: actor_profile,
})
for (const r of flowRows.filter(r => r.module === 'Management Review')) {
  r.status = 'OWNER-APPROVED WALKTHROUGH EXCLUSION (22 Oct 2026): Management Review is still being finalized; retain source traceability and reassess before inclusion'
  r.source_mapping_status = 'Excluded from walkthrough coverage by owner; raw source and screen observations retained'
}
save('workflow-candidates.csv', flowRows)
const flows = new Set(flowRows.map(r => r.flow_id))
assert.equal(flows.size, 141)
for (const r of flowRows) assert(fs.existsSync(path.join(sourceRoot, r.source_file)), `Missing ${r.flow_id} source`)

const routeRows = csv.get('route-inventory.csv')
const addedRoutes = [
  ['ROUTE-085', '/qms/organization/print', '/qms/organization/print', 'OrgPrint', 'print'],
  ['ROUTE-086', '/audits/plans/:id/print', '/audits/plans/:id/print', 'AuditPlanPrint', 'print'],
  ['ROUTE-087', '/qms/procedures', 'qms/procedures', 'Documents', 'screen'],
  ['ROUTE-088', '/audits/plans/:id', 'audits/plans/:id', 'AuditPlanPage', 'record detail'],
]
for (const [id, resolved_path, declared_pattern, element, route_kind] of addedRoutes) if (!routeRows.some(r => r.resolved_path === resolved_path)) routeRows.push({
  id, resolved_path, declared_pattern, element, route_kind,
  context: resolved_path.startsWith('/audits') ? 'Client / Audits' : 'Client / QMS',
  access_policy: resolved_path.startsWith('/audits') ? 'Effective Audits access and record assignment/state' : 'Effective area, process and classification scope',
  source_line: `app/src/App.tsx:${resolved_path === '/qms/organization/print' ? 106 : resolved_path === '/audits/plans/:id/print' ? 107 : resolved_path === '/qms/procedures' ? 136 : 153}`,
  status: 'Source-mapped on current main; browser and role/state proof pending',
})
save('route-inventory.csv', routeRows)

const menuRows = csv.get('menu-inventory.csv')
if (!menuRows.some(r => r.route === '/qms/procedures')) menuRows.push({
  id: 'MENU-043', guide_id: 'GUIDE-MENU-043', console: 'Client', menu_group: 'Quality management system', label: 'Procedures', route: '/qms/procedures', source_access: 'Documents',
  play_requirement: 'Play walkthrough required', status: 'Source-mapped on current main; not implemented', routed_screen_match: 'Matched', screen_component: 'Documents (procedures variant)',
})
for (const row of menuRows.filter(r => r.route === '/management-review')) {
  row.status = 'OWNER-APPROVED WALKTHROUGH EXCLUSION (22 Oct 2026); source menu retained'
  row.exclusion_reason = 'Management Review is still being finalized; reassess before inclusion'
}
save('menu-inventory.csv', menuRows)

const menuRoleRows = csv.get('menu-role-eligibility.csv')
for (const source of menuRoleRows.filter(r => r.menu_label === 'Register')) if (!menuRoleRows.some(r => r.role_id === source.role_id && r.menu_id === 'MENU-043')) menuRoleRows.push({
  ...source,
  scenario_id: `VIS-PROCEDURES-${source.role_id}`,
  menu_id: 'MENU-043', guide_id: 'GUIDE-MENU-043', menu_label: 'Procedures', route: '/qms/procedures',
  verification_status: 'Candidate inherited from Documents access; not browser-verified on revised baseline',
})
for (const row of menuRoleRows.filter(r => r.menu_label === 'Management Review')) {
  row.verification_status = 'Owner-approved walkthrough exclusion; source policy row retained'
}
save('menu-role-eligibility.csv', menuRoleRows)
const targets = /^(button|input|textarea|select|a|Button|Link|ContentLink|RecordLink|OutsideLink|TabsTrigger|DropdownMenuItem|RowActions|Checkbox|NativeSelect|SheetTrigger|DialogTrigger|AlertDialogAction|Switch|RadioGroupItem|ChipChoice|PeoplePicker|ProcessPicker|ClausePicker|EvidencePicker|RecordPicker)$/i
const events = /^on(Click|Change|Submit|Select|KeyDown|KeyUp|ValueChange|CheckedChange|OpenChange|PointerDown|PointerUp|MouseDown|MouseUp|Blur|Focus)$/
const surfaceTags = /^(Sheet|Dialog|AlertDialog|TabsContent|EmptyState|EmptyLine|NotFound|form)$/
const findings = [], additionalCallbacks = [], surfaces = [], sites = new Map()
const squash = s => s.replace(/\s+/g, ' ').trim()
function collect(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? collect(path.join(dir, e.name)) : e.name.endsWith('.tsx') ? [path.join(dir, e.name)] : []) }
const files = [...collect(path.join(sourceRoot, 'app/src/pages')), ...collect(path.join(sourceRoot, 'app/src/components/app'))].sort()
const sourceFiles = new Map()
const importers = new Map(), routeFiles = new Map()
function importedFile(from, spec) {
  const stem = spec.startsWith('@/') ? 'app/src/' + spec.slice(2) : spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(from), spec)) : ''
  return stem && ['.tsx', '.ts', '/index.tsx', '/index.ts'].map(ext => stem + ext).find(p => blobs.has(p))
}
for (const entry of manifest) {
  const source = ts.createSourceFile(entry.source_path, fs.readFileSync(path.join(sourceRoot, entry.source_path), 'utf8'), ts.ScriptTarget.Latest, true)
  sourceFiles.set(entry.source_path, source)
  for (const n of source.statements.filter(ts.isImportDeclaration)) {
    const child = importedFile(entry.source_path, n.moduleSpecifier.text)
    if (!child) continue
    if (!importers.has(child)) importers.set(child, new Set())
    importers.get(child).add(entry.source_path)
    if (entry.source_path !== 'app/src/App.tsx') continue
    const names = [n.importClause?.name?.text, ...(n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) ? n.importClause.namedBindings.elements.map(e => e.name.text) : [])].filter(Boolean)
    const routes = csv.get('route-inventory.csv').filter(r => names.includes(r.element)).map(r => r.resolved_path)
    if (routes.length) routeFiles.set(child, routes)
  }
}
function routeCandidates(file, seen = new Set()) {
  if (seen.has(file)) return []
  seen.add(file)
  return [...new Set([...(routeFiles.get(file) || []), ...[...(importers.get(file) || [])].filter(f => f !== 'app/src/App.tsx').flatMap(f => routeCandidates(f, seen))])].sort()
}
function ancestorFunction(n) { for (let a = n.parent; a; a = a.parent) if (ts.isFunctionLike(a)) return a }
function componentName(n, source) {
  for (let a = n.parent; a; a = a.parent) {
    if (ts.isFunctionDeclaration(a) && a.name) return a.name.text
    if (ts.isVariableDeclaration(a) && (ts.isArrowFunction(a.initializer ?? {}) || ts.isFunctionExpression(a.initializer ?? {}))) return a.name.getText(source)
  }
  return '(module)'
}
for (const file of files) {
  const body = fs.readFileSync(file, 'utf8'), source = ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const rel = path.relative(sourceRoot, file).replaceAll('\\', '/')
  const line = n => source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1
  const text = n => n ? squash(n.getText(source)) : ''
  function walk(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = text(node.tagName)
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute)
      const attr = name => attrs.find(a => text(a.name) === name)
      const attrsText = name => text(attr(name)?.initializer)
      const handlers = attrs.filter(a => /^on[A-Z]/.test(text(a.name)))
      const id = 'SITE-' + hash(`${rel}:${node.getStart(source)}`).slice(0, 12)
      const guards = []
      for (let a = node.parent; a; a = a.parent) {
        if (ts.isConditionalExpression(a)) guards.push(`${text(a.condition)} [${node.getStart(source) < a.whenFalse.getStart(source) ? 'true' : 'false'} branch]`)
        if (ts.isBinaryExpression(a) && ['&&', '||', '??'].includes(text(a.operatorToken)) && node.getStart(source) >= a.right.getStart(source)) guards.push(`${text(a.left)} ${text(a.operatorToken)}`)
      }
      let children = ''
      if (ts.isJsxOpeningElement(node)) children = node.parent.children.map(text).filter(Boolean).join(' ')
      let surfaceTitle = ''
      if (surfaceTags.test(tag) && ts.isJsxOpeningElement(node)) {
        const findTitle = n => {
          if (ts.isJsxElement(n) && /^(SheetTitle|DialogTitle|AlertDialogTitle)$/.test(text(n.openingElement.tagName))) surfaceTitle ||= n.children.map(text).join(' ')
          ts.forEachChild(n, findTitle)
        }
        findTitle(node.parent)
      }
      const field = (() => { for (let a = node.parent; a; a = a.parent) { if (ts.isJsxElement(a) && text(a.openingElement.tagName) === 'Field') return text(a.openingElement.attributes); if (ts.isFunctionLike(a)) break } return '' })()
      const definitions = handlers.map(a => {
        const init = a.initializer
        if (!init || !ts.isJsxExpression(init) || !init.expression || !ts.isIdentifier(init.expression)) return ''
        const name = init.expression.text
        let scope = ancestorFunction(node)
        while (scope) {
          let found
          const find = n => {
            if ((ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n)) && n.name?.getText(source) === name) found = n
            if (n !== scope && ts.isFunctionLike(n) && !(ts.isFunctionDeclaration(n) && n.name?.text === name)) return
            ts.forEachChild(n, find)
          }
          find(scope)
          if (found) return `${name}@${line(found)}: ${text(found)}`
          scope = ancestorFunction(scope)
        }
        return `${name}: imported/prop or unresolved; follow caller before semantic approval`
      }).filter(Boolean).join(' | ')
      const detail = {
        control_site_id: id, enclosing_component: componentName(node, source),
        label_source: surfaceTags.test(tag) ? surfaceTitle || attrsText('title') || attrsText('value') || '(contextual state)' : attrsText('aria-label') || children || field || attrsText('title') || '(dynamic/prop label; inspect caller)',
        handler_source: handlers.map(text).join(' | '), handler_definition_source: definitions,
        disabled_source: attrsText('disabled'), visibility_ancestors: guards.join(' | '),
        navigation_source: attrsText('to') || attrsText('href'),
        source_blob_sha: blobs.get(rel),
        candidate_route_patterns: routeCandidates(rel).join('|'),
        candidate_flow_ids_by_source: flowRows.filter(r => r.source_file === rel || r.supporting_source_previous === rel).map(r => r.flow_id).join('|'),
        semantic_disposition: 'Pending review of distinct action, callers, authorization, record state and outcomes',
      }
      if (targets.test(tag) || handlers.length) sites.set(id, { ...detail, source_path: rel, line: line(node), tag })
      if (targets.test(tag)) findings.push({ source_path: rel, line: line(node), kind: 'interactive-tag', jsx_tag: tag, event_attribute: '', detail })
      for (const a of handlers) {
        const finding = { source_path: rel, line: line(a), kind: 'event-handler', jsx_tag: tag, event_attribute: text(a.name), detail }
        if (events.test(text(a.name))) findings.push(finding)
        else additionalCallbacks.push(finding)
      }
      if (surfaceTags.test(tag)) surfaces.push({ screen_id: 'SURFACE-' + hash(`${rel}:${node.getStart(source)}:${tag}`).slice(0, 12), route: detail.candidate_route_patterns || '(caller unresolved)', kind: tag, context: componentName(node, source), component: tag, guide_id: '', walkthrough_type: 'Contextual surface observation', eligible_actor: 'Inherit effective caller authorization; semantic review pending', disposition: 'Source surface; reachability and role/state variants require reconciliation', source: `${rel}:${line(node)}`, verification_status: 'Source located; NOT a frozen reachable-screen denominator', control_site_id: sites.has(id) ? id : '', label_source: detail.label_source, visibility_ancestors: guards.join(' | '), source_blob_sha: detail.source_blob_sha, candidate_flow_ids_by_source: detail.candidate_flow_ids_by_source })
    }
    ts.forEachChild(node, walk)
  }
  walk(source)
}
assert.equal(files.length, 123)
const astRows = [...findings, ...additionalCallbacks].map(f => ({
  ast_id: 'AST-' + hash(`${f.source_path}:${f.line}:${f.kind}:${f.jsx_tag}:${f.event_attribute}:${f.detail.control_site_id}`).slice(0, 16),
  source_path: f.source_path,
  line: f.line,
  kind: f.kind,
  jsx_tag: f.jsx_tag,
  event_attribute: f.event_attribute,
  proposed_guide_or_context: f.kind === 'event-handler' ? 'Reconcile handler to the invoking control and workflow' : 'Reconcile rendered control to a distinct eligible action or explicit non-action disposition',
  mapping_basis: additionalCallbacks.includes(f) ? 'on* callback outside the original event allowlist' : 'Current-head TypeScript AST observation',
  verification: 'Source located; distinct action, reachability and runtime behavior pending',
  ...f.detail,
}))
const astFiles = ['current-ast-crosswalk-01.csv', 'current-ast-crosswalk-02.csv', 'current-ast-crosswalk-03.csv']
const chunkSize = Math.ceil(astRows.length / astFiles.length)
for (let i = 0; i < astFiles.length; i++) save(astFiles[i], astRows.slice(i * chunkSize, (i + 1) * chunkSize))
const commandRows = [...csv.get('semantic-command-anchors.csv'), ...csv.get('semantic-command-anchors-other.csv')]
const flowCoverage = csv.get('flow-source-coverage.csv')
for (const r of flowCoverage) {
  const commands = commandRows.filter(c => (c.linked_flow_id_candidates || c.linked_flow_candidates).split('|').includes(r.flow_id))
  const guards = csv.get('critical-branch-guards.csv').filter(g => g.linked_flows.split('|').includes(r.flow_id))
  r.current_ast_targets = findings.filter(f => f.source_path === r.source_file).length
  r.linked_command_anchors = commands.length
  r.linked_guard_anchors = guards.length
  r.command_anchor_ids = commands.map(c => c.command_id || c.anchor_id).join('|')
  r.guard_anchor_ids = guards.map(g => g.branch_id).join('|')
  r.current_control_site_ids = [...sites].filter(([,s]) => s.source_path === r.source_file).map(([id]) => id).join('|')
}
save('flow-source-coverage.csv', flowCoverage)
const screens = csv.get('screen-dispositions.csv').filter(r => !r.screen_id.startsWith('SURFACE-'))
for (const route of addedRoutes) if (!screens.some(r => r.route === route[1])) screens.push({
  screen_id: route[0].replace('ROUTE', 'SCREEN'), route: route[1], kind: route[4], context: route[1].startsWith('/audits') ? 'Client / Audits' : 'Client / QMS', component: route[3], guide_id: '', walkthrough_type: 'Page/record walkthrough candidate',
  eligible_actor: 'Effective route, record, process and classification policy', disposition: 'Current-main route; semantic and runtime reconciliation pending', source: `app/src/App.tsx`, verification_status: 'Source located; browser proof pending',
})
for (const screen of screens.filter(r => r.route.startsWith('/management-review'))) {
  screen.disposition = 'OWNER-APPROVED WALKTHROUGH EXCLUSION (22 Oct 2026): Management Review is still being finalized; reassess before inclusion'
  screen.verification_status = 'Excluded from walkthrough coverage; retained in raw reachable-screen inventory'
}
assert.equal(screens.length, 88)
if (!write) assert.deepEqual(csv.get('screen-dispositions.csv').filter(r => r.screen_id.startsWith('SURFACE-')).map(r => r.screen_id).sort(), surfaces.map(r => r.screen_id).sort())
save('screen-dispositions.csv', [...screens, ...surfaces])
const menus = csv.get('menu-inventory.csv')
assert.equal(menus.length, 43)
for (const m of menus) assert(csv.get('route-inventory.csv').some(r => r.resolved_path === m.route), `Unrouted ${m.id}`)
// Report anchor claims separately: an import or a comment is not an executed guard/command.
const anchorReview = []
for (const name of ['critical-branch-guards.csv', 'semantic-command-anchors.csv', 'semantic-command-anchors-other.csv', 'overview-acceptance.csv', 'tab-surfaces.csv']) {
  for (const r of csv.get(name)) {
    const file = r.source_path || r.source_file || r.source
    const n = Number(r.source_line)
    const source = fs.readFileSync(path.join(sourceRoot, file), 'utf8').split(/\r?\n/)
    const expected = r.source_anchor || r.exact_source_search || r.source_excerpt || (name === 'tab-surfaces.csv' ? `value="${r.tab_value}"` : '')
    const normalized = s => s.replaceAll('\\"', '"')
    const match = !!expected && normalized(source[n - 1] || '').includes(normalized(expected))
    anchorReview.push({ register: name, id: r.branch_id || r.command_id || r.anchor_id || r.acceptance_id || r.tab_id, source: file, line: n, literal_match: match, declaration_only: /^\s*import\b/.test(source[n - 1] || '') })
  }
}
const summary = {
  schema_version: 1, frontend_source_sha: pin, backend_architecture_sha: 'b6f738f3258d84bf76662a2debd6361c0dda9a0b',
  status: 'G1 IN PROGRESS; no denominator freeze or owner acceptance',
  files_checked: manifest.length, ui_tsx_files: files.length, menu_leaves: menus.length, route_nodes: csv.get('route-inventory.csv').length,
  original_ast_observations: findings.length, additional_callback_observations: additionalCallbacks.length,
  ast_observations: findings.length + additionalCallbacks.length, control_sites: sites.size,
  tag_observations: findings.filter(f => f.kind === 'interactive-tag').length,
  handler_observations: findings.filter(f => f.kind === 'event-handler').length,
  contextual_surface_observations: surfaces.length,
  workflow_candidates: flowRows.length, role_area_cells: csv.get('role-access-baseline.csv').length,
  menu_role_candidates: csv.get('menu-role-eligibility.csv').length, policy_scenarios: csv.get('permission-scenarios.csv').length,
  onboarding_candidates: csv.get('onboarding-requirements.csv').length,
  semantically_accepted_unique_action_denominator: null, frozen_reachable_screen_denominator: null,
  approved_exclusions: 1, owner_accepted: false,
  approved_exclusion_scope: 'Management Review walkthrough only; feature remains in raw source/screen/action inventories because it is still being finalized',
  csv_rows_read: counts, anchor_review: anchorReview,
}
if (write) fs.writeFileSync(path.join(here, 'reconciliation-result.json'), JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify({ ...summary, csv_rows_read: undefined, anchor_review: undefined }, null, 2))
console.log(`Anchor checks: ${anchorReview.filter(r => r.literal_match).length}/${anchorReview.length} literal matches; ${anchorReview.filter(r => r.declaration_only).length} import-only anchors (not predicates).`)
console.log(write ? 'Canonical registers enriched; semantic acceptance never inferred.' : 'Source and register integrity checks passed (read-only).')
