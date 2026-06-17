import * as repo from '../repository/dynamo-repository.js';
import * as emailService from './email-service.js';

const CODE_EXPIRY_SECONDS = 600; // 10 minutes
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 3;

export async function sendVerificationCode(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const pk = `VERIFY#${normalizedEmail}`;
  const sk = 'CODE';

  // Check rate limit
  const existing = await repo.getItem(pk, sk);
  if (existing) {
    const sendCount = (existing.sendCount as number) || 0;
    const createdEpoch = parseInt(existing.createdEpoch as string, 10);
    const elapsed = Math.floor(Date.now() / 1000) - createdEpoch;
    if (elapsed < CODE_EXPIRY_SECONDS && sendCount >= MAX_SENDS) {
      console.info(`[Verify] Rate limit reached for ${normalizedEmail}`);
      return; // silently return to prevent enumeration
    }
  }

  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  const now = Math.floor(Date.now() / 1000);

  const item: Record<string, unknown> = {
    PK: pk,
    SK: sk,
    code,
    attempts: 0,
    sendCount: existing ? ((existing.sendCount as number) || 0) + 1 : 1,
    createdEpoch: String(now),
    expiresAt: now + CODE_EXPIRY_SECONDS,
  };
  await repo.putItem(item);

  await emailService.sendVerificationCode(normalizedEmail, code);
  console.info(`[Verify] Code sent to ${normalizedEmail}`);
}

export async function verifyCode(
  email: string,
  code: string
): Promise<Record<string, unknown>> {
  const normalizedEmail = email.toLowerCase().trim();
  const pk = `VERIFY#${normalizedEmail}`;
  const sk = 'CODE';

  const item = await repo.getItem(pk, sk);
  if (!item) {
    return { verified: false, error: 'invalid_code' };
  }

  // Check expiry
  const expiresAt = item.expiresAt as number;
  if (Math.floor(Date.now() / 1000) > expiresAt) {
    await repo.deleteItem(pk, sk);
    return { verified: false, error: 'code_expired' };
  }

  // Check attempts
  const attempts = (item.attempts as number) || 0;
  if (attempts >= MAX_ATTEMPTS) {
    await repo.deleteItem(pk, sk);
    return { verified: false, error: 'max_attempts' };
  }

  const storedCode = item.code as string;
  if (storedCode !== code.trim()) {
    // Increment attempts
    await repo.updateItem(pk, sk, 'SET attempts = attempts + :one', { ':one': 1 }, null);
    return { verified: false, error: 'invalid_code' };
  }

  // Success — delete verification item and return profile
  await repo.deleteItem(pk, sk);

  const profileResult = await getLatestProfile(normalizedEmail);
  if (!profileResult) {
    return { verified: true, profile: {}, registeredEventIds: [] };
  }

  return {
    verified: true,
    profile: profileResult.profile,
    registeredEventIds: profileResult.registeredEventIds,
    registrations: profileResult.registrations,
  };
}

async function getLatestProfile(email: string) {
  const items = await repo.queryGsi('GSI2', 'GSI2PK', `EMAIL#${email}`, 'GSI2SK', null);
  if (items.length === 0) return null;

  const registeredEventIds = [
    ...new Set(
      items
        .map((item) => item.eventId as string)
        .filter((id) => id && id.length > 0)
    ),
  ];

  // Minors are registered under their guardian's email but are not the account
  // holder — exclude them so the prefilled profile and balance lookups use the
  // adult's own registration.
  const adultItems = items.filter((item) => item.isMinor !== true);

  const registrations = adultItems
    .filter((item) => (item.eventId as string)?.length > 0)
    .map((item) => ({
      eventId: item.eventId ?? '',
      confirmationId: item.id ?? '',
      totalPaid: (item.totalPaid as number) ?? 0,
      totalOwed: (item.totalOwed as number) ?? 0,
      paymentStatus: item.paymentStatus ?? '',
    }));

  // Get the most recent adult registration (last item, sorted by GSI2SK = createdAt)
  const profileSource = adultItems.length > 0 ? adultItems : items;
  const latest = profileSource[profileSource.length - 1];

  const profile = {
    firstName: latest.firstName ?? '',
    lastName: latest.lastName ?? '',
    email: latest.email ?? '',
    phone: latest.phone ?? '',
    dob: latest.dob ?? '',
    emergencyName: latest.emergencyName ?? '',
    emergencyPhone: latest.emergencyPhone ?? '',
    emergencyRelation: latest.emergencyRelation ?? '',
    skillLevel: latest.skillLevel ?? '',
    dietary: latest.dietary ?? '',
    medConditions: latest.medConditions ?? '',
    conditionDetails: latest.conditionDetails ?? '',
    medAllergies: latest.medAllergies ?? '',
    allergyDetails: latest.allergyDetails ?? '',
    medMedications: latest.medMedications ?? '',
    medicationDetails: latest.medicationDetails ?? '',
  };

  return { profile, registeredEventIds, registrations };
}
