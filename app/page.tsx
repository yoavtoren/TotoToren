import Link from 'next/link'
import CountdownTimer from '@/components/ui/CountdownTimer'
import GlassCard from '@/components/ui/GlassCard'

const FEATURES = [
  {
    icon: '🗂️',
    title: 'Rank All 12 Groups',
    body: 'Drag-and-drop 4 teams in each of the 12 groups. Predict who tops their group, who sneaks through as runner-up, and who gets eliminated.',
  },
  {
    icon: '🏆',
    title: 'Build Your Bracket',
    body: 'Once groups are set, your Round of 32 auto-populates. Pick the 8 best 3rd-place teams, then predict every knockout match all the way to the Final.',
  },
  {
    icon: '📊',
    title: 'Live Leaderboard',
    body: "See how you stack up against friends in real-time as results come in. Exact scores, correct outcomes, correct advances — every point counts.",
  },
  {
    icon: '🔒',
    title: 'Privacy Lock',
    body: "Your friends can't see your picks until the relevant match kicks off. No peeking, no copying — pure independent prediction.",
  },
]

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-20">
      {/* Hero */}
      <section className="text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-white/70">
          <span>🇺🇸 🇨🇦 🇲🇽</span>
          <span>FIFA World Cup 2026</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-shadow leading-none">
          TotoToren
        </h1>
        <p className="text-lg sm:text-xl text-white/70 max-w-xl mx-auto leading-relaxed">
          Predict the World Cup 2026 with your friends. Pick every group, build your
          full bracket, and prove you called it first.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/predict"
            className="glass-btn-primary px-8 py-3.5 rounded-2xl text-base font-semibold glow-indigo"
          >
            Build My Predictions →
          </Link>
          <Link
            href="/leaderboard"
            className="glass glass-hover px-8 py-3.5 rounded-2xl text-base font-semibold"
          >
            View Leaderboard
          </Link>
        </div>
      </section>

      {/* Countdown */}
      <section>
        <CountdownTimer />
      </section>

      {/* Feature cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center text-shadow">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <GlassCard key={f.title} className="space-y-2">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Scoring breakdown */}
      <section>
        <GlassCard className="space-y-4">
          <h2 className="text-xl font-bold text-shadow">Scoring System</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ['Exact scoreline', '+3 pts'],
              ['Correct result (win/draw)', '+1 pt'],
              ['Correct group winner', '+2 pts'],
              ['Correct team in top 2', '+1 pt'],
              ['Team advances R32→R16', '+1 pt'],
              ['Team advances R16→QF', '+2 pts'],
              ['Team advances QF→SF', '+3 pts'],
              ['Team advances SF→Final', '+4 pts'],
              ['Correct World Cup Champion', '+5 pts'],
            ].map(([label, pts]) => (
              <div key={label} className="flex items-center justify-between glass rounded-xl px-3 py-2">
                <span className="text-white/70">{label}</span>
                <span className="font-bold text-indigo-300">{pts}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  )
}
