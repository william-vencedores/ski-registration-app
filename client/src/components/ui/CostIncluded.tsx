import { useTranslation } from '../../hooks/useTranslation'
import { useAppStore } from '../../lib/store'

type Item = { icon?: string; label: string }

// Turn an admin free-text override (one item per line) into a list, falling
// back to the language-specific default when no override is set.
function resolveItems(override: string | undefined, fallback: readonly Item[]): Item[] {
  const trimmed = override?.trim()
  if (trimmed) {
    return trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({ label }))
  }
  return fallback.map((i) => ({ icon: i.icon, label: i.label }))
}

// Shows what the registration fee covers, plus costs paid separately at the
// mountain (lift ticket, equipment). Each event may override either list with
// its own free text from the admin editor.
export default function CostIncluded() {
  const { t } = useTranslation()
  const { selectedEvent } = useAppStore()

  const included = resolveItems(selectedEvent?.costIncludes, t.costItems)
  const extra = resolveItems(selectedEvent?.costExtra, t.costExtraItems)

  if (included.length === 0 && extra.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {included.length > 0 && (
        <div className="rounded-xl border border-glacier/30 bg-[#f0f7fc] px-5 py-4">
          <div className="font-semibold text-sm text-slate-800">{t.costTitle}</div>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">{t.costSub}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {included.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="flex-shrink-0">{item.icon ?? '✅'}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {extra.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="font-semibold text-sm text-amber-800">{t.costExtraTitle}</div>
          <p className="text-xs text-amber-700 mt-0.5 mb-3">{t.costExtraSub}</p>
          <ul className="flex flex-col gap-2">
            {extra.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-amber-900">
                <span className="flex-shrink-0">{item.icon ?? '➕'}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
