'use client'

import { useEffect, useState } from 'react'
import { TOURNAMENT_START } from '@/lib/constants'
import { formatCountdown, pad } from '@/lib/utils'
import GlassCard from './GlassCard'

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(() =>
    formatCountdown(new Date(TOURNAMENT_START).getTime() - Date.now())
  )
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const tick = () => {
      const ms = new Date(TOURNAMENT_START).getTime() - Date.now()
      if (ms <= 0) {
        setLocked(true)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTimeLeft(formatCountdown(ms))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (locked) {
    return (
      <GlassCard className="text-center py-6 px-8 glow-indigo">
        <div className="text-4xl mb-2">🔒</div>
        <p className="text-xl font-bold text-indigo-300">Predictions Locked</p>
        <p className="text-sm text-white/60 mt-1">The tournament has started!</p>
      </GlassCard>
    )
  }

  const units = [
    { label: 'Days',    value: timeLeft.days },
    { label: 'Hours',   value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ]

  return (
    <div className="text-center">
      <p className="text-sm text-white/50 uppercase tracking-widest mb-4">
        Tournament starts in
      </p>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        {units.map(({ label, value }, i) => (
          <div key={label} className="flex items-center gap-3 sm:gap-4">
            <GlassCard className="min-w-[72px] sm:min-w-[88px] py-4 text-center">
              <div className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-white">
                {pad(value)}
              </div>
              <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest mt-1">
                {label}
              </div>
            </GlassCard>
            {i < units.length - 1 && (
              <span className="text-2xl font-bold text-white/30 -mt-4">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
