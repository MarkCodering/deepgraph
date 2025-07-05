import Layout from '../components/Layout'
import { useAuth } from './_app'
import Link from 'next/link'

export default function Home() {
  const { session } = useAuth()
  return (
    <Layout>
      <h1>Welcome to DeepGraph</h1>
      {session ? (
        <p>Signed in as {session.user.email}</p>
      ) : (
        <p>
          <Link href="/login">Log in</Link> or <Link href="/signup">sign up</Link> to
          continue.
        </p>
      )}
    </Layout>
  )
}
