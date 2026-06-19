export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateEventRequest {
  id?: string;
  name: string;
  date?: string;
  location?: string;
  lat?: number;
  lng?: number;
  price: number;
  badge: boolean;
  badgeText?: string;
  active: boolean;
  capacity?: number;
  deposit?: number;
  // Optional per-event override for the "what's included" list shown at checkout
  // (one item per line). When empty, the client falls back to its default list.
  costIncludes?: string;
  // Optional per-event override for the "additional costs (not included)" list
  // (one item per line). When empty, the client falls back to its default list.
  costExtra?: string;
}

export interface CreatePaymentIntentRequest {
  eventId: string;
  email: string;
  name: string;
  partialPayment: boolean;
}

export interface SubmitRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dob?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  skillLevel?: string;
  dietary?: string;
  medConditions?: string;
  conditionDetails?: string;
  medAllergies?: string;
  allergyDetails?: string;
  medMedications?: string;
  medicationDetails?: string;
  liabilityAccepted: boolean;
  medicalAccepted: boolean;
  signature?: string;
  eventId: string;
  paymentMethod?: 'stripe' | 'zelle';
  paymentIntentId?: string;
  // Amounts are computed authoritatively on the server from the event price,
  // partialPayment flag and headcount; these are accepted for backward compat
  // but no longer trusted.
  totalPaid?: number;
  totalOwed?: number;
  partialPayment?: boolean;
  zelleAmount?: number;
  // Minors (children) the participant is registering and paying for. Each
  // becomes its own registration linked back to the guardian.
  minors?: MinorInput[];
  disclosureAcceptances?: DisclosureAcceptanceInput[];
}

export interface MinorInput {
  firstName: string;
  lastName: string;
  dob: string;
  // Per-minor medical info (optional for backward compatibility with older
  // clients that only sent name + dob).
  medConditions?: string;
  conditionDetails?: string;
  medAllergies?: string;
  allergyDetails?: string;
  medMedications?: string;
  medicationDetails?: string;
}

export interface AddMinorsRequest {
  guardianRegId: string;
  minors: MinorInput[];
  paymentMethod?: 'stripe' | 'zelle';
  paymentIntentId?: string;
  partialPayment?: boolean;
  zelleAmount?: number;
  disclosureAcceptances?: DisclosureAcceptanceInput[];
}

export interface DisclosureAcceptanceInput {
  disclosureId: string;
  version: number;
}

export interface CreateDisclosureRequest {
  titleEs: string;
  titleEn: string;
  contentEs: string;
  contentEn: string;
  required: boolean;
  // Who the disclosure applies to. 'all' (default) shows it to every registrant;
  // 'minors' only requires it when the registrant is bringing a minor.
  audience?: 'all' | 'minors';
}

export interface CreateAdminUserRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface AttachDisclosureRequest {
  disclosureId: string;
  displayOrder: number;
}

export interface AttendanceRequest {
  attended: boolean;
}

export interface SendCodeRequest {
  email: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}
