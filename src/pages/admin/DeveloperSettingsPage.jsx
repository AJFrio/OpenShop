import { useEffect, useState } from 'react'
import { adminApiRequest, clearMustChangePassword } from '../../lib/auth'
import { Button } from '../../components/ui/button'

/**
 * Developer settings — API keys and runtime options, editable without a
 * terminal.
 *
 * Secret values are write-only: the API reports whether a key is set and
 * where it came from, never the value itself. Clearing a field removes the
 * override and falls back to the Worker binding.
 */
export function DeveloperSettingsPage() {
  const [fields, setFields] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwStatus, setPwStatus] = useState(null)
  const [pwSaving, setPwSaving] = useState(false)

  async function load() {
    const data = await adminApiRequest('/api/admin/developer-settings')
    const body = await data.json()
    setFields(body.fields)
  }

  useEffect(() => {
    load().catch((err) => setStatus({ error: err.message }))
  }, [])

  async function save() {
    setSaving(true)
    setStatus(null)
    try {
      const res = await adminApiRequest('/api/admin/developer-settings', {
        method: 'PUT',
        body: JSON.stringify(drafts),
      })
      const body = await res.json()
      setFields(body.fields)
      setDrafts({})
      setStatus({ ok: 'Saved. Changes take effect immediately.' })
    } catch (err) {
      setStatus({ error: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwSaving(true)
    setPwStatus(null)
    try {
      const res = await adminApiRequest('/api/admin/developer-settings/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Could not change password')
      }
      setCurrentPassword('')
      setNewPassword('')
      clearMustChangePassword()
      setPwStatus({ ok: 'Password changed. It applies to the next sign-in.' })
      await load()
    } catch (err) {
      setPwStatus({ error: err.message })
    } finally {
      setPwSaving(false)
    }
  }

  if (!fields) {
    return (
      <section className="admin-section">
        <h2 className="text-xl font-semibold text-[var(--admin-text-primary)]">Developer Settings</h2>
        <p className="mt-2 text-sm text-[var(--admin-text-secondary)]" aria-busy="true">Loading…</p>
      </section>
    )
  }

  const editable = fields.filter((f) => !f.isPassword)

  return (
    <section className="admin-section max-w-2xl">
      <h2 className="text-xl font-semibold text-[var(--admin-text-primary)]">Developer Settings</h2>
      <p className="mt-1.5 text-sm text-[var(--admin-text-secondary)]">
        API keys and runtime options. Values saved here take effect immediately
        and override the Worker&apos;s environment. Clear a field to go back to
        the environment value.
      </p>

      <div className="mt-5 space-y-4">
        {editable.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`ds-${field.key}`}
              className="block text-sm font-medium text-[var(--admin-text-primary)]"
            >
              {field.label}
            </label>
            <input
              id={`ds-${field.key}`}
              type={field.secret ? 'password' : 'text'}
              autoComplete="off"
              value={drafts[field.key] ?? (field.secret ? '' : field.value ?? '')}
              placeholder={
                field.secret
                  ? (field.configured ? '•••••••• (set — type to replace)' : 'Not set')
                  : 'Not set'
              }
              onChange={(e) => setDrafts({ ...drafts, [field.key]: e.target.value })}
              className="mt-1 flex h-9 w-full rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] px-3 py-2 text-sm text-[var(--admin-text-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
              {field.source === 'settings' && 'Set here.'}
              {field.source === 'environment' && 'Currently from the Worker environment.'}
              {field.source === 'unset' && 'Not configured.'}
            </p>
          </div>
        ))}
      </div>

      {status?.error && (
        <p role="alert" className="mt-4 text-sm text-[var(--admin-error)]">{status.error}</p>
      )}
      {status?.ok && (
        <p role="status" className="mt-4 text-sm text-[var(--admin-text-secondary)]">{status.ok}</p>
      )}

      <div className="mt-5">
        <Button onClick={save} disabled={saving || Object.keys(drafts).length === 0}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>

      <hr className="my-8 border-[var(--admin-border-primary)]" />

      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Admin password</h3>
      <p className="mt-1.5 text-sm text-[var(--admin-text-secondary)]">
        Changing this takes effect on the next sign-in. The current password is
        required, so an unattended session cannot be used to take the store
        over.
      </p>

      <form className="mt-4 space-y-4" onSubmit={changePassword}>
        <div>
          <label htmlFor="ds-current-pw" className="block text-sm font-medium text-[var(--admin-text-primary)]">
            Current password
          </label>
          <input
            id="ds-current-pw"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] px-3 py-2 text-sm text-[var(--admin-text-primary)]"
          />
        </div>
        <div>
          <label htmlFor="ds-new-pw" className="block text-sm font-medium text-[var(--admin-text-primary)]">
            New password
          </label>
          <input
            id="ds-new-pw"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] px-3 py-2 text-sm text-[var(--admin-text-primary)]"
          />
          <p className="mt-1 text-xs text-[var(--admin-text-muted)]">At least 8 characters.</p>
        </div>

        {pwStatus?.error && (
          <p role="alert" className="text-sm text-[var(--admin-error)]">{pwStatus.error}</p>
        )}
        {pwStatus?.ok && (
          <p role="status" className="text-sm text-[var(--admin-text-secondary)]">{pwStatus.ok}</p>
        )}

        <Button type="submit" disabled={pwSaving || !currentPassword || !newPassword}>
          {pwSaving ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </section>
  )
}
