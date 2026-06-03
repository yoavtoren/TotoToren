'use client'

import { useCallback } from 'react'

export function useWhistle(enabled: boolean) {
  return useCallback(() => {
    if (!enabled || typeof window === 'undefined') return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      // Short rising whistle chirp
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1100, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1700, ctx.currentTime + 0.12)
      osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.22)

      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
      osc.onended = () => ctx.close()
    } catch {
      // AudioContext not available (SSR or blocked)
    }
  }, [enabled])
}
