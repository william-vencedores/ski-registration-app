import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../lib/store'
import { useTranslation } from '../../hooks/useTranslation'
import type { FormData } from '../../lib/events'
import StepProgress from '../ui/StepProgress'
import Step1Personal from './Step1Personal'
import Step2Emergency from './Step2Emergency'
import Step3Level from './Step3Level'
import Step4Medical from './Step4Medical'
import Step5Documents from './Step5Documents'
import Step6Payment from './Step6Payment'
import SuccessScreen from './SuccessScreen'

const stepTitles = (t: ReturnType<typeof import('../../hooks/useTranslation').useTranslation>['t']) => [
  { title: t.s1Title, sub: t.s1Sub },
  { title: t.s2Title, sub: t.s2Sub },
  { title: t.s3Title, sub: t.s3Sub },
  { title: t.s4Title, sub: t.s4Sub },
  { title: t.s5Title, sub: t.s5Sub },
  { title: t.s6Title, sub: t.s6Sub },
]

function validate(step: number, formData: FormData, t: ReturnType<typeof import('../../hooks/useTranslation').useTranslation>['t']) {
  const errors: Record<string, string> = {}
  if (step === 0) {
    if (!formData.firstName.trim()) errors.firstName = t.required
    if (!formData.lastName.trim()) errors.lastName = t.required
    if (!formData.email.trim()) errors.email = t.required
    if (!formData.phone.trim()) errors.phone = t.required
    if (!formData.dob) errors.dob = t.required
    if (!formData.city.trim()) errors.city = t.required
    if (!formData.state.trim()) errors.state = t.required
  }
  if (step === 1) {
    if (!formData.emergencyName.trim()) errors.emergencyName = t.required
    if (!formData.emergencyPhone.trim()) errors.emergencyPhone = t.required
    if (!formData.emergencyRelation || formData.emergencyRelation === '—') errors.emergencyRelation = t.required
  }
  if (step === 2) {
    if (!formData.skillLevel) errors.skillLevel = t.skillRequired
  }
  if (step === 4) {
    if (!formData.liabilityAccepted || !formData.medicalAccepted) errors.waivers = t.acceptBoth
    if (!formData.signature.trim()) errors.signature = t.signRequired
  }
  return errors
}

export default function RegistrationForm() {
  const { currentStep, setCurrentStep, formData, selectedEvent } = useAppStore()
  const { t } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dir, setDir] = useState(1)
  const formRef = useRef<HTMLDivElement>(null)

  // Reset errors when step changes
  useEffect(() => { setErrors({}) }, [currentStep])

  if (!selectedEvent) return null

  const isSuccess = currentStep === 6
  const titles = stepTitles(t)
  const currentTitle = !isSuccess ? titles[currentStep] : null

  const goNext = () => {
    const errs = validate(currentStep, formData, t)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setDir(1)
    setCurrentStep(currentStep + 1)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goBack = () => {
    setDir(-1)
    setCurrentStep(currentStep - 1)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const stepComponents = [
    <Step1Personal errors={errors} />,
    <Step2Emergency errors={errors} />,
    <Step3Level errors={errors} />,
    <Step4Medical errors={errors} />,
    <Step5Documents errors={errors} />,
    <Step6Payment />,
  ]

  return (
    <div
      id="registration-form"
      ref={formRef}
      className="px-4 pb-24 max-w-2xl mx-auto w-full"
    >
      <div className="card">
        {isSuccess ? (
          <SuccessScreen />
        ) : (
          <>
            <StepProgress />

            {/* Step header */}
            <div className="mb-5">
              <h2 className="card-title">{currentTitle?.title}</h2>
              <p className="card-subtitle">{currentTitle?.sub}</p>
              <div className="section-sep">
                <span>{t.steps[currentStep]}</span>
              </div>
            </div>

            {/* Step body with animation */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ x: dir * 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: dir * -40, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
              >
                {stepComponents[currentStep]}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons — skip for payment step (has its own submit) */}
            {currentStep < 5 && (
              <div className={`flex gap-3 mt-7 ${currentStep === 0 ? 'justify-end' : 'justify-between'}`}>
                {currentStep > 0 && (
                  <button type="button" onClick={goBack} className="btn-ghost">
                    {t.back}
                  </button>
                )}
                <button type="button" onClick={goNext} className="btn-primary">
                  {t.next}
                </button>
              </div>
            )}
            {currentStep === 5 && (
              <div className="flex justify-start mt-5">
                <button type="button" onClick={goBack} className="btn-ghost">
                  {t.back}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
