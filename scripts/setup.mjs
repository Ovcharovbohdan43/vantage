#!/usr/bin/env node
/**
 * One-shot local setup: root deps, web deps, API venv + pip install.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getVenvPython,
  printPythonInstallHint,
  resolveSystemPython,
} from './resolve-python.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = join(root, 'apps', 'api')
const webDir = join(root, 'apps', 'web')

function run(cmd, args, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('npm', ['install'])
run('npm', ['install'], webDir)

const venvPython = getVenvPython(apiDir)

if (!existsSync(venvPython)) {
  const systemPython = resolveSystemPython()
  if (!systemPython) {
    printPythonInstallHint()
    process.exit(1)
  }
  run(systemPython.cmd, [...systemPython.args, '-m', 'venv', '.venv'], apiDir)
}

run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], apiDir)
run(venvPython, ['-m', 'playwright', 'install', 'chromium'], apiDir)

console.log('\nSetup complete. Run: npm run dev\n')
