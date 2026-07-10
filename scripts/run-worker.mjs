#!/usr/bin/env node
/**
 * Starts Celery worker for research tasks.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getVenvPython, printPythonInstallHint, resolveSystemPython } from './resolve-python.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiDir = join(__dirname, '..', 'apps', 'api')
const venvPython = getVenvPython(apiDir)

let cmd
let args

if (existsSync(venvPython)) {
  cmd = venvPython
  args = ['-m', 'celery', '-A', 'app.celery_app', 'worker', '--loglevel=info', '--pool=solo']
} else {
  const systemPython = resolveSystemPython()
  if (!systemPython) {
    printPythonInstallHint()
    process.exit(1)
  }
  console.warn('[worker] .venv not found — using system Python. Run: npm run setup')
  cmd = systemPython.cmd
  args = [
    ...systemPython.args,
    '-m',
    'celery',
    '-A',
    'app.celery_app',
    'worker',
    '--loglevel=info',
    '--pool=solo',
  ]
}

const useShell = !existsSync(cmd)

console.log('[worker] Celery research worker starting…')

const child = spawn(cmd, args, {
  cwd: apiDir,
  stdio: 'inherit',
  shell: useShell,
  env: { ...process.env, PYTHONUNBUFFERED: '1' },
})

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
child.on('exit', (code) => process.exit(code ?? 0))
