import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Registration, RegistrationEdit } from '../../lib/adminApi'
import { toggleAttendance, resendEmail, markAsPaid, setAmountPaid, updateRegistration, deleteRegistration } from '../../lib/adminApi'
import { formatPhone, isValidPhone } from '../../lib/phone'
import { isValidEmail } from '../../lib/email'

const EMPTY_EDIT: RegistrationEdit = {
  firstName: '', lastName: '', email: '', phone: '', dob: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
}

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

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<RegistrationEdit>(EMPTY_EDIT)
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Sync inputs whenever a different registration is opened.
  useEffect(() => {
    setPaidInput(reg ? String(reg.totalPaid ?? 0) : '')
    setPaidSaved(false)
    setEditing(false)
    setEditError('')
    setConfirmDelete(false)
    setForm(reg ? {
      firstName: reg.firstName, lastName: reg.lastName, email: reg.email,
      phone: reg.phone, dob: reg.dob, emergencyName: reg.emergencyName,
      emergencyPhone: reg.emergencyPhone, emergencyRelation: reg.emergencyRelation,
    } : EMPTY_EDIT)
  }, [reg?.id])

  const setField = (key: keyof RegistrationEdit, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSaveEdit = async () => {
    if (!reg) return
    setEditError('')
    if (!form.firstName?.trim() || !form.lastName?.trim()) { setEditError('Name is required'); return }
    if (!isValidEmail(String(form.email ?? ''))) { setEditError('Enter a valid email'); return }
    if (!form.phone || !isValidPhone(form.phone)) { setEditError('Enter a valid phone'); return }
    if (form.emergencyPhone && !isValidPhone(form.emergencyPhone)) { setEditError('Enter a valid emergency phone'); return }
    setSavingEdit(true)
    try {
      await updateRegistration(reg.id, form)
      setEditing(false)
      onUpdate()
    } catch (e: any) {
      setEditError(e?.response?.data?.error || 'Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!reg) return
    setDeleting(true)
    try {
      await deleteRegistration(reg.id)
      onUpdate()
      onClose()
    } catch (e) {
      console.error(e)
      setDeleting(false)
    }
  }

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

  const EditField = ({ label, field, type = 'text', format }: {
    label: string
    field: keyof RegistrationEdit
    type?: string
    format?: (v: string) => string
  }) => (
    <div className="py-1.5">
      <label className="text-slate-500 text-xs uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={String(form[field] ?? '')}
        onChange={(e) => setField(field, format ? format(e.target.value) : e.target.value)}
        className="w-full mt-1 bg-[#0d1f38] border border-white/15 rounded-lg px-3 py-2
                   text-sm text-white focus:outline-none focus:border-glacier"
      />
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
              <div className="flex items-center gap-2">
                {!editing && (
                  <button onClick={() => { setEditing(true); setConfirmDelete(false) }}
                          className="px-3 h-8 rounded-lg bg-white/8 hover:bg-white/15
                                     text-white/70 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold">
                    ✏️ Edit
                  </button>
                )}
                <button onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15
                                   text-white/60 hover:text-white transition-all flex items-center justify-center">
                  ✕
                </button>
              </div>
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
                {editing ? (
                  <>
                    <EditField label="First Name" field="firstName" />
                    <EditField label="Last Name" field="lastName" />
                    <EditField label="Email" field="email" type="email" />
                    <EditField label="Phone" field="phone" type="tel" format={formatPhone} />
                    <EditField label="DOB" field="dob" type="date" />
                  </>
                ) : (
                  <>
                    <Row label="Name" value={`${reg.firstName} ${reg.lastName}`} />
                    <Row label="Email" value={reg.email} />
                    <Row label="Phone" value={reg.phone} />
                    <Row label="DOB" value={reg.dob} />
                  </>
                )}
                {reg.isMinor && reg.guardianName && (
                  <Row label="Guardian" value={`${reg.guardianName} (#${reg.guardianRegId})`} />
                )}
              </Section>

              <Section title="Emergency Contact">
                {editing ? (
                  <>
                    <EditField label="Contact" field="emergencyName" />
                    <EditField label="Phone" field="emergencyPhone" type="tel" format={formatPhone} />
                    <EditField label="Relationship" field="emergencyRelation" />
                  </>
                ) : (
                  <>
                    <Row label="Contact" value={reg.emergencyName} />
                    <Row label="Phone" value={reg.emergencyPhone} />
                    <Row label="Relationship" value={reg.emergencyRelation} />
                  </>
                )}
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

              {/* Edit controls */}
              {editing && (
                <div className="flex flex-col gap-3 pt-2">
                  {editError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-300">
                      ⚠️ {editError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditing(false); setEditError('') }}
                      disabled={savingEdit}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm
                                 bg-white/8 text-white/70 border border-white/15
                                 hover:bg-white/15 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm
                                 bg-glacier/20 text-glacier border border-glacier/40
                                 hover:bg-glacier/30 transition-all disabled:opacity-50
                                 flex items-center justify-center gap-2"
                    >
                      {savingEdit
                        ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        : '✓ Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!editing && (
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

                {/* Delete */}
                <div className="pt-3 mt-2 border-t border-white/8">
                  {confirmDelete ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-red-300 text-center">
                        {reg.isMinor
                          ? 'Delete this minor registration? This cannot be undone.'
                          : 'Delete this registration? Any linked minors will be removed too. This cannot be undone.'}
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleting}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm
                                     bg-white/8 text-white/70 border border-white/15
                                     hover:bg-white/15 transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm
                                     bg-red-500/20 text-red-300 border border-red-500/40
                                     hover:bg-red-500/30 transition-all disabled:opacity-50
                                     flex items-center justify-center gap-2"
                        >
                          {deleting
                            ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            : '🗑 Confirm Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-3 rounded-xl font-semibold text-sm
                                 bg-red-500/10 text-red-300/80 border border-red-500/20
                                 hover:bg-red-500/20 hover:text-red-300 transition-all
                                 flex items-center justify-center gap-2"
                    >
                      🗑 Delete Registration
                    </button>
                  )}
                </div>
              </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
