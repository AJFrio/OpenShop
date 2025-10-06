import { useCallback, useEffect, useRef, useState } from 'react'

const DRIVE_NOTICE = 'Google Drive link detected — converted for reliable preview and delivery.'

export function useDriveImageNormalizer({ noticeDuration = 3000 } = {}) {
  const [notice, setNotice] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const normalize = useCallback((input) => {
    const value = (input || '').trim()
    if (!value) return input

    const isDriveLink = value.includes('drive.google.com') || value.includes('drive.usercontent.google.com')
    if (!isDriveLink) return input

    const fileMatch = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    const idMatch = value.match(/[?&#]id=([a-zA-Z0-9_-]+)/)
    const id = (fileMatch && fileMatch[1]) || (idMatch && idMatch[1]) || null
    const normalized = id
      ? `https://drive.usercontent.google.com/download?id=${id}&export=view`
      : value

    if (normalized !== value) {
      setNotice(DRIVE_NOTICE)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setNotice(''), noticeDuration)
    }

    return normalized
  }, [noticeDuration])

  const clearNotice = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setNotice('')
  }, [])

  return { normalize, notice, clearNotice }
}
