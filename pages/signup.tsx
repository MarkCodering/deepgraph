import { FormEvent, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else router.push('/')
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 max-w-sm"
      >
        <input
          className="border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          required
        />
        <input
          className="border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          required
        />
        <button className="bg-blue-600 text-white py-2 rounded" type="submit">
          Sign Up
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </Layout>
  )
}
