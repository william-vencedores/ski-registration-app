import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../lib/adminStore'
import {
  useDisclosures,
  useAdminEvents,
  useEventDisclosuresAdmin,
  createDisclosure,
  updateDisclosure,
  deleteDisclosure,
  attachDisclosure,
  detachDisclosure,
} from '../lib/adminApi'
import type { Disclosure } from '../lib/events'
import logo from '../assets/logo.jpeg'

interface EditingDisclosure {
  id?: string
  titleEs: string
  titleEn: string
  contentEs: string
  contentEn: string
  required: boolean
}

const emptyDisclosure: EditingDisclosure = {
  titleEs: '', titleEn: '', contentEs: '', contentEn: '', required: true,
}

export default function AdminDisclosures() {
  const { user, logout } = useAdminStore()
  const navigate = useNavigate()
  const { data: disclosures, loading, refetch } = useDisclosures()
  const { data: events } = useAdminEvents()

  const [editing, setEditing] = useState<EditingDisclosure | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Event linking state
  const [linkingEventId, setLinkingEventId] = useState<string | null>(null)
  const { data: linkedDisclosures, refetch: refetchLinked } = useEventDisclosuresAdmin(linkingEventId ?? undefined)

  const handleLogout = () => { logout(); navigate('/admin/login', { replace: true }) }

  const openNew = () => { setEditing({ ...emptyDisclosure }); setIsNew(true); setError('') }
  const openEdit = (d: Disclosure) => {
    setEditing({
      id: d.id,
      titleEs: d.titleEs,
      titleEn: d.titleEn,
      contentEs: d.contentEs,
      contentEn: d.contentEn,
      required: d.required,
    })
    setIsNew(false); setError('')
  }
  const close = () => { setEditing(null); setError('') }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.titleEs.trim() && !editing.titleEn.trim()) {
      setError('At least one title is required'); return
    }
    setSaving(true); setError('')
    try {
      if (isNew) {
        await createDisclosure(editing)
      } else {
        await updateDisclosure(editing.id!, editing)
      }
      await refetch()
      close()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      setError(msg)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this disclosure? This will remove it from all events.')) return
    try {
      await deleteDisclosure(id)
      await refetch()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleAttach = async (disclosureId: string) => {
    if (!linkingEventId) return
    try {
      await attachDisclosure(linkingEventId, disclosureId, linkedDisclosures.length)
      await refetchLinked()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to attach')
    }
  }

  const handleDetach = async (disclosureId: string) => {
    if (!linkingEventId) return
    try {
      await detachDisclosure(linkingEventId, disclosureId)
      await refetchLinked()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to detach')
    }
  }

  const linkedIds = new Set(linkedDisclosures.map((d) => d.id))

  return (
    <div className="min-h-screen text-white"
         style={{ background: 'linear-gradient(160deg, #070f1e 0%, #0a1628 40%, #080e1c 100%)' }}>

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-white/8 backdrop-blur-xl bg-midnight/60
                          flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <img src={logo} alt="V" className="w-9 h-9 rounded-full object-cover
                                              shadow-[0_0_14px_rgba(232,184,75,0.35)]" />
          <div>
            <span className="font-cinzel text-sm tracking-[2px] font-bold text-white">VENCEDORES</span>
            <span className="text-[10px] tracking-widest text-glacier uppercase ml-2">Disclosures</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden sm:block">👤 {user?.username}</span>
          <button onClick={() => navigate('/admin')}
            className="text-xs text-slate-400 hover:text-white transition-colors">
            Registrations
          </button>
          <button onClick={() => navigate('/admin/events')}
            className="text-xs text-slate-400 hover:text-white transition-colors">
            Events
          </button>
          <button onClick={() => navigate('/admin/users')}
            className="text-xs text-slate-400 hover:text-white transition-colors">
            Users
          </button>
          <button onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10
                       text-slate-400 hover:text-white hover:border-white/20 transition-all">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-cinzel text-2xl font-bold tracking-widest text-white">Disclosures</h1>
            <p className="text-slate-400 text-sm mt-1">Manage legal waivers and consent forms</p>
          </div>
          <button onClick={openNew}
            className="px-4 py-2 rounded-xl text-xs font-semibold border
                       bg-glacier/20 text-glacier border-glacier/40 hover:bg-glacier/30 transition-all">
            + New Disclosure
          </button>
        </div>

        {/* Event-Disclosure linking section */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Link Disclosures to Events</h3>
          <div className="flex gap-2 flex-wrap mb-4">
            {events.map((ev) => (
              <button key={ev.id}
                onClick={() => setLinkingEventId(linkingEventId === ev.id ? null : ev.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                  ${linkingEventId === ev.id
                    ? 'bg-glacier/20 text-glacier border-glacier/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                  }`}>
                {ev.name.replace('Vencedores en la Nieve ', '')}
              </button>
            ))}
          </div>

          {linkingEventId && (
            <div className="border-t border-white/8 pt-4">
              <p className="text-xs text-slate-400 mb-3">
                Linked disclosures for <span className="text-glacier">{events.find(e => e.id === linkingEventId)?.name}</span>:
              </p>
              {disclosures.length === 0 ? (
                <p className="text-xs text-slate-500">No disclosures created yet. Create one first.</p>
              ) : (
                <div className="grid gap-2">
                  {disclosures.map((d) => {
                    const isLinked = linkedIds.has(d.id)
                    return (
                      <div key={d.id}
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.02]">
                        <div>
                          <span className="text-sm text-white">{d.titleEn || d.titleEs}</span>
                          <span className="text-[10px] text-slate-500 ml-2">v{d.version}</span>
                          {d.required && (
                            <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Required
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => isLinked ? handleDetach(d.id) : handleAttach(d.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                            ${isLinked
                              ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                              : 'bg-pine/20 text-[#7ddc9a] border-pine/40 hover:bg-pine/30'
                            }`}>
                          {isLinked ? 'Unlink' : 'Link'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Disclosures list */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-white/10 border-t-glacier rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading disclosures...</p>
          </div>
        ) : disclosures.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-slate-400 text-sm">No disclosures created yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {disclosures.map((d) => (
              <div key={d.id}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-5
                           hover:bg-white/[0.04] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                      {d.titleEn || d.titleEs}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                        v{d.version}
                      </span>
                      {d.required ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 border border-white/10">
                          Optional
                        </span>
                      )}
                    </div>
                    {d.titleEs && d.titleEn && (
                      <div className="text-xs text-slate-500 mt-0.5">ES: {d.titleEs}</div>
                    )}
                    <div className="text-xs text-slate-400 mt-1">
                      ID: {d.id}
                    </div>
                    {/* Content preview */}
                    <div className="text-xs text-slate-500 mt-2 line-clamp-2"
                         dangerouslySetInnerHTML={{ __html: (d.contentEn || d.contentEs).slice(0, 200) + '...' }} />
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(d)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-white/10
                                 text-slate-400 hover:text-white hover:border-white/20 transition-all">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(d.id)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-red-500/20
                                 text-red-400 hover:text-red-300 hover:border-red-500/40 transition-all">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-white/15 mt-8 font-cinzel tracking-widest">
          VENCEDORES SKI · ADMIN PORTAL
        </p>
      </main>

      {/* Edit/Create Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d1a2d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-cinzel text-lg font-bold text-white mb-4">
              {isNew ? 'New Disclosure' : 'Edit Disclosure'}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {isNew
                ? 'Create a new disclosure document. You can link it to events after creation.'
                : 'Editing creates a new version. Existing acceptances keep their original version.'}
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            <div className="grid gap-4">
              {/* Titles */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Title (English)</label>
                  <input value={editing.titleEn}
                    onChange={(e) => setEditing((prev) => prev ? { ...prev, titleEn: e.target.value } : prev)}
                    placeholder="Liability Waiver"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Title (Spanish)</label>
                  <input value={editing.titleEs}
                    onChange={(e) => setEditing((prev) => prev ? { ...prev, titleEs: e.target.value } : prev)}
                    placeholder="Exencion de Responsabilidad"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
              </div>

              {/* Content EN */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Content (English)</label>
                <textarea value={editing.contentEn}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, contentEn: e.target.value } : prev)}
                  placeholder="HTML content for the English version..."
                  rows={6}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier resize-none
                             font-mono text-xs" />
              </div>

              {/* Content ES */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Content (Spanish)</label>
                <textarea value={editing.contentEs}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, contentEs: e.target.value } : prev)}
                  placeholder="HTML content for the Spanish version..."
                  rows={6}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier resize-none
                             font-mono text-xs" />
              </div>

              {/* Required toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing((prev) => prev ? { ...prev, required: !prev.required } : prev)}
                  className={`w-10 h-5 rounded-full transition-colors duration-200 relative
                    ${editing.required ? 'bg-glacier' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform duration-200
                    ${editing.required ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <label className="text-sm text-slate-300">
                  Required {editing.required ? '— participants must accept this' : '— optional disclosure'}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={close}
                className="px-4 py-2 rounded-xl text-xs font-semibold border
                           bg-white/5 text-slate-400 border-white/10 hover:border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold border
                           bg-glacier/20 text-glacier border-glacier/40 hover:bg-glacier/30 transition-all
                           disabled:opacity-50">
                {saving ? 'Saving...' : isNew ? 'Create Disclosure' : 'Save & Create New Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
