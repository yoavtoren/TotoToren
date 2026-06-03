import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/ui/Navbar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TotoToren — World Cup 2026 Predictions',
  description: 'Predict the 2026 FIFA World Cup with your friends. Build your bracket, compete on the leaderboard.',
  openGraph: {
    title: 'TotoToren',
    description: 'World Cup 2026 prediction game',
    siteName: 'TotoToren',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Navbar />
        <main className="min-h-screen pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}
