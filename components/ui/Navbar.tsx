'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/',            label: 'Home' },
  { href: '/predict',     label: 'Predict' },
  { href: '/schedule',    label: 'Schedule' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/format',      label: 'Format' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <span className="text-2xl">⚽</span>
            <span className="text-shadow">TotoToren</span>
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
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 truncate max-w-[140px]">
                  {user.user_metadata?.full_name ?? user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="glass glass-hover px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/auth/login" className="glass-btn-primary px-4 py-2 rounded-xl text-sm font-semibold">
                Sign in
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
                <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white">
                  Sign out ({user.email})
                </button>
              ) : (
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm font-semibold text-indigo-300 hover:text-indigo-200">
                  Sign in →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
