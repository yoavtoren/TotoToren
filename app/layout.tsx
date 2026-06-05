import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/ui/Navbar'
import { PredictSaveProvider } from '@/contexts/predict-save'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'טוטו-תורן — ניחושי מונדיאל 2026',
  description: 'נחשו את מונדיאל 2026 עם החברים. בנו את הטבלה שלכם, תתחרו על הפודיום.',
  openGraph: {
    title: 'טוטו-תורן',
    description: 'משחק ניחושי מונדיאל 2026',
    siteName: 'טוטו-תורן',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={inter.variable}>
      <body>
        <PredictSaveProvider>
          <Navbar />
          <main className="min-h-screen pt-16">
            {children}
          </main>
        </PredictSaveProvider>
      </body>
    </html>
  )
}
