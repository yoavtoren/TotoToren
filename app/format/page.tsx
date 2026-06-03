import GlassCard from '@/components/ui/GlassCard'
import Link from 'next/link'

export const metadata = {
  title: 'TotoToren — Tournament Format',
}

const TIEBREAKERS = [
  'Points in matches between the tied teams (head-to-head)',
  'Goal difference in head-to-head matches',
  'Goals scored in head-to-head matches',
  '(Re-apply 1–3 if a subset is still tied)',
  'Overall goal difference',
  'Overall goals scored',
  'Fair-play (conduct) score',
  'FIFA world ranking',
]

const BEST_THIRD = [
  'Points',
  'Goal difference',
  'Goals scored',
  'Conduct score',
  'FIFA world ranking',
]

const SCORING_TABLE = [
  { cat: 'Group match — correct 1X2 outcome',  pts: '+1' },
  { cat: 'Group match — correct total goals',  pts: '+2' },
  { cat: 'Group match — correct exact score',  pts: '+3' },
  { cat: 'Group standings — correct position (×4 per group)', pts: '+3 each' },
  { cat: 'Team reaches Round of 32',           pts: '+4' },
  { cat: 'Team reaches Round of 16',           pts: '+5' },
  { cat: 'Team reaches Quarter-final',         pts: '+6' },
  { cat: 'Team reaches Semi-final',            pts: '+7' },
  { cat: 'Team reaches Final',                 pts: '+8' },
  { cat: 'Knockout match — correct total goals', pts: '+2' },
  { cat: 'Knockout match — correct exact score', pts: '+3' },
  { cat: 'World Cup Champion',                 pts: '+15' },
  { cat: 'Top-scoring team',                   pts: '+8' },
  { cat: 'Golden Boot team',                   pts: '+8' },
  { cat: 'Most goals conceded',                pts: '+10' },
  { cat: 'Total tournament goals (exact)',      pts: '+12' },
]

export default function FormatPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-shadow">Tournament Format</h1>
        <p className="text-sm text-white/50">2026 FIFA World Cup — How the competition works</p>
      </div>

      {/* Overview */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">Overview</h2>
        <p className="text-sm text-white/70 leading-relaxed">
          For the first time, the World Cup features <strong className="text-white">48 teams</strong> across{' '}
          <strong className="text-white">12 groups</strong> (A–L), each with 4 teams. Every team plays
          the other 3 in its group once — 72 group matches in total — then the best 32 advance to a
          knockout stage that leads to the Final on July 19, 2026 in New York/New Jersey.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {[
            ['48', 'Teams'],
            ['12', 'Groups'],
            ['72', 'Group Matches'],
            ['32', 'R32 Teams'],
            ['104', 'Total Matches'],
            ['6', 'Knockout Rounds'],
          ].map(([n, l]) => (
            <div key={l} className="glass rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-300">{n}</p>
              <p className="text-xs text-white/50">{l}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Group stage */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">Group Stage</h2>
        <p className="text-sm text-white/70 leading-relaxed">
          Each group plays a full round-robin. Teams earn <strong className="text-white">3 pts</strong> for
          a win, <strong className="text-white">1 pt</strong> for a draw, 0 for a loss. The top 2 teams in
          each group advance automatically (24 teams). The 8 best 3rd-placed teams (ranked across all 12
          groups) also advance, bringing the total to 32.
        </p>
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-2">Tiebreakers (in order)</h3>
          <ol className="space-y-1">
            {TIEBREAKERS.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/60">
                <span className="text-white/30 shrink-0">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </GlassCard>

      {/* Best 3rd-place ranking */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">Best 8 Third-Place Teams</h2>
        <p className="text-sm text-white/70 leading-relaxed">
          All 12 third-placed teams are ranked by the criteria below. The top 8 join the Round of 32.
          In the real event, a FIFA lookup table assigns each of the 8 thirds to a specific bracket slot.
          In this prediction game, <strong className="text-white">you choose</strong> which 8 thirds
          advance and slot them into one of the 8 designated R32 positions.
        </p>
        <ol className="space-y-1">
          {BEST_THIRD.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/60">
              <span className="text-white/30 shrink-0">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </GlassCard>

      {/* Knockout */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">Knockout Stage</h2>
        <div className="space-y-2 text-sm text-white/70">
          <p>
            Single-elimination from the Round of 32. If level after 90 minutes:{' '}
            <strong className="text-white">30 min extra time (2×15)</strong>, then penalty shootout.
          </p>
          <p>
            Scoring in this game is based on the <strong className="text-white">90-minute result only</strong>,
            regardless of extra time or penalties.
          </p>
          <div className="flex flex-col gap-1 pt-1">
            {[
              'Round of 32 (16 matches, June 28–July 3)',
              'Round of 16 (8 matches, July 4–7)',
              'Quarter-finals (4 matches, July 9–11)',
              'Semi-finals (2 matches, July 14–15)',
              'Third-place play-off (July 18, Miami)',
              'Final (July 19, New York/New Jersey)',
            ].map((r) => (
              <div key={r} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5 text-xs text-white/60">
                <span className="text-indigo-400">▸</span> {r}
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Scoring */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">Scoring System</h2>
        <p className="text-sm text-white/50">All categories are independent and cumulative.</p>
        <div className="divide-y divide-white/10">
          {SCORING_TABLE.map(({ cat, pts }) => (
            <div key={cat} className="flex items-center justify-between py-2">
              <span className="text-sm text-white/70 pr-4">{cat}</span>
              <span className="text-sm font-bold text-indigo-300 shrink-0">{pts}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 pt-2">
          Group match scores stack: a correct exact score always awards 1+2+3 = 6 points.
          Correct 1X2 + correct total (but wrong exact) = 3 points. Advancement tiers are
          independent — a correctly predicted team scores at every tier it reaches.
        </p>
      </GlassCard>

      <div className="text-center">
        <Link href="/predict" className="glass-btn-primary px-8 py-3 rounded-2xl text-sm font-semibold inline-block">
          Build My Predictions →
        </Link>
      </div>
    </div>
  )
}
