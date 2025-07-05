import type { AppProps } from 'next/app'
import { createContext, useEffect, useState, useContext } from 'react'
import { Session, createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseKey)

interface AuthContextProps {
  session: Session | null
}

const AuthContext = createContext<AuthContextProps>({ session: null })

export function useAuth() {
  return useContext(AuthContext)
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_, sess) => {
      setSession(sess)
    })
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session }}>
      <Component {...pageProps} />
    </AuthContext.Provider>
  )
}
