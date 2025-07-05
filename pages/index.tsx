import Layout from '../components/Layout'
import { useAuth } from './_app'
import Link from 'next/link'

export default function Home() {
  const { session } = useAuth()
  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-4">Welcome to DeepGraph</h1>
      {session ? (
        <p>Signed in as {session.user.email}</p>
      ) : (
        <p>
          <Link href="/login" className="underline text-blue-600">Log in</Link> or{' '}
          <Link href="/signup" className="underline text-blue-600">sign up</Link> to
          continue.
        </p>
      )}
    </Layout>
  )
}
