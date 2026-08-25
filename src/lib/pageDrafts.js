const DRAFT_PREFIX = 'openshop:page-draft:'

function isStorageAvailable() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function draftKey(slug) {
  return `${DRAFT_PREFIX}${slug}`
}

export function loadDraft(slug) {
  if (!isStorageAvailable()) return null
  try {
    const raw = window.localStorage.getItem(draftKey(slug))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null
    return {
      data: parsed.data,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
    }
  } catch {
    return null
  }
}

export function saveDraft(slug, data) {
  if (!isStorageAvailable()) return false
  try {
    window.localStorage.setItem(
      draftKey(slug),
      JSON.stringify({ data, savedAt: new Date().toISOString() })
    )
    return true
  } catch {
    return false
  }
}

export function clearDraft(slug) {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.removeItem(draftKey(slug))
  } catch {}
}

export function isDraftNewer(draft, publishedUpdatedAt) {
  if (!draft?.savedAt) return false
  if (!publishedUpdatedAt) return true
  return new Date(draft.savedAt).getTime() > new Date(publishedUpdatedAt).getTime()
}
