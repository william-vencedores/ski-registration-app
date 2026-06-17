import axios from 'axios'
import type { FormData, Minor } from './events'

export type ProfileData = Omit<FormData, 'liabilityAccepted' | 'medicalAccepted' | 'signature'>

export interface RegistrationInfo {
  eventId: string
  confirmationId: string
  totalPaid: number
  totalOwed: number
  paymentStatus: string
}

export interface VerifyResult {
  verified: boolean
  profile?: ProfileData
  registeredEventIds?: string[]
  registrations?: RegistrationInfo[]
  error?: string
}

export async function sendVerificationCode(email: string): Promise<void> {
  await axios.post('/api/returning/send-code', { email })
}

export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  try {
    const res = await axios.post('/api/returning/verify-code', { email, code })
    return res.data
  } catch (err: any) {
    if (err.response?.data) return err.response.data
    throw err
  }
}

export async function createBalancePaymentIntent(registrationId: string, email: string, name: string) {
  const res = await axios.post('/api/payment/create-balance-intent', { registrationId, email, name })
  return res.data as { clientSecret: string; chargeAmount: number; remaining: number }
}

export async function payBalance(registrationId: string, amountPaid: number) {
  const res = await axios.post('/api/registration/pay-balance', { registrationId, amountPaid })
  return res.data
}

// ── Adding minors to an existing registration ──────────────

export async function createMinorsPaymentIntent(
  guardianRegId: string,
  minorsCount: number,
  partialPayment: boolean
) {
  const res = await axios.post('/api/payment/create-minors-intent', {
    guardianRegId,
    minorsCount,
    partialPayment,
  })
  return res.data as { clientSecret: string; chargeAmount: number; minorsCount: number }
}

export async function addMinors(payload: {
  guardianRegId: string
  minors: Minor[]
  paymentMethod: 'stripe' | 'zelle'
  paymentIntentId?: string
  partialPayment?: boolean
  zelleAmount?: number
}) {
  const res = await axios.post('/api/registration/add-minors', payload)
  return res.data as { success: boolean; count: number; paymentStatus: string }
}
