import Link from 'next/link'
import CountdownTimer from '@/components/ui/CountdownTimer'
import GlassCard from '@/components/ui/GlassCard'

const FEATURES = [
  { icon: '🗂️', title: 'Rank All 12 Groups',   body: 'Drag-and-drop 4 teams in each of the 12 groups. Predict who tops their group, who sneaks through as runner-up, and who is eliminated.' },
  { icon: '🏆', title: 'Build Your Bracket',    body: 'Round of 32 auto-populates from your groups. Pick the 8 best 3rd-place teams, then predict every knockout match to the Final.' },
  { icon: '📊', title: 'Live Leaderboard',      body: 'See how you stack up against friends in real-time. Exact scores, outcomes, correct advances — every point counts.' },
  { icon: '🔒', title: 'Privacy Lock',          body: "Your friends can't see your picks until the relevant match kicks off. No peeking — pure independent prediction." },
]

// Decorative football field top-view SVG
function FieldDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 opacity-[0.055] w-[700px] max-w-full"
        viewBox="0 0 700 500" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer pitch border */}
        <rect x="20" y="20" width="660" height="460" rx="4" stroke="white" strokeWidth="2"/>
        {/* Halfway line */}
        <line x1="350" y1="20" x2="350" y2="480" stroke="white" strokeWidth="1.5"/>
        {/* Centre circle */}
        <circle cx="350" cy="250" r="70" stroke="white" strokeWidth="1.5"/>
        <circle cx="350" cy="250" r="3" fill="white"/>
        {/* Left penalty box */}
        <rect x="20" y="140" width="120" height="220" stroke="white" strokeWidth="1.5"/>
        {/* Left goal box */}
        <rect x="20" y="195" width="50" height="110" stroke="white" strokeWidth="1.5"/>
        {/* Left penalty spot */}
        <circle cx="92" cy="250" r="3" fill="white"/>
        {/* Left penalty arc */}
        <path d="M 140 185 A 70 70 0 0 1 140 315" stroke="white" strokeWidth="1.5"/>
        {/* Right penalty box */}
        <rect x="560" y="140" width="120" height="220" stroke="white" strokeWidth="1.5"/>
        {/* Right goal box */}
        <rect x="630" y="195" width="50" height="110" stroke="white" strokeWidth="1.5"/>
        {/* Right penalty spot */}
        <circle cx="608" cy="250" r="3" fill="white"/>
        {/* Right penalty arc */}
        <path d="M 560 185 A 70 70 0 0 0 560 315" stroke="white" strokeWidth="1.5"/>
        {/* Corner arcs */}
        <path d="M 20 36 A 16 16 0 0 1 36 20" stroke="white" strokeWidth="1.5"/>
        <path d="M 664 20 A 16 16 0 0 1 680 36" stroke="white" strokeWidth="1.5"/>
        <path d="M 20 464 A 16 16 0 0 0 36 480" stroke="white" strokeWidth="1.5"/>
        <path d="M 664 480 A 16 16 0 0 0 680 464" stroke="white" strokeWidth="1.5"/>
      </svg>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-20">

      {/* Hero */}
      <section className="relative text-center space-y-6 animate-fade-in py-8">
        <FieldDecoration />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-emerald-300/80 border-emerald-600/30">
            <span>🇺🇸 🇨🇦 🇲🇽</span>
            <span>FIFA World Cup 2026</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-shadow leading-none">
            TotoToren
          </h1>
          <p className="text-lg sm:text-xl text-white/65 max-w-xl mx-auto leading-relaxed">
            Predict the World Cup 2026 with your friends. Pick every group, build your
            full bracket, and prove you called it first.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/predict" className="glass-btn-primary px-8 py-3.5 rounded-2xl text-base font-semibold glow-green">
              Build My Predictions →
            </Link>
            <Link href="/leaderboard" className="glass glass-hover px-8 py-3.5 rounded-2xl text-base font-semibold">
              View Leaderboard
            </Link>
          </div>
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
              <p className="text-sm text-white/55 leading-relaxed">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Scoring */}
      <section>
        <GlassCard className="space-y-4">
          <h2 className="text-xl font-bold text-shadow">Scoring System</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              ['Exact scoreline',                  '+3 pts'],
              ['Correct outcome (1X2)',             '+1 pt'],
              ['Correct total goals in match',      '+2 pts'],
              ['Correct group winner',              '+2 pts'],
              ['Correct team in top 2',             '+1 pt'],
              ['Team advances R32 → R16',           '+4 pts'],
              ['Team advances R16 → QF',            '+5 pts'],
              ['Team advances QF → SF',             '+6 pts'],
              ['Team advances SF → Final',          '+7 pts'],
              ['Correct World Cup Champion',        '+15 pts'],
            ].map(([label, pts]) => (
              <div key={label} className="flex items-center justify-between glass rounded-xl px-3 py-2">
                <span className="text-white/65">{label}</span>
                <span className="font-bold text-emerald-300">{pts}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  )
}
