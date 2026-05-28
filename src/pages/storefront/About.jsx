import { useEffect, useState } from 'react'
import { Navbar } from '../../components/storefront/Navbar'
import { Footer } from '../../components/storefront/Footer'
import { PageRenderer } from '../../components/storefront/page-builder/PageRenderer'

export function About() {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchPage() {
      try {
        const res = await fetch('/api/storefront/pages/about')
        if (res.ok) {
          const data = await res.json()
          if (isMounted) setPage(data)
        }
      } catch (e) {
        console.error('Failed to load page content', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPage()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="min-h-screen storefront-surface">
      <Navbar />
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <p className="storefront-subtle">Loading page...</p>
        </div>
      ) : (
        <PageRenderer data={page?.data} />
      )}
      <Footer />
    </div>
  )
}

export default About

