import { useStats } from '../../lib/adminApi'

export default function StatsCards() {
  const { data, loading } = useStats()

  const cards = [
    {
      label: 'Total Registrados',
      value: loading ? '—' : data?.totalRegistrations ?? 0,
      icon: '👥',
      color: 'from-deep-sky/20 to-glacier/10',
      border: 'border-glacier/20',
    },
    {
      label: 'Ingresos Totales',
      value: loading ? '—' : `$${(data?.totalRevenue ?? 0).toFixed(2)}`,
      icon: '💰',
      color: 'from-pine/20 to-pine-light/10',
      border: 'border-pine/30',
    },
    {
      label: 'Eventos Activos',
      value: loading ? '—' : data?.events.length ?? 0,
      icon: '🏔️',
      color: 'from-gold/20 to-gold-light/10',
      border: 'border-gold/30',
    },
    {
      label: 'Asistencia Marcada',
      value: loading ? '—' : data?.events.reduce((s, e) => s + e.attended, 0) ?? 0,
      icon: '✅',
      color: 'from-purple-500/20 to-purple-400/10',
      border: 'border-purple-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label}
             className={`bg-gradient-to-br ${c.color} border ${c.border}
                         rounded-2xl p-5 backdrop-blur-sm`}>
          <div className="text-2xl mb-2">{c.icon}</div>
          <div className="font-cinzel text-2xl font-bold text-white">{c.value}</div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  )
}
