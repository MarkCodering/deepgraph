import Layout from '../../components/Layout'
import Link from 'next/link'

export default function Docs() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Documentation</h1>
      <ul className="list-disc pl-6">
        <li>
          <Link href="/docs/getting-started" className="underline text-blue-600">
            Getting Started
          </Link>
        </li>
      </ul>
    </Layout>
  )
}
