import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../lib/adminStore'
import logo from '../assets/logo.jpeg'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAdminStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/admin', { replace: true })
    } catch {
      setError('Credenciales inválidas / Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center px-4"
         style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2340 50%, #0a1628 100%)' }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{ backgroundImage: 'linear-gradient(rgba(122,184,217,1) 1px, transparent 1px), linear-gradient(90deg, rgba(122,184,217,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl rounded-3xl border border-white/10
                        shadow-[0_30px_80px_rgba(0,0,0,0.6)] p-8">
          {/* Logo + header */}
          <div className="text-center mb-8">
            <img src={logo} alt="Vencedores" className="w-16 h-16 rounded-full object-cover mx-auto mb-4
                         shadow-[0_0_30px_rgba(232,184,75,0.4),0_0_0_2px_rgba(232,184,75,0.2)]" />
            <h1 className="font-cinzel text-xl tracking-[3px] font-bold text-white">VENCEDORES</h1>
            <p className="text-[11px] tracking-[2px] uppercase text-glacier mt-1">Admin Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-widest uppercase text-slate-400 mb-1.5">
                Usuario / Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5
                           text-white placeholder-white/20 text-sm
                           focus:outline-none focus:border-glacier focus:ring-2 focus:ring-glacier/20
                           transition-all duration-200"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-widest uppercase text-slate-400 mb-1.5">
                Contraseña / Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5
                           text-white placeholder-white/20 text-sm
                           focus:outline-none focus:border-glacier focus:ring-2 focus:ring-glacier/20
                           transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30
                              rounded-xl px-4 py-3 text-sm text-red-300">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl font-semibold text-sm text-white
                         bg-gradient-to-br from-deep-sky to-[#174f7a]
                         shadow-[0_6px_20px_rgba(30,91,138,0.4)]
                         hover:shadow-[0_8px_28px_rgba(30,91,138,0.6)]
                         hover:-translate-y-px transition-all duration-200
                         disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                '🔐 Iniciar Sesión'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-5">
          Acceso restringido · Authorized personnel only
        </p>
      </div>
    </div>
  )
}
