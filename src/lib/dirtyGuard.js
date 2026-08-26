let checkDirty = null

export function registerDirtyGuard(fn) {
  checkDirty = typeof fn === 'function' ? fn : null
  return () => {
    if (checkDirty === fn) checkDirty = null
  }
}

export function confirmLeaveIfDirty() {
  if (!checkDirty || !checkDirty()) return true
  return window.confirm('Discard unsaved changes?')
}
