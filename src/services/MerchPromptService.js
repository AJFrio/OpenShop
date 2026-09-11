// Composes an image-generation prompt for merchandise mockups.
//
// A merch shot is a small set of recurring decisions — who is wearing it,
// how they are posed, what the garment is, and what is printed on it — and
// describing all four in one free-text prompt tends to lose whichever the
// model decides to skip. Naming them separately keeps each one addressable,
// and lets the reference images be labelled rather than passed as an
// undifferentiated list.
//
// Fields map to reference images by role:
//
//   model   → the person wearing it
//   product → the blank garment
//   logo    → the artwork printed on it
//
// Pose is deliberately text-only and optional: the common case is "keep the
// pose from the model reference", which is expressed by leaving it blank.

/** Roles a reference image can play, in the order they are described. */
export const REFERENCE_ROLES = ['model', 'product', 'logo']

/**
 * How many reference images the composed prompt may carry.
 *
 * Matches the cap in ImageGenerationService. Several OpenRouter models accept
 * only one reference, so raising this needs a per-model capability check
 * rather than just a bigger number.
 */
export const MAX_REFERENCES = 4

function describeRole(role) {
  switch (role) {
    case 'model':
      return 'the person who should be wearing the item'
    case 'product':
      return 'the blank garment or product being sold'
    case 'logo':
      return 'the artwork or logo to place on the item'
    default:
      return 'additional reference'
  }
}

/**
 * Build the text prompt.
 *
 * Every clause is omitted when its field is blank, rather than emitted with a
 * placeholder — "worn by an unspecified model" steers the image as much as a
 * real description would, just in a direction nobody asked for.
 */
export function composeMerchPrompt({
  description = '',
  model = '',
  pose = '',
  product = '',
  logo = '',
} = {}) {
  const clauses = []

  const subject = product.trim() || 'the product'
  clauses.push(`A product photograph of ${subject}.`)

  if (model.trim()) {
    clauses.push(`It is worn by ${model.trim()}.`)
  }
  if (pose.trim()) {
    clauses.push(`Pose: ${pose.trim()}.`)
  } else if (model.trim()) {
    // Only meaningful when there is a model reference to inherit a pose from.
    clauses.push('Keep the pose and framing from the reference image.')
  }
  if (logo.trim()) {
    clauses.push(`Printed on the item: ${logo.trim()}.`)
  }
  if (description.trim()) {
    clauses.push(description.trim())
  }

  clauses.push(
    'Photorealistic, evenly lit, plain uncluttered background, the product clearly visible and in focus.',
  )

  return clauses.join(' ')
}

/**
 * Order and cap reference images, and describe what each one is.
 *
 * Roles are emitted in REFERENCE_ROLES order so the caption list always lines
 * up with the image list — a model told "the second image is the logo" will
 * use the wrong picture if the order drifts.
 */
export function composeReferences(references = {}) {
  const ordered = []

  for (const role of REFERENCE_ROLES) {
    const entry = references[role]
    if (entry && entry.dataBase64 && entry.mimeType) {
      ordered.push({ role, ...entry })
    }
  }

  return ordered.slice(0, MAX_REFERENCES)
}

/**
 * Full prompt including a legend for the reference images.
 *
 * Without the legend the model receives several images and no indication of
 * which is the garment and which is the artwork.
 */
export function composeMerchRequest(fields = {}, references = {}) {
  const ordered = composeReferences(references)
  let prompt = composeMerchPrompt(fields)

  if (ordered.length > 0) {
    const legend = ordered
      .map((ref, index) => `Image ${index + 1} is ${describeRole(ref.role)}.`)
      .join(' ')
    prompt = `${prompt} ${legend}`
  }

  return { prompt, inputs: ordered.map(({ mimeType, dataBase64 }) => ({ mimeType, dataBase64 })) }
}
