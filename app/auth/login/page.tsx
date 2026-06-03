'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import GlassCard from '@/components/ui/GlassCard'
import GlassButton from '@/components/ui/GlassButton'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/predict'

  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    if (mode === 'signup') {
      // Create user via admin API (email pre-confirmed, no confirmation email)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); setLoading(false); return }

      // Immediately sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message) }
      else { router.push(redirectTo) }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message) }
      else { router.push(redirectTo) }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold text-shadow">
            {mode === 'login' ? 'ברוכים הבאים לטוטו-תורן' : 'יצירת חשבון חדש'}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {mode === 'login'
              ? 'כניסה לחשבון שלך לניחושי המונדיאל'
              : 'הצטרפו לחברים והתחילו לנחש'}
          </p>
        </div>

        {/* Google OAuth */}
        <GlassButton
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3"
          size="lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          כניסה עם Google
        </GlassButton>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/40">או</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-4">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="שם תצוגה"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="glass-input"
            />
          )}
          <input
            type="email"
            placeholder="כתובת אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glass-input"
          />
          <input
            type="password"
            placeholder="סיסמה (לפחות 6 תווים)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="glass-input"
          />

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
          {successMsg && (
            <p className="text-sm text-emerald-400 text-center">{successMsg}</p>
          )}

          <GlassButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'טוען…' : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
          </GlassButton>
        </form>

        <p className="text-center text-sm text-white/50">
          {mode === 'login' ? 'אין לך חשבון עדיין? ' : 'כבר יש לך חשבון? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccessMsg(null) }}
            className="text-indigo-300 hover:text-indigo-200 font-medium"
          >
            {mode === 'login' ? 'הרשמה' : 'כניסה'}
          </button>
        </p>
      </GlassCard>
    </div>
  )
}
