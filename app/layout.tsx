import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Draw.ai — AI-Powered Diagram Editor',
    template: '%s · Draw.ai',
  },
  description:
    'A fast, web-based diagram editor inspired by draw.io, with an AI copilot that builds, cleans up, and explains diagrams.',
  applicationName: 'Draw.ai',
  keywords: ['diagram', 'flowchart', 'editor', 'draw.io', 'AI', 'whiteboard'],
  openGraph: {
    type: 'website',
    title: 'Draw.ai — AI-Powered Diagram Editor',
    description: 'Build, connect, style, and explain diagrams with an AI copilot.',
    url: siteUrl,
    siteName: 'Draw.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Draw.ai — AI-Powered Diagram Editor',
    description: 'Build, connect, style, and explain diagrams with an AI copilot.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fbfaf7',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        {/* Canvas/UI colors are light-only for v1; force light to avoid an
            inconsistent half-themed dark mode. */}
        <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
