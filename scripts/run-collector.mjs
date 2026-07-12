#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const collectorDir = join(root, 'apps', 'review-collector')
const tsxBin = join(collectorDir, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const entry = join(collectorDir, 'src', 'index.ts')
const envFile = join(collectorDir, '.env')

if (!existsSync(join(collectorDir, 'node_modules'))) {
  console.error('[collector] Run: npm run setup:collector')
  process.exit(1)
}

const args = [tsxBin, 'watch']
if (existsSync(envFile)) {
  args.push(`--env-file=${envFile}`)
}
args.push(entry)

const child = spawn(process.execPath, args, {
  cwd: collectorDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.COLLECTOR_PORT || '8080',
  },
})

child.on('exit', (code) => process.exit(code ?? 0))
