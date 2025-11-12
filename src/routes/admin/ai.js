// Admin AI routes (Gemini image generation)
import { Hono } from 'hono'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'

const router = new Hono()

// Generate image via Gemini
router.post('/generate-image', asyncHandler(async (c) => {
  const { prompt, inputs } = await c.req.json()
  
  if (!prompt || typeof prompt !== 'string') {
    throw new ValidationError('Missing prompt')
  }
  
  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const parts = []
  parts.push({ text: prompt })
  
  if (Array.isArray(inputs)) {
    for (const item of inputs.slice(0, 4)) {
      if (item && item.dataBase64 && item.mimeType) {
        parts.push({
          inline_data: {
            mime_type: item.mimeType,
            data: item.dataBase64
          }
        })
      }
    }
  }

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [ { parts } ]
    })
  })
  
  if (!res.ok) {
    const errText = await res.text()
    console.error('Gemini API error', res.status, errText)
    throw new Error(`Gemini API failed: ${errText}`)
  }
  
  const data = await res.json()
  const candidates = data?.candidates || []
  let foundBase64 = null
  let mime = 'image/png'
  
  for (const cand of candidates) {
    const parts = cand?.content?.parts || []
    for (const p of parts) {
      const inlineA = p?.inlineData || p?.inline_data
      if (inlineA && inlineA.data) {
        foundBase64 = inlineA.data
        mime = inlineA.mimeType || inlineA.mime_type || mime
        break
      }
    }
    if (foundBase64) break
  }
  
  if (!foundBase64) {
    throw new Error('No image returned from Gemini')
  }
  
  return c.json({ mimeType: mime, dataBase64: foundBase64 })
}))

export default router

