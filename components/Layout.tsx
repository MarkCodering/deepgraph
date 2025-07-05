import Link from 'next/link'
import { ReactNode } from 'react'
import { useAuth } from '../pages/_app'
import { supabase } from '../lib/supabaseClient'

export default function Layout({ children }: { children: ReactNode }) {
  const { session } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, padding: '1rem', background: '#f1f5f9' }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/">Home</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/docs/getting-started">Getting Started</Link>
          {session ? (
            <button onClick={handleSignOut}>Sign out</button>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
    </div>
  )
}
