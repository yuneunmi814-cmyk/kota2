import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), 'build'], {
  stdio: 'inherit',
  env: { ...process.env, KOTA_BUILD_PRELOAD: '1' },
})
child.on('error', () => { console.error('Next build process could not start'); process.exitCode = 1 })
child.on('close', code => { process.exitCode = code ?? 1 })
