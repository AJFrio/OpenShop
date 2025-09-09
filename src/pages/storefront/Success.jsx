import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { CheckCircle, Package, ArrowLeft } from 'lucide-react'

export function Success() {
  const [searchParams] = useSearchParams()
  const [sessionData, setSessionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
    } else {
      setLoading(false)
    }
  }, [sessionId])

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`/api/checkout-session/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSessionData(data)
      }
    } catch (error) {
      console.error('Error fetching session data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your order...</p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Session</h1>
            <p className="text-gray-600 mb-6">
              We couldn't find your order information.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Store
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Successful!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your purchase. You should receive a confirmation email shortly.
          </p>
          
          {sessionData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-mono text-sm">{sessionData.id}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <Link to="/" className="block">
              <Button className="w-full">
                Continue Shopping
              </Button>
            </Link>
            <Link to="/orders" className="block">
              <Button variant="outline" className="w-full">
                View Order History
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
