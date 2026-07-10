import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = process.argv[2] ?? 'C:\\Users\\user\\Downloads\\76f14e44addf4b39a5cb047879f534f0.png'
const outDir = join(__dirname, '..', 'public', 'images', 'landing')

const BLACK_THRESHOLD = 28

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
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]
    for (const [nx, ny] of neighbors) {
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

const input = readFileSync(source)
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

removeEdgeBlackBackground({ data, width: info.width, height: info.height })

const processed = sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})

const trimmed = await processed.trim().toBuffer({ resolveWithObject: true })

const MAX_WIDTH = 1280
const resized = await sharp(trimmed.data, {
  raw: {
    width: trimmed.info.width,
    height: trimmed.info.height,
    channels: trimmed.info.channels,
  },
})
  .resize({ width: MAX_WIDTH, withoutEnlargement: true })
  .toBuffer({ resolveWithObject: true })

const webpPath = join(outDir, 'hero-chart.webp')
const pngPath = join(outDir, 'hero-chart.png')

await sharp(resized.data, {
  raw: {
    width: resized.info.width,
    height: resized.info.height,
    channels: resized.info.channels,
  },
})
  .webp({ lossless: true, effort: 6 })
  .toFile(webpPath)

await sharp(resized.data, {
  raw: {
    width: resized.info.width,
    height: resized.info.height,
    channels: resized.info.channels,
  },
})
  .png({ compressionLevel: 9, palette: false })
  .toFile(pngPath)

console.log(`Source: ${source}`)
console.log(`Trimmed: ${trimmed.info.width}x${trimmed.info.height}`)
console.log(`Output: ${resized.info.width}x${resized.info.height}`)
console.log(`WebP: ${webpPath}`)
console.log(`PNG:  ${pngPath}`)
