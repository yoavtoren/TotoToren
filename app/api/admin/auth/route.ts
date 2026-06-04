import { NextResponse, type NextRequest } from 'next/server'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  const expectedEmail    = process.env.ADMIN_EMAIL    ?? ''
  const expectedPassword = process.env.ADMIN_PASSWORD ?? ''

  if (email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: 'פרטים שגויים' }, { status: 401 })
  }

  const token = await computeAdminToken()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/admin',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/admin' })
  return response
}
