import sharp from 'sharp'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const source =
  process.argv[2] ?? 'C:\\Users\\user\\Downloads\\76f14e44addf4b39a5cb047879f534f0.png'

const BLACK_THRESHOLD = 28
const BRAND_DIR = join(root, 'public', 'brand')
const APP_DIR = join(root, 'src', 'app')

function isBackgroundBlack(r, g, b) {
  return r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD
}

function removeEdgeBlackBackground({ data, width, height }) {
  const visited = new Uint8Array(width * height)
  const queue = []

  const pushIfBlack = (x, y) => {
    const idx = y * width + x
    if (visited[idx]) return
    const i = idx * 4
    if (!isBackgroundBlack(data[i], data[i + 1], data[i + 2])) return
    visited[idx] = 1
    queue.push(idx)
  }

  for (let x = 0; x < width; x++) {
    pushIfBlack(x, 0)
    pushIfBlack(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    pushIfBlack(0, y)
    pushIfBlack(width - 1, y)
  }

  while (queue.length > 0) {
    const idx = queue.pop()
    const x = idx % width
    const y = (idx - x) / width
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      pushIfBlack(nx, ny)
    }
  }

  for (let idx = 0; idx < width * height; idx++) {
    if (!visited[idx]) continue
    data[idx * 4 + 3] = 0
  }

  return data
}

async function loadTransparentMark() {
  const input = readFileSync(source)
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  removeEdgeBlackBackground({ data, width: info.width, height: info.height })

  const trimmed = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim()
    .toBuffer({ resolveWithObject: true })

  return sharp(trimmed.data, {
    raw: {
      width: trimmed.info.width,
      height: trimmed.info.height,
      channels: trimmed.info.channels,
    },
  })
}

async function writeSquarePng(pipeline, size, path, paddingRatio = 0.08) {
  const pad = Math.round(size * paddingRatio)
  const inner = size - pad * 2

  await pipeline
    .clone()
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: false })
    .toFile(path)
}

async function writeSquareWebp(pipeline, size, path, paddingRatio = 0.08) {
  const pad = Math.round(size * paddingRatio)
  const inner = size - pad * 2

  await pipeline
    .clone()
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ lossless: true, effort: 6, alphaQuality: 100 })
    .toFile(path)
}

function pngToIco(pngBuffers) {
  const count = pngBuffers.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  const entries = []
  let offset = 6 + count * 16

  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += buffer.length
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((item) => item.buffer)])
}

mkdirSync(BRAND_DIR, { recursive: true })

const mark = await loadTransparentMark()

await writeSquareWebp(mark, 64, join(BRAND_DIR, 'logo-mark.webp'))
await writeSquareWebp(mark, 128, join(BRAND_DIR, 'logo-mark@2x.webp'))
await writeSquarePng(mark, 128, join(BRAND_DIR, 'logo-mark.png'))
await writeSquarePng(mark, 32, join(APP_DIR, 'icon.png'))
await writeSquarePng(mark, 180, join(APP_DIR, 'apple-icon.png'))

const favicon16 = await mark
  .clone()
  .resize(14, 14, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({
    top: 1,
    bottom: 1,
    left: 1,
    right: 1,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer()

const favicon32 = await mark
  .clone()
  .resize(28, 28, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer()

const ico = pngToIco([
  { size: 16, buffer: favicon16 },
  { size: 32, buffer: favicon32 },
])

writeFileSync(join(root, 'public', 'favicon.ico'), ico)

console.log(`Source: ${source}`)
console.log(`Brand: ${BRAND_DIR}`)
console.log(`App icons: ${APP_DIR}`)
console.log('Generated logo-mark.webp, logo-mark@2x.webp, logo-mark.png, icon.png, apple-icon.png, favicon.ico')
