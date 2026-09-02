// Image generation, over either the Gemini API directly or OpenRouter.
//
// Two providers rather than one, because they are good at different things:
//
// - **gemini** talks to Google directly. Cheapest route to Nano Banana 2,
//   since OpenRouter's token rate matches Google's but its credit purchases
//   carry a ~5.5% fee. Needs GEMINI_API_KEY.
// - **openrouter** reaches ~48 image models across ByteDance, Black Forest,
//   Qwen, Recraft, Sourceful and Google behind one key. Useful for trying a
//   cheaper or better-suited model without opening a billing relationship
//   with each vendor. Needs OPENROUTER_API_KEY.
//
// Both return { mimeType, dataBase64 }, so the admin UI does not care which
// one served the request.

/** Default when nothing is configured. GA, and strong on product imagery. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-image'

/** Default OpenRouter model. Same underlying model as the Gemini default. */
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3.1-flash-image'

/**
 * Reference images are capped at 4 because that is what the admin UI sends.
 * Most capable models accept far more (Gemini and Seedream take 14), but a
 * few take exactly 4 or fewer — see the model's endpoint metadata at
 * /api/v1/images/models/<id>/endpoints before raising this.
 */
const MAX_REFERENCE_IMAGES = 4

export class ImageGenerationError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name = 'ImageGenerationError'
    this.statusCode = statusCode
  }
}

function normaliseReferences(inputs) {
  if (!Array.isArray(inputs)) return []
  return inputs
    .slice(0, MAX_REFERENCE_IMAGES)
    .filter((item) => item && item.dataBase64 && item.mimeType)
}

/**
 * Generate via Google's Gemini API.
 *
 * gemini-2.5-flash-image-preview, which this endpoint used to name, was shut
 * down on 2026-01-15; requests to it fail outright.
 */
async function generateWithGemini({ apiKey, model, prompt, references }) {
  const parts = [{ text: prompt }]
  for (const item of references) {
    parts.push({
      inline_data: { mime_type: item.mimeType, data: item.dataBase64 },
    })
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('Gemini API error', res.status, detail)
    throw new ImageGenerationError(`Gemini API failed: ${detail}`, 502)
  }

  const data = await res.json()
  for (const candidate of data?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      const inline = part?.inlineData || part?.inline_data
      if (inline?.data) {
        return {
          dataBase64: inline.data,
          mimeType: inline.mimeType || inline.mime_type || 'image/png',
        }
      }
    }
  }

  throw new ImageGenerationError('No image returned from Gemini', 502)
}

/**
 * Generate via OpenRouter's unified image endpoint.
 *
 * A dedicated /api/v1/images endpoint, not /chat/completions — the latter
 * reaches image models only through a server tool, which costs an extra LLM
 * pass and hides the generation parameters.
 */
async function generateWithOpenRouter({ apiKey, model, prompt, references, siteUrl }) {
  const body = { model, prompt }

  if (references.length > 0) {
    body.input_references = references.map((item) => ({
      type: 'image_url',
      image_url: { url: `data:${item.mimeType};base64,${item.dataBase64}` },
    }))
  }

  const res = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Optional attribution headers; OpenRouter uses them for its rankings.
      ...(siteUrl ? { 'HTTP-Referer': siteUrl } : {}),
      'X-Title': 'OpenShop',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('OpenRouter image API error', res.status, detail)
    throw new ImageGenerationError(`OpenRouter image generation failed: ${detail}`, 502)
  }

  const data = await res.json()
  const first = data?.data?.[0]
  if (!first?.b64_json) {
    throw new ImageGenerationError('No image returned from OpenRouter', 502)
  }

  return {
    dataBase64: first.b64_json,
    // Output format varies by model, so trust what came back.
    mimeType: first.media_type || 'image/png',
  }
}

/**
 * Generate an image with whichever provider is configured.
 *
 * @returns {Promise<{ mimeType: string, dataBase64: string }>}
 */
export async function generateImage({
  provider,
  geminiApiKey,
  openRouterApiKey,
  geminiModel,
  openRouterModel,
  prompt,
  inputs,
  siteUrl,
}) {
  const references = normaliseReferences(inputs)

  // Explicit choice wins. Otherwise prefer whichever key exists, so a store
  // that has only ever set one of them just works.
  let resolved = provider
  if (resolved !== 'gemini' && resolved !== 'openrouter') {
    resolved = geminiApiKey ? 'gemini' : (openRouterApiKey ? 'openrouter' : null)
  }

  if (resolved === 'gemini') {
    if (!geminiApiKey) {
      throw new ImageGenerationError('GEMINI_API_KEY is not configured', 400)
    }
    return generateWithGemini({
      apiKey: geminiApiKey,
      model: geminiModel || DEFAULT_GEMINI_MODEL,
      prompt,
      references,
    })
  }

  if (resolved === 'openrouter') {
    if (!openRouterApiKey) {
      throw new ImageGenerationError('OPENROUTER_API_KEY is not configured', 400)
    }
    return generateWithOpenRouter({
      apiKey: openRouterApiKey,
      model: openRouterModel || DEFAULT_OPENROUTER_MODEL,
      prompt,
      references,
      siteUrl,
    })
  }

  throw new ImageGenerationError(
    'Image generation is not configured. Add a Gemini or OpenRouter API key in Developer Settings.',
    400,
  )
}
