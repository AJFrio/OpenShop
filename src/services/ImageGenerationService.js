// Image generation via OpenRouter.
//
// OpenRouter reaches ~48 image models across ByteDance, Black Forest Labs,
// Qwen, Recraft, Sourceful and Google behind one key, so a store can pick a
// cheaper or better-suited model without opening a billing relationship with
// each vendor. Needs OPENROUTER_API_KEY.
//
// Returns { mimeType, dataBase64 }.

/** Default when nothing is configured. Strong on product imagery. */
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
 * Generate an image via OpenRouter.
 *
 * `provider` and the Gemini-specific keys are accepted and ignored so
 * existing settings in KV stay harmless until cleared.
 *
 * @returns {Promise<{ mimeType: string, dataBase64: string }>}
 */
export async function generateImage({
  provider, // eslint-disable-line no-unused-vars
  openRouterApiKey,
  openRouterModel,
  prompt,
  inputs,
  siteUrl,
}) {
  if (!openRouterApiKey) {
    throw new ImageGenerationError('OPENROUTER_API_KEY is not configured. Add it in Developer Settings.', 400)
  }
  return generateWithOpenRouter({
    apiKey: openRouterApiKey,
    model: openRouterModel || DEFAULT_OPENROUTER_MODEL,
    prompt,
    references: normaliseReferences(inputs),
    siteUrl,
  })
}
