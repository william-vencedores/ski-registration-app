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
}

export const EVENTS: SkiEvent[] = [
  {
    id: 'venc2027',
    icon: '⛷️',
    nameEs: 'Vencedores en la Nieve 2027',
    nameEn: 'Vencedores on the Snow 2027',
    metaEs: 'Febrero 2027 · Ubicación por confirmar',
    metaEn: 'February 2027 · Location TBC',
    price: 150,
    processing: 4.35,
    badge: true,
    badgeEs: 'Próximo',
    badgeEn: 'Upcoming',
  },
  {
    id: 'venc2028',
    icon: '🏔️',
    nameEs: 'Vencedores en la Nieve 2028',
    nameEn: 'Vencedores on the Snow 2028',
    metaEs: 'Febrero 2028 · Inscripciones abren pronto',
    metaEn: 'February 2028 · Registration opening soon',
    price: 155,
    processing: 4.50,
  },
]

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
