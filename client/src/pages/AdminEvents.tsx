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
  id: '', icon: '', nameEs: '', nameEn: '', metaEs: '', metaEn: '',
  price: 0, processing: 0, badge: false, badgeEs: '', badgeEn: '', active: true,
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
  const openEdit = (ev: SkiEvent) => { setEditing({ ...ev }); setIsNew(false); setError('') }
  const close = () => { setEditing(null); setError('') }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.id?.trim() || !editing.nameEs?.trim()) {
      setError('ID y Nombre (ES) son requeridos'); return
    }
    setSaving(true); setError('')
    try {
      if (isNew) {
        await createEvent(editing)
      } else {
        await updateEvent(editing.id!, editing)
      }
      await refetch()
      close()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setError(msg)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este evento?')) return
    try {
      await deleteEvent(id)
      await refetch()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
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
            <span className="text-[10px] tracking-widest text-glacier uppercase ml-2">Eventos</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden sm:block">👤 {user?.username}</span>
          <button onClick={() => navigate('/admin')}
            className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Registros
          </button>
          <button onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10
                       text-slate-400 hover:text-white hover:border-white/20 transition-all">
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-cinzel text-2xl font-bold tracking-widest text-white">Eventos</h1>
            <p className="text-slate-400 text-sm mt-1">Crear y administrar eventos de ski</p>
          </div>
          <button onClick={openNew}
            className="px-4 py-2 rounded-xl text-xs font-semibold border
                       bg-glacier/20 text-glacier border-glacier/40 hover:bg-glacier/30 transition-all">
            + Nuevo Evento
          </button>
        </div>

        {/* Events list */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-white/10 border-t-glacier rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Cargando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏔️</p>
            <p className="text-slate-400 text-sm">No hay eventos creados</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map((ev) => (
              <div key={ev.id}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-5
                           flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
                <span className="text-3xl">{ev.icon || '🎿'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white flex items-center gap-2">
                    {ev.nameEs}
                    {ev.active ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pine/50 text-[#7ddc9a] border border-[rgba(125,220,154,0.3)]">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{ev.nameEn}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ID: {ev.id} · ${ev.price} + ${ev.processing} procesamiento
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(ev)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-white/10
                               text-slate-400 hover:text-white hover:border-white/20 transition-all">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(ev.id)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-red-500/20
                               text-red-400 hover:text-red-300 hover:border-red-500/40 transition-all">
                    Eliminar
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
              {isNew ? 'Nuevo Evento' : 'Editar Evento'}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">ID</label>
                  <input value={editing.id || ''} onChange={(e) => set('id', e.target.value)}
                    disabled={!isNew}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm disabled:opacity-50 focus:outline-none focus:border-glacier" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Icono</label>
                  <input value={editing.icon || ''} onChange={(e) => set('icon', e.target.value)}
                    placeholder="⛷️"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Nombre (ES)</label>
                <input value={editing.nameEs || ''} onChange={(e) => set('nameEs', e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Nombre (EN)</label>
                <input value={editing.nameEn || ''} onChange={(e) => set('nameEn', e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Meta (ES)</label>
                <input value={editing.metaEs || ''} onChange={(e) => set('metaEs', e.target.value)}
                  placeholder="Febrero 2027 · Ubicación por confirmar"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Meta (EN)</label>
                <input value={editing.metaEn || ''} onChange={(e) => set('metaEn', e.target.value)}
                  placeholder="February 2027 · Location TBC"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Precio ($)</label>
                  <input type="number" step="0.01" value={editing.price || 0}
                    onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Procesamiento ($)</label>
                  <input type="number" step="0.01" value={editing.processing || 0}
                    onChange={(e) => set('processing', parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Badge (ES)</label>
                  <input value={editing.badgeEs || ''} onChange={(e) => set('badgeEs', e.target.value)}
                    placeholder="Próximo"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Badge (EN)</label>
                  <input value={editing.badgeEn || ''} onChange={(e) => set('badgeEn', e.target.value)}
                    placeholder="Upcoming"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               text-white text-sm focus:outline-none focus:border-glacier" />
                </div>
              </div>

              <div className="flex gap-6 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.active ?? true}
                    onChange={(e) => set('active', e.target.checked)}
                    className="w-4 h-4 rounded accent-glacier cursor-pointer" />
                  <span className="text-xs text-slate-300">Activo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.badge ?? false}
                    onChange={(e) => set('badge', e.target.checked)}
                    className="w-4 h-4 rounded accent-glacier cursor-pointer" />
                  <span className="text-xs text-slate-300">Mostrar badge</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={close}
                className="px-4 py-2 rounded-xl text-xs font-semibold border
                           bg-white/5 text-slate-400 border-white/10 hover:border-white/20 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold border
                           bg-glacier/20 text-glacier border-glacier/40 hover:bg-glacier/30 transition-all
                           disabled:opacity-50">
                {saving ? 'Guardando...' : isNew ? 'Crear Evento' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
