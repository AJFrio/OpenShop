import { useState, useEffect } from 'react'
import { Button } from '../ui/button'

export function Footer() {
  const [contactEmail, setContactEmail] = useState('contact@example.com')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContactEmail()
  }, [])

  const fetchContactEmail = async () => {
    try {
      const response = await fetch('/api/contact-email')
      if (response.ok) {
        const data = await response.json()
        setContactEmail(data.email || 'contact@example.com')
      } else {
        setContactEmail('contact@example.com')
      }
    } catch (error) {
      console.error('Error fetching contact email:', error)
      setContactEmail('contact@example.com')
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-32 md:h-24">
          {/* Contact Section - Left Half */}
          <div className="flex flex-col justify-center items-center text-center space-y-2 md:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900">Get in Touch</h3>
            <p className="text-gray-600 text-sm">
              Have questions about our products or need support? We'd love to hear from you.
            </p>
            <a
              href={`mailto:${contactEmail && contactEmail !== 'contact@example.com' ? contactEmail : 'contact@example.com'}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-purple-300 hover:text-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              {loading ? 'Loading...' : 'Contact Us'}
            </a>
          </div>

          {/* Made with OpenShop Section - Right Half */}
          <div className="flex flex-col justify-center items-center md:col-span-1">
            <a
              href="https://github.com/AJFrio/OpenShop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-purple-300 hover:text-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              Made with OpenShop
            </a>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} OpenShop. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
