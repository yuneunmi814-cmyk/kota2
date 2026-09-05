import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const started = performance.now()
let requests = 0, failures = 0, requestMs = 0, pending = ''
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), 'build'], {
  stdio: ['inherit', 'pipe', 'inherit'],
  env: { ...process.env, KOTA_BUILD_PRELOAD: '1', KOTA_QUERY_METRICS: '1' },
})
child.stdout.on('data', chunk => {
  pending += chunk.toString()
  let newline
  while ((newline = pending.indexOf('\n')) !== -1) {
    const line = pending.slice(0, newline); pending = pending.slice(newline + 1)
    const match = line.match(/\[kota-db-metric\](\{[^\r\n]+\})/)
    if (match) {
      const metric = JSON.parse(match[1]); requests++; failures += Number(!metric.ok); requestMs += metric.durationMs
    } else process.stdout.write(line + '\n')
  }
})
child.on('error', () => { console.error('Next build process could not start'); process.exitCode = 1 })
child.on('close', code => {
  if (pending) process.stdout.write(pending)
  const metrics = { elapsedMs: Math.round(performance.now() - started), exitCode: code ?? 1, requests, failures, failureRate: requests ? failures / requests : null, requestMs }
  const directory = new URL('../.next/', import.meta.url)
  mkdirSync(directory, { recursive: true })
  writeFileSync(new URL('build-metrics.json', directory), JSON.stringify(metrics, null, 2))
  console.info('[kota-build]', JSON.stringify(metrics))
  process.exitCode = code ?? 1
})
