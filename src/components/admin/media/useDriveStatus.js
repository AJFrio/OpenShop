import { useCallback, useState } from 'react'
import { adminApiRequest } from '../../../lib/auth'

export function useDriveStatus() {
  const [driveConnected, setDriveConnected] = useState(false)
  const [error, setError] = useState('')

  const checkDriveStatus = useCallback(async () => {
    try {
      const res = await adminApiRequest('/api/admin/drive/status', { method: 'GET' })
      const data = await res.json()
      setDriveConnected(!!data.connected)
      setError('')
    } catch (_) {
      setDriveConnected(false)
      setError('')
    }
  }, [])

  const disconnectDrive = useCallback(async () => {
    try {
      const res = await adminApiRequest('/api/admin/drive/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to disconnect')
      setDriveConnected(false)
      setError('')
      return true
    } catch (err) {
      setError(err.message || 'Failed to disconnect Google Drive')
      return false
    }
  }, [])

  return { driveConnected, checkDriveStatus, disconnectDrive, error, setError }
}
