import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../lib/adminStore'
import {
  useAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../lib/adminApi'
import type { SkiEvent } from '../lib/events'
import logo from '../assets/logo.jpeg'

const emptyEvent: Partial<SkiEvent> = {
  id: '', name: '', meta: '', price: 0, processing: 0,
  badge: false, badgeText: '', active: true,
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminEvents() {
  const { user, logout } = useAdminStore()
  const navigate = useNavigate()
  const { data: events, loading, refetch } = useAdminEvents()

  const [editing, setEditing] = useState<Partial<SkiEvent> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleLogout = () => { logout(); navigate('/admin/login', { replace: true }) }

  const openNew = () => { setEditing({ ...emptyEvent }); setIsNew(true); setError('') }
  const openEdit = (ev: SkiEvent) => {
    setEditing({ ...ev })
    setIsNew(false); setError('')
  }
  const close = () => { setEditing(null); setError('') }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.name?.trim()) {
      setError('Name is required'); return
    }
    setSaving(true); setError('')
    try {
      if (isNew) {
        const slug = toSlug(editing.name!)
        await createEvent({ ...editing, id: slug })
      } else {
        await updateEvent(editing.id!, editing)
      }
      await refetch()
      close()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      setError(msg)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return
    try {
      await deleteEvent(id)
      await refetch()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const set = (field: string, value: string | number | boolean) => {
    setEditing((prev) => prev ? { ...prev, [field]: value } : prev)
  }

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
            <span className="text-[10px] tracking-widest text-glacier uppercase ml-2">Events</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden sm:block">👤 {user?.username}</span>
          <button onClick={() => navigate('/admin')}
            className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Registrations
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
            <h1 className="font-cinzel text-2xl font-bold tracking-widest text-white">Events</h1>
            <p className="text-slate-400 text-sm mt-1">Create and manage ski events</p>
          </div>
          <button onClick={openNew}
            className="px-4 py-2 rounded-xl text-xs font-semibold border
                       bg-glacier/20 text-glacier border-glacier/40 hover:bg-glacier/30 transition-all">
            + New Event
          </button>
        </div>

        {/* Events list */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-white/10 border-t-glacier rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏔️</p>
            <p className="text-slate-400 text-sm">No events created yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map((ev) => (
              <div key={ev.id}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-5
                           flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white flex items-center gap-2">
                    {ev.name}
                    {ev.active ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pine/50 text-[#7ddc9a] border border-[rgba(125,220,154,0.3)]">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{ev.meta}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ID: {ev.id} · ${ev.price} + ${ev.processing} processing
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(ev)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-white/10
                               text-slate-400 hover:text-white hover:border-white/20 transition-all">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(ev.id)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-red-500/20
                               text-red-400 hover:text-red-300 hover:border-red-500/40 transition-all">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-white/15 mt-8 font-cinzel tracking-widest">
          VENCEDORES SKI · ADMIN PORTAL
        </p>
      </main>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d1a2d] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="font-cinzel text-lg font-bold text-white mb-4">
              {isNew ? 'New Event' : 'Edit Event'}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            <div className="grid gap-3">
              {!isNew && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">ID</label>
                  <input value={editing.id || ''} disabled
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm disabled:opacity-50 focus:outline-none" />
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Name</label>
                <input value={editing.name || ''} onChange={(e) => set('name', e.target.value)}
                  placeholder="Vencedores en la Nieve 2027"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Details</label>
                <input value={editing.meta || ''} onChange={(e) => set('meta', e.target.value)}
                  placeholder="February 2027 · Location TBC"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Price ($)</label>
                  <input type="number" step="0.01" value={editing.price || 0}
                    onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Processing ($)</label>
                  <input type="number" step="0.01" value={editing.processing || 0}
                    onChange={(e) => set('processing', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Badge Text</label>
                <input value={editing.badgeText || ''} onChange={(e) => set('badgeText', e.target.value)}
                  placeholder="Upcoming"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
              </div>

              <div className="flex gap-6 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.active ?? true}
                    onChange={(e) => set('active', e.target.checked)}
                    className="w-4 h-4 rounded accent-glacier cursor-pointer" />
                  <span className="text-xs text-slate-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.badge ?? false}
                    onChange={(e) => set('badge', e.target.checked)}
                    className="w-4 h-4 rounded accent-glacier cursor-pointer" />
                  <span className="text-xs text-slate-300">Show badge</span>
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
                {saving ? 'Saving...' : isNew ? 'Create Event' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
