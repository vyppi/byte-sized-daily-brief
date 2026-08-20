import { createCanvas, loadImage } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'

const outputDirectory = new URL('../store-submission/assets/', import.meta.url)
await mkdir(outputDirectory, { recursive: true })

const source = await loadImage(new URL('../public/pwa-512x512.png', import.meta.url))
const canvas = createCanvas(300, 300)
const context = canvas.getContext('2d')
context.drawImage(source, 0, 0, 300, 300)

await writeFile(new URL('store-logo-300x300.png', outputDirectory), canvas.toBuffer('image/png'))
console.log('[store] wrote 300x300 Store logo')
