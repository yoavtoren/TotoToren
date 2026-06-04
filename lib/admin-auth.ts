/** Compute a deterministic token from the admin credentials + server secret.
 *  Works in both Node.js and Vercel edge runtime (uses Web Crypto). */
export async function computeAdminToken(): Promise<string> {
  const email    = process.env.ADMIN_EMAIL    ?? ''
  const password = process.env.ADMIN_PASSWORD ?? ''
  const secret   = process.env.ADMIN_SECRET   ?? 'tototoren-admin-secret'
  const data     = `${email}:${password}:${secret}`
  const buf      = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const ADMIN_COOKIE = 'admin_token'
