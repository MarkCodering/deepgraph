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
    <div className="flex min-h-screen">
      <aside className="w-60 p-4 bg-gray-100">
        <nav className="flex flex-col gap-2">
          <Link href="/">Home</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/docs/getting-started">Getting Started</Link>
          {session ? (
            <button onClick={handleSignOut} className="text-left">Sign out</button>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
