import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../lib/adminStore'
import { useRegistrations, useAdminEvents, type Registration } from '../lib/adminApi'
import StatsCards from '../components/admin/StatsCards'
import RegistrationDetail from '../components/admin/RegistrationDetail'
import logo from '../assets/logo.jpeg'

const SKILL_ICONS: Record<string, string> = {
  beginner: '🎿', intermediate: '⛷️', advanced: '🏔️',
  expert: '🌪️', freeride: '❄️', snowboard: '🏂',
}

export default function AdminDashboard() {
  const { user, logout } = useAdminStore()
  const navigate = useNavigate()

  const [eventFilter, setEventFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Registration | null>(null)

  const { data: events } = useAdminEvents()
  const { data, loading, error, refetch } = useRegistrations(eventFilter || undefined)

  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  const filtered = data.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    )
  })

  const handleUpdate = () => {
    refetch()
    if (selected) {
      // Re-find updated record
      const updated = data.find((r) => r.id === selected.id)
      setSelected(updated ?? null)
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
            <span className="text-[10px] tracking-widest text-glacier uppercase ml-2">Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 hidden sm:block">
            👤 {user?.username}
          </span>
          <button onClick={() => navigate('/admin/events')}
            className="text-xs text-slate-400 hover:text-white transition-colors">
            Events
          </button>
          <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Main Site
          </a>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10
                       text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="font-cinzel text-2xl font-bold tracking-widest text-white">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Registration & payment management · Vencedores Ski Group
          </p>
        </div>

        {/* Stats */}
        <StatsCards />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Event filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setEventFilter('')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                ${!eventFilter
                  ? 'bg-glacier/20 text-glacier border-glacier/40'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                }`}
            >
              All Events
            </button>
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setEventFilter(ev.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150
                  ${eventFilter === ev.id
                    ? 'bg-glacier/20 text-glacier border-glacier/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
              >
                {ev.name.replace('Vencedores en la Nieve ', '')}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative sm:ml-auto">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, #ID..."
              className="w-full sm:w-72 pl-9 pr-4 py-2 rounded-xl border border-white/10
                         bg-white/5 text-white text-sm placeholder-slate-500
                         focus:outline-none focus:border-glacier focus:ring-1 focus:ring-glacier/20"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/8 overflow-hidden
                        shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {/* Table header */}
          <div className="bg-white/[0.03] border-b border-white/8 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
              {loading ? 'Loading...' : `${filtered.length} registration${filtered.length !== 1 ? 's' : ''}`}
            </span>
            <button
              onClick={refetch}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              title="Actualizar"
            >
              ↺ Refresh
            </button>
          </div>

          {error ? (
            <div className="px-6 py-12 text-center text-red-400 text-sm">⚠️ {error}</div>
          ) : loading ? (
            <div className="px-6 py-16 text-center">
              <div className="w-8 h-8 border-2 border-white/10 border-t-glacier rounded-full
                              animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading registrations...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-4xl mb-3">🏔️</p>
              <p className="text-slate-400 text-sm">
                {data.length === 0
                  ? 'No registrations yet'
                  : 'No results for your search'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    {['#ID', 'Name', 'Event', 'Level', 'Paid', 'Payment', 'Status', 'Date', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] tracking-widest
                                              uppercase text-slate-500 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg, i) => (
                    <tr
                      key={reg.id}
                      onClick={() => setSelected(reg)}
                      className={`border-b border-white/5 last:border-0 cursor-pointer
                                  transition-colors duration-100 group
                                  ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}
                                  hover:bg-glacier/8`}
                    >
                      {/* ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-glacier font-semibold">
                          #{reg.id}
                        </span>
                      </td>

                      {/* Name + email */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white whitespace-nowrap">
                          {reg.firstName} {reg.lastName}
                        </div>
                        <div className="text-xs text-slate-500">{reg.email}</div>
                      </td>

                      {/* Event */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-slate-400">
                          {reg.eventName.replace('Vencedores en la Nieve ', '')}
                        </span>
                      </td>

                      {/* Skill level */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-base" title={reg.skillLevel}>
                          {SKILL_ICONS[reg.skillLevel] ?? '—'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-cinzel text-sm text-gold-light">
                          ${reg.totalPaid?.toFixed(2)}
                        </span>
                        {reg.totalOwed > 0 && reg.totalPaid < reg.totalOwed && (
                          <span className="text-[10px] text-slate-500 block">
                            / ${reg.totalOwed?.toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Payment status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                          rounded-full text-[10px] font-semibold border
                          ${reg.paymentStatus === 'partial'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-pine/20 text-[#7ddc9a] border-pine/40'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                            ${reg.paymentStatus === 'partial' ? 'bg-amber-400' : 'bg-[#7ddc9a]'}`} />
                          {reg.paymentStatus === 'partial' ? 'Partial' : 'Paid'}
                        </span>
                      </td>

                      {/* Attendance */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                          rounded-full text-[10px] font-semibold border
                          ${reg.attended
                            ? 'bg-pine/20 text-[#7ddc9a] border-pine/40'
                            : 'bg-deep-sky/10 text-glacier border-glacier/20'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                            ${reg.attended ? 'bg-[#7ddc9a]' : 'bg-glacier'}`} />
                          {reg.attended ? 'Attended' : 'Registered'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        {new Date(reg.createdAt).toLocaleDateString('es-US', {
                          month: 'short', day: 'numeric', year: '2-digit',
                        })}
                      </td>

                      {/* Arrow */}
                      <td className="px-4 py-3.5 text-slate-600 group-hover:text-slate-300
                                     transition-colors text-right pr-5">
                        →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-white/15 mt-8 font-cinzel tracking-widest">
          VENCEDORES SKI · ADMIN PORTAL
        </p>
      </main>

      {/* Slide-over detail panel */}
      <RegistrationDetail
        reg={selected}
        onClose={() => setSelected(null)}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
