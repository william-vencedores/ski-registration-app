import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../lib/adminStore'
import {
  useAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type AdminUser,
} from '../lib/adminApi'
import logo from '../assets/logo.jpeg'

interface EditingUser {
  username: string
  displayName: string
  password: string
}

const emptyUser: EditingUser = { username: '', displayName: '', password: '' }

export default function AdminUsers() {
  const { user, logout } = useAdminStore()
  const navigate = useNavigate()
  const { data: users, loading, refetch } = useAdminUsers()

  const [editing, setEditing] = useState<EditingUser | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleLogout = () => { logout(); navigate('/admin/login', { replace: true }) }

  const openNew = () => { setEditing({ ...emptyUser }); setIsNew(true); setError('') }
  const openEdit = (u: AdminUser) => {
    setEditing({ username: u.username, displayName: u.displayName, password: '' })
    setIsNew(false); setError('')
  }
  const close = () => { setEditing(null); setError('') }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.username.trim()) { setError('Username is required'); return }
    if (isNew && !editing.password.trim()) { setError('Password is required'); return }
    setSaving(true); setError('')
    try {
      if (isNew) {
        await createAdminUser({
          username: editing.username,
          password: editing.password,
          displayName: editing.displayName || undefined,
        })
      } else {
        await updateAdminUser(editing.username, {
          password: editing.password || undefined,
          displayName: editing.displayName || undefined,
        })
      }
      await refetch()
      close()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      setError(msg)
    } finally { setSaving(false) }
  }

  const handleDelete = async (username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return
    try {
      await deleteAdminUser(username)
      await refetch()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
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
            <span className="text-[10px] tracking-widest text-glacier uppercase ml-2">Users</span>
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
          <button onClick={() => navigate('/admin/disclosures')}
            className="text-xs text-slate-400 hover:text-white transition-colors">
            Disclosures
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
            <h1 className="font-cinzel text-2xl font-bold tracking-widest text-white">Admin Users</h1>
            <p className="text-slate-400 text-sm mt-1">Manage admin access</p>
          </div>
          <button onClick={openNew}
            className="px-4 py-2 rounded-xl text-xs font-semibold border
                       bg-glacier/20 text-glacier border-glacier/40 hover:bg-glacier/30 transition-all">
            + New User
          </button>
        </div>

        {/* Users list */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-white/10 border-t-glacier rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-slate-400 text-sm">No admin users found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((u) => (
              <div key={u.username}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-5
                           flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
                <div className="w-10 h-10 rounded-full bg-glacier/20 border border-glacier/30
                               flex items-center justify-center text-glacier font-bold text-sm flex-shrink-0">
                  {u.displayName?.[0]?.toUpperCase() || u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white flex items-center gap-2">
                    {u.displayName || u.username}
                    {u.username === user?.username && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-glacier/20 text-glacier border border-glacier/30">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    @{u.username}
                    {u.lastLogin && ` · Last login: ${new Date(u.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(u)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-white/10
                               text-slate-400 hover:text-white hover:border-white/20 transition-all">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(u.username)}
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
          <div className="bg-[#0d1a2d] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="font-cinzel text-lg font-bold text-white mb-4">
              {isNew ? 'New Admin User' : 'Edit User'}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}

            <div className="grid gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Username</label>
                <input value={editing.username} disabled={!isNew}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, username: e.target.value } : prev)}
                  placeholder="admin"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier
                             disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Display Name</label>
                <input value={editing.displayName}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, displayName: e.target.value } : prev)}
                  placeholder="John Doe"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Password {!isNew && <span className="text-slate-500 normal-case">(leave blank to keep current)</span>}
                </label>
                <input type="password" value={editing.password}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, password: e.target.value } : prev)}
                  placeholder={isNew ? 'Required' : 'Optional'}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm focus:outline-none focus:border-glacier" />
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
                {saving ? 'Saving...' : isNew ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
