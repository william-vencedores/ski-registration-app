import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'

export default function StepProgress() {
  const { currentStep } = useAppStore()
  const { t } = useTranslation()
  const steps = t.steps
  const formStep = currentStep - 1 // offset for returning user prompt at step 0

  return (
    <div className="mb-6">
      {/* Dots + Lines */}
      <div className="flex items-center">
        {steps.map((_, i) => {
          const status = i < formStep ? 'done' : i === formStep ? 'active' : 'todo'
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`step-dot ${
                status === 'done' ? 'step-dot-done'
                : status === 'active' ? 'step-dot-active'
                : 'step-dot-todo'
              }`}>
                {status === 'done' ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 transition-colors duration-300 ${
                  i < formStep ? 'bg-pine-light' : 'bg-white/10'
                }`} />
              )}
            </div>
          )
        })}
      </div>
      {/* Labels */}
      <div className="flex justify-between mt-2">
        {steps.map((label, i) => {
          const status = i < formStep ? 'done' : i === formStep ? 'active' : 'todo'
          return (
            <div
              key={i}
              className={`text-[10px] tracking-wider uppercase text-center flex-1 transition-colors duration-200 ${
                status === 'active' ? 'text-glacier font-semibold'
                : status === 'done' ? 'text-pine-light'
                : 'text-white/25'
              }`}
            >
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
