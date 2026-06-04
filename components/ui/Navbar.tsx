'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const NAV_LINKS = [
  { href: '/',            label: 'בית' },
  { href: '/predict',     label: 'ניחושים' },
  { href: '/schedule',    label: 'לוח משחקים' },
  { href: '/leaderboard', label: 'טבלת ניקוד' },
  { href: '/format',      label: 'פורמט' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Pick<Profile, 'display_name' | 'avatar_url'> | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('profiles').select('display_name, avatar_url').eq('id', data.user.id).single()
          .then(({ data: p }) => { if (p) setProfile(p) })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-emerald-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="טוטו-תורן" width={28} height={28} className="w-7 h-7 object-contain" />
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200',
                  pathname === link.href
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 glass glass-hover px-2.5 py-1.5 rounded-xl transition-colors"
                >
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url} alt="avatar"
                      width={24} height={24}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-600/60 flex items-center justify-center text-[10px] font-bold text-white">
                      {(profile?.display_name ?? user.email ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-white/70 truncate max-w-[120px]">
                    {profile?.display_name ?? user.user_metadata?.full_name ?? user.email}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="glass glass-hover px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  התנתק
                </button>
              </div>
            ) : (
              <Link href="/auth/login" className="glass-btn-primary px-4 py-2 rounded-xl text-sm font-semibold">
                התחברות
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden glass glass-hover p-2 rounded-lg"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="space-y-1">
              <span className={cn('block w-5 h-0.5 bg-white transition-transform', menuOpen && 'translate-y-1.5 rotate-45')} />
              <span className={cn('block w-5 h-0.5 bg-white transition-opacity', menuOpen && 'opacity-0')} />
              <span className={cn('block w-5 h-0.5 bg-white transition-transform', menuOpen && '-translate-y-1.5 -rotate-45')} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden pb-4 space-y-1 animate-fade-in">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  pathname === link.href ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10">
              {user ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-white/70 hover:text-white">
                    👤 פרופיל
                  </Link>
                  <button onClick={handleSignOut} className="w-full text-right px-4 py-2.5 text-sm text-white/70 hover:text-white">
                    התנתק
                  </button>
                </>
              ) : (
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-indigo-300 hover:text-indigo-200">
                  ← התחברות
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
