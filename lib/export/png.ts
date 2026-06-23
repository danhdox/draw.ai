import { Diagram } from '@/lib/model/diagram'
import { exportSVG, diagramBounds } from '@/lib/export/svg'
import { downloadBlob } from '@/lib/export/download'

export interface PngExportOptions {
  scale?: number
  backgroundColor?: string
}

// Encode an SVG string as a base64 data URI. Base64 (rather than URL encoding)
// keeps the markup intact regardless of special characters in labels.
export function svgToDataUri(svg: string): string {
  if (typeof btoa === 'function') {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }
  // Node fallback (tests / SSR).
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`
}

// Render the diagram to a PNG bitmap matching its bounds. Browser-only because
// it relies on <canvas>; throws a clear error elsewhere.
export async function exportPNG(diagram: Diagram, options: PngExportOptions = {}): Promise<Blob> {
  const { scale = 2, backgroundColor = '#ffffff' } = options

  if (typeof document === 'undefined') {
    throw new Error('PNG export is only available in the browser')
  }

  const bounds = diagramBounds(diagram)
  const width = Math.max(1, Math.round(bounds.width * scale))
  const height = Math.max(1, Math.round(bounds.height * scale))

  const svg = exportSVG(diagram)
  const dataUri = svgToDataUri(svg)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not acquire a 2D canvas context for PNG export')

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)

  const image = new Image()
  image.width = width
  image.height = height

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Failed to rasterize the diagram SVG'))
    image.src = dataUri
  })

  ctx.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), 'image/png')
  )
  if (!blob) throw new Error('Failed to encode the canvas as PNG')
  return blob
}

export async function downloadPNG(diagram: Diagram, filename = 'diagram.png') {
  const blob = await exportPNG(diagram)
  downloadBlob(blob, filename)
}
