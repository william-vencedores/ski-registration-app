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
  totalPaid: number;
  totalOwed: number;
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
