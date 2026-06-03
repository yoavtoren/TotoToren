import Link from 'next/link'
import GlassCard from '@/components/ui/GlassCard'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <GlassCard className="text-center space-y-4 py-10 px-12 max-w-sm">
        <div className="text-5xl">🔴</div>
        <h1 className="text-3xl font-extrabold text-shadow">Offside!</h1>
        <p className="text-white/60 text-sm">This page doesn't exist.</p>
        <Link
          href="/"
          className="inline-block glass-btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold mt-2"
        >
          Back to home
        </Link>
      </GlassCard>
    </div>
  )
}
