import { copyFile, mkdir, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
assert.deepEqual(await readdir('dist'), ['index.html'], 'Preview must contain exactly one HTML file')
await mkdir('../docs', { recursive: true })
await copyFile('dist/index.html', '../index.html')
await copyFile('dist/index.html', '../docs/index.html')
console.log('Self-contained hash preview copied to index.html and docs/index.html')
