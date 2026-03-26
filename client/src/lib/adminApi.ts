import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

export interface Registration {
  id: string
  createdAt: string
  eventId: string
  eventName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  city: string
  state: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelation: string
  skillLevel: string
  dietary: string
  medConditions: string
  medAllergies: string
  medMedications: string
  liabilityAccepted: boolean
  medicalAccepted: boolean
  signature: string
  totalPaid: number
  attended?: boolean
  attendanceMarkedAt?: string
  attendanceMarkedBy?: string
}

export interface Stats {
  totalRegistrations: number
  totalRevenue: number
  events: Array<{
    eventId: string
    eventName: string
    count: number
    attended: number
    revenue: number
  }>
}

export function useRegistrations(eventId?: string) {
  const [data, setData] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = eventId ? { eventId } : {}
      const res = await axios.get('/api/admin/registrations', { params })
      setData(res.data.registrations)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useStats() {
  const [data, setData] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/admin/stats')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

export async function toggleAttendance(id: string, attended: boolean) {
  const res = await axios.patch(`/api/admin/registrations/${id}/attendance`, { attended })
  return res.data
}

export async function resendEmail(id: string) {
  const res = await axios.post(`/api/admin/registrations/${id}/email`)
  return res.data
}
