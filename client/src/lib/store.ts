import { create } from 'zustand'
import type { Lang } from './i18n'
import type { SkiEvent, FormData, DisclosureAcceptance } from './events'
import { initialFormData } from './events'

interface AppStore {
  lang: Lang
  setLang: (lang: Lang) => void

  selectedEvent: SkiEvent | null
  setSelectedEvent: (event: SkiEvent | null) => void

  currentStep: number
  setCurrentStep: (step: number) => void

  formData: FormData
  setFormData: (data: Partial<FormData>) => void
  resetForm: () => void

  confirmationId: string
  setConfirmationId: (id: string) => void

  paymentInfo: { totalPaid: number; totalOwed: number } | null
  setPaymentInfo: (info: { totalPaid: number; totalOwed: number }) => void

  disclosureAcceptances: DisclosureAcceptance[]
  setDisclosureAcceptances: (acceptances: DisclosureAcceptance[]) => void
}

export const useAppStore = create<AppStore>((set) => ({
  lang: 'es',
  setLang: (lang) => set({ lang }),

  selectedEvent: null,
  setSelectedEvent: (event) => set({ selectedEvent: event }),

  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  formData: initialFormData,
  setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  resetForm: () => set({ formData: initialFormData, currentStep: 0, confirmationId: '', disclosureAcceptances: [], paymentInfo: null }),

  confirmationId: '',
  setConfirmationId: (id) => set({ confirmationId: id }),

  paymentInfo: null,
  setPaymentInfo: (info) => set({ paymentInfo: info }),

  disclosureAcceptances: [],
  setDisclosureAcceptances: (acceptances) => set({ disclosureAcceptances: acceptances }),
}))
