import { useState, useEffect } from 'react'
import axios from 'axios'

export interface SkiEvent {
  id: string
  name: string
  date: string
  location: string
  lat?: number
  lng?: number
  price: number
  badge?: boolean
  badgeText?: string
  active?: boolean
  capacity?: number
  spotsLeft?: number
  deposit?: number
  // Optional per-event override for the "what's included" list shown at checkout.
  // One item per line; when empty, the default translated list is used.
  costIncludes?: string
  // Optional per-event override for the "additional costs (not included)" list
  // shown at checkout. One item per line; when empty, the default list is used.
  costExtra?: string
}

export interface Disclosure {
  id: string
  version: number
  titleEs: string
  titleEn: string
  contentEs: string
  contentEn: string
  required: boolean
  // 'all' (default) shows the disclosure to everyone; 'minors' only applies when
  // the registrant is bringing a minor.
  audience?: 'all' | 'minors'
  displayOrder?: number
}

export interface DisclosureAcceptance {
  disclosureId: string
  version: number
}

export interface Minor {
  firstName: string
  lastName: string
  dob: string
  // Medical info collected per minor — mirrors the guardian's medical questions
  // so each child's conditions, allergies and medications are on record.
  medConditions: 'yes' | 'no'
  conditionDetails: string
  medAllergies: 'yes' | 'no'
  allergyDetails: string
  medMedications: 'yes' | 'no'
  medicationDetails: string
}

// A blank minor — use this when adding a new minor row so the medical defaults
// stay in sync everywhere a minor is created.
export const emptyMinor: Minor = {
  firstName: '', lastName: '', dob: '',
  medConditions: 'no', conditionDetails: '',
  medAllergies: 'no', allergyDetails: '',
  medMedications: 'no', medicationDetails: '',
}

export interface FormData {
  // Step 1
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  // Minors the participant is bringing and paying for (parent/guardian flow)
  minors: Minor[]
  // Step 2
  emergencyName: string
  emergencyPhone: string
  emergencyRelation: string
  // Step 3
  skillLevel: string
  dietary: string
  // Step 4
  medConditions: 'yes' | 'no'
  conditionDetails: string
  medAllergies: 'yes' | 'no'
  allergyDetails: string
  medMedications: 'yes' | 'no'
  medicationDetails: string
  // Step 5
  liabilityAccepted: boolean
  medicalAccepted: boolean
  signature: string
}

export const initialFormData: FormData = {
  firstName: '', lastName: '', email: '', phone: '', dob: '',
  minors: [],
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  skillLevel: '', dietary: '',
  medConditions: 'no', conditionDetails: '',
  medAllergies: 'no', allergyDetails: '',
  medMedications: 'no', medicationDetails: '',
  liabilityAccepted: false, medicalAccepted: false, signature: '',
}

// Fetch events from API
export function useEvents() {
  const [events, setEvents] = useState<SkiEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/events')
      .then((res) => setEvents(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { events, loading }
}

// Check whether an email is already registered for an event (before payment)
export async function checkRegistration(eventId: string, email: string): Promise<boolean> {
  try {
    const { data } = await axios.post('/api/registration/check', { eventId, email })
    return data.registered === true
  } catch {
    // On a network/server error, don't block the user — the server-side guard
    // still prevents a duplicate charge at payment time.
    return false
  }
}

// Fetch disclosures for an event
export function useEventDisclosures(eventId: string | undefined) {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventId) {
      setDisclosures([])
      return
    }
    setLoading(true)
    axios.get(`/api/events/${eventId}/disclosures`)
      .then((res) => setDisclosures(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [eventId])

  return { disclosures, loading }
}
