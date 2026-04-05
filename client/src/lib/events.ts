import { useState, useEffect } from 'react'
import axios from 'axios'

export interface SkiEvent {
  id: string
  icon: string
  nameEs: string
  nameEn: string
  metaEs: string
  metaEn: string
  price: number
  processing: number
  badge?: boolean
  badgeEs?: string
  badgeEn?: string
  active?: boolean
}

export interface Disclosure {
  id: string
  version: number
  titleEs: string
  titleEn: string
  contentEs: string
  contentEn: string
  required: boolean
  displayOrder?: number
}

export interface DisclosureAcceptance {
  disclosureId: string
  version: number
}

export interface FormData {
  // Step 1
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  city: string
  state: string
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
  firstName: '', lastName: '', email: '', phone: '', dob: '', city: '', state: '',
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
