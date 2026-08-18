import { createCanvas } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('public', { recursive: true })

for (const size of [192, 512]) {
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')
  const radius = size * 0.24

  context.fillStyle = '#111111'
  context.beginPath()
  context.roundRect(0, 0, size, size, radius)
  context.fill()

  context.fillStyle = '#d8ff3e'
  context.beginPath()
  context.roundRect(0, 0, size / 2, size, [radius, 0, 0, radius])
  context.fill()

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `700 ${size * 0.31}px monospace`
  context.fillStyle = '#111111'
  context.fillText('B', size * 0.25, size * 0.52)
  context.font = `700 ${size * 0.18}px monospace`
  context.fillStyle = '#ffffff'
  context.fillText('SD', size * 0.75, size * 0.51)

  await writeFile(`public/pwa-${size}x${size}.png`, canvas.toBuffer('image/png'))
}
