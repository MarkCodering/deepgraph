import Layout from '../../components/Layout'
import Link from 'next/link'

export default function Docs() {
  return (
    <Layout>
      <h1>Documentation</h1>
      <ul>
        <li>
          <Link href="/docs/getting-started">Getting Started</Link>
        </li>
      </ul>
    </Layout>
  )
}
