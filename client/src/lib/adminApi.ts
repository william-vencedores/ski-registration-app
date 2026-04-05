import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import type { SkiEvent, Disclosure } from './events'

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

export interface AdminUser {
  username: string
  displayName: string
  createdAt: string
  lastLogin: string
}

// ── Registrations ──────────────────────────────────────────

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

// ── Events (Admin) ─────────────────────────────────────────

export function useAdminEvents() {
  const [data, setData] = useState<SkiEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/events', { params: { activeOnly: false } })
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}

export async function createEvent(event: Partial<SkiEvent>) {
  const res = await axios.post('/api/admin/events', event)
  return res.data
}

export async function updateEvent(id: string, event: Partial<SkiEvent>) {
  const res = await axios.put(`/api/admin/events/${id}`, event)
  return res.data
}

export async function deleteEvent(id: string) {
  const res = await axios.delete(`/api/admin/events/${id}`)
  return res.data
}

// ── Disclosures (Admin) ────────────────────────────────────

export function useDisclosures() {
  const [data, setData] = useState<Disclosure[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/disclosures')
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}

export async function createDisclosure(disclosure: Partial<Disclosure>) {
  const res = await axios.post('/api/admin/disclosures', disclosure)
  return res.data
}

export async function updateDisclosure(id: string, disclosure: Partial<Disclosure>) {
  const res = await axios.put(`/api/admin/disclosures/${id}`, disclosure)
  return res.data
}

export async function deleteDisclosure(id: string) {
  const res = await axios.delete(`/api/admin/disclosures/${id}`)
  return res.data
}

// ── Event-Disclosure linking ───────────────────────────────

export async function attachDisclosure(eventId: string, disclosureId: string, displayOrder: number = 0) {
  const res = await axios.post(`/api/admin/events/${eventId}/disclosures`, { disclosureId, displayOrder })
  return res.data
}

export async function detachDisclosure(eventId: string, disclosureId: string) {
  const res = await axios.delete(`/api/admin/events/${eventId}/disclosures/${disclosureId}`)
  return res.data
}

export function useEventDisclosuresAdmin(eventId: string | undefined) {
  const [data, setData] = useState<Disclosure[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!eventId) { setData([]); return }
    setLoading(true)
    try {
      const res = await axios.get(`/api/events/${eventId}/disclosures`)
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}

// ── Admin Users ────────────────────────────────────────────

export function useAdminUsers() {
  const [data, setData] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/admin/users')
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}

export async function createAdminUser(user: { username: string; password: string; displayName?: string }) {
  const res = await axios.post('/api/admin/users', user)
  return res.data
}

export async function updateAdminUser(username: string, data: { password?: string; displayName?: string }) {
  const res = await axios.put(`/api/admin/users/${username}`, data)
  return res.data
}

export async function deleteAdminUser(username: string) {
  const res = await axios.delete(`/api/admin/users/${username}`)
  return res.data
}
