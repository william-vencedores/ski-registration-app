import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Registration } from '../../lib/adminApi'
import { toggleAttendance, resendEmail, markAsPaid, setAmountPaid } from '../../lib/adminApi'

const SKILL_LABELS: Record<string, string> = {
  beginner: '🎿 Beginner', intermediate: '⛷️ Intermediate',
  instructor: '🏅 Instructor',
  advanced: '🏔️ Advanced', expert: '🌪️ Expert',
  freeride: '❄️ Freeride', snowboard: '🏂 Snowboard',
}

interface Props {
  reg: Registration | null
  onClose: () => void
  onUpdate: () => void
}

export default function RegistrationDetail({ reg, onClose, onUpdate }: Props) {
  const [loadingAttend, setLoadingAttend] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [loadingPaid, setLoadingPaid] = useState(false)
  const [paidInput, setPaidInput] = useState('')
  const [savingPaid, setSavingPaid] = useState(false)
  const [paidSaved, setPaidSaved] = useState(false)

  // Sync the amount-paid input whenever a different registration is opened.
  useEffect(() => {
    setPaidInput(reg ? String(reg.totalPaid ?? 0) : '')
    setPaidSaved(false)
  }, [reg?.id])

  const handleSaveAmountPaid = async () => {
    if (!reg) return
    const amt = Math.round(parseFloat(paidInput) * 100) / 100
    if (Number.isNaN(amt) || amt < 0) return
    setSavingPaid(true)
    setPaidSaved(false)
    try {
      await setAmountPaid(reg.id, amt)
      setPaidSaved(true)
      onUpdate()
    } catch (e) {
      console.error(e)
    } finally {
      setSavingPaid(false)
    }
  }

  const handleAttendance = async () => {
    if (!reg) return
    setLoadingAttend(true)
    try {
      await toggleAttendance(reg.id, !reg.attended)
      onUpdate()
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAttend(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!reg) return
    setLoadingPaid(true)
    try {
      await markAsPaid(reg.id)
      onUpdate()
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPaid(false)
    }
  }

  const handleEmail = async () => {
    if (!reg) return
    setLoadingEmail(true)
    setEmailStatus('idle')
    try {
      await resendEmail(reg.id)
      setEmailStatus('sent')
    } catch {
      setEmailStatus('error')
    } finally {
      setLoadingEmail(false)
    }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <div className="text-[10px] tracking-[2px] uppercase text-slate-500 font-semibold mb-3
                      pb-2 border-b border-white/8">
        {title}
      </div>
      {children}
    </div>
  )

  const Row = ({ label, value }: { label: string; value: string | boolean | undefined }) => (
    <div className="flex justify-between items-start py-1.5 text-sm gap-4">
      <span className="text-slate-500 flex-shrink-0 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-white text-right font-medium">{String(value ?? '—')}</span>
    </div>
  )

  return (
    <AnimatePresence>
      {reg && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50
                       bg-[#0d1f38] border-l border-white/8
                       shadow-[-20px_0_60px_rgba(0,0,0,0.5)]
                       overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0d1f38]/95 backdrop-blur-xl border-b border-white/8
                            px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-cinzel text-base tracking-widest text-white font-bold">
                  #{reg.id}
                </h3>
                <p className="text-xs text-slate-400">{reg.firstName} {reg.lastName}</p>
              </div>
              <button onClick={onClose}
                      className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15
                                 text-white/60 hover:text-white transition-all flex items-center justify-center">
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                  ${reg.attended
                    ? 'bg-pine/20 text-[#7ddc9a] border border-pine/40'
                    : 'bg-deep-sky/15 text-glacier border border-glacier/30'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${reg.attended ? 'bg-[#7ddc9a]' : 'bg-glacier'}`} />
                  {reg.attended ? 'Attended' : 'Registered'}
                </div>
                {reg.isMinor && (
                  <div className="px-3 py-1.5 rounded-full text-xs font-semibold
                                  bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    👶 Minor
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  {new Date(reg.createdAt).toLocaleDateString('es-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </div>
              </div>

              <Section title="Event & Payment">
                <Row label="Event" value={reg.eventName} />
                <Row label="Method" value={reg.paymentMethod === 'zelle' ? '🏦 Zelle' : '💳 Card'} />
                <Row label="Total Paid" value={`$${reg.totalPaid?.toFixed(2)} USD`} />
                {reg.totalOwed > 0 && (
                  <Row label="Total Owed" value={`$${reg.totalOwed?.toFixed(2)} USD`} />
                )}
                {reg.paymentMethod === 'zelle' && (reg.zelleAmount ?? 0) > 0 && (
                  <Row label="Zelle Amount" value={`$${reg.zelleAmount?.toFixed(2)} USD`} />
                )}
                {reg.paymentStatus === 'pending' && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 mt-2">
                    <span className="text-xs text-orange-400 font-semibold">
                      {reg.paymentMethod === 'zelle' ? 'Zelle payment pending verification' : 'Payment pending'}
                    </span>
                  </div>
                )}
                {reg.paymentStatus === 'partial' && (
                  <>
                    <Row label="Remaining" value={`$${(reg.totalOwed - reg.totalPaid).toFixed(2)} USD`} />
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-2">
                      <span className="text-xs text-amber-400 font-semibold">Partial Payment — balance due</span>
                    </div>
                  </>
                )}

                <div className="mt-3 bg-white/5 border border-white/10 rounded-lg px-3 py-3">
                    <label className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold">
                      {reg.paymentMethod === 'zelle' ? 'Zelle Received' : 'Amount Paid'}
                    </label>
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={paidInput}
                          onChange={(e) => { setPaidInput(e.target.value); setPaidSaved(false) }}
                          className="w-full bg-[#0d1f38] border border-white/15 rounded-lg pl-7 pr-3 py-2
                                     text-sm text-white focus:outline-none focus:border-glacier"
                        />
                      </div>
                      <button
                        onClick={handleSaveAmountPaid}
                        disabled={savingPaid}
                        className="px-4 rounded-lg text-sm font-semibold bg-glacier/20 text-glacier
                                   border border-glacier/40 hover:bg-glacier/30 transition-all
                                   disabled:opacity-50 flex items-center justify-center"
                      >
                        {savingPaid
                          ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                          : paidSaved ? '✓ Saved' : 'Save'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                      Total amount received for this registration. Saving updates the payment status automatically.
                    </p>
                  </div>

                <Row label="Signature" value={reg.signature} />
              </Section>

              <Section title="Personal Info">
                <Row label="Name" value={`${reg.firstName} ${reg.lastName}`} />
                <Row label="Email" value={reg.email} />
                <Row label="Phone" value={reg.phone} />
                <Row label="DOB" value={reg.dob} />
                {reg.isMinor && reg.guardianName && (
                  <Row label="Guardian" value={`${reg.guardianName} (#${reg.guardianRegId})`} />
                )}
              </Section>

              <Section title="Emergency Contact">
                <Row label="Contact" value={reg.emergencyName} />
                <Row label="Phone" value={reg.emergencyPhone} />
                <Row label="Relationship" value={reg.emergencyRelation} />
              </Section>

              <Section title="Ski & Diet">
                <Row label="Level" value={SKILL_LABELS[reg.skillLevel] ?? reg.skillLevel} />
                {reg.dietary && <Row label="Dietary" value={reg.dietary} />}
              </Section>

              <Section title="Medical Info">
                <Row label="Conditions" value={reg.medConditions === 'yes' ? '⚠️ Yes' : 'No'} />
                <Row label="Allergies" value={reg.medAllergies === 'yes' ? '⚠️ Yes' : 'No'} />
                <Row label="Medications" value={reg.medMedications === 'yes' ? '⚠️ Yes' : 'No'} />
              </Section>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-2">
                {(reg.paymentStatus === 'pending' || reg.paymentStatus === 'partial') && (
                  <button
                    onClick={handleMarkPaid}
                    disabled={loadingPaid}
                    className="w-full py-3 rounded-xl font-semibold text-sm
                               bg-pine/20 text-[#7ddc9a] border border-pine/40
                               hover:bg-pine/30 transition-all duration-200
                               flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loadingPaid
                      ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      : '✓ Mark as Paid'
                    }
                  </button>
                )}

                <button
                  onClick={handleAttendance}
                  disabled={loadingAttend}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
                    flex items-center justify-center gap-2 disabled:opacity-50
                    ${reg.attended
                      ? 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25'
                      : 'bg-pine/20 text-[#7ddc9a] border border-pine/40 hover:bg-pine/30'
                    }`}
                >
                  {loadingAttend
                    ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : reg.attended ? '✗ Remove Attendance' : '✓ Mark Attended'
                  }
                </button>

                <button
                  onClick={handleEmail}
                  disabled={loadingEmail}
                  className="w-full py-3 rounded-xl font-semibold text-sm
                             bg-deep-sky/15 text-glacier border border-glacier/30
                             hover:bg-deep-sky/25 transition-all duration-200
                             flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingEmail
                    ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : emailStatus === 'sent' ? '✓ Email Sent!'
                    : emailStatus === 'error' ? '⚠️ Failed to send'
                    : '📧 Resend Confirmation'
                  }
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
