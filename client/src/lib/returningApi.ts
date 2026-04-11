import axios from 'axios'
import type { FormData } from './events'

export type ProfileData = Omit<FormData, 'liabilityAccepted' | 'medicalAccepted' | 'signature'>

export async function sendVerificationCode(email: string): Promise<void> {
  await axios.post('/api/returning/send-code', { email })
}

export async function verifyCode(email: string, code: string): Promise<{ verified: boolean; profile?: ProfileData; error?: string }> {
  try {
    const res = await axios.post('/api/returning/verify-code', { email, code })
    return res.data
  } catch (err: any) {
    if (err.response?.data) return err.response.data
    throw err
  }
}
