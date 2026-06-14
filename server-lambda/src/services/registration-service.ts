import * as repo from '../repository/dynamo-repository.js';
import * as eventService from './event-service.js';
import * as emailService from './email-service.js';
import { BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import type { SubmitRegistrationRequest } from '../types/requests.js';

export async function submitRegistration(
  req: SubmitRegistrationRequest
): Promise<Record<string, unknown>> {
  if (!req.firstName || !req.lastName || !req.email || !req.eventId || !req.paymentIntentId) {
    throw new BadRequestError('Missing required fields');
  }

  // Check for duplicate registration (same email + same event)
  const normalizedEmail = req.email.toLowerCase().trim();
  const existingRegs = await repo.queryGsi('GSI2', 'GSI2PK', `EMAIL#${normalizedEmail}`, 'GSI2SK', null);
  for (const existing of existingRegs) {
    const existingEventId = (existing.eventId as string) || '';
    if (req.eventId === existingEventId) {
      throw new BadRequestError('You are already registered for this event.');
    }
  }

  // Validate event exists and decrement spots
  const event = await eventService.getEvent(req.eventId);
  await eventService.decrementSpotsLeft(req.eventId);

  const confirmationId = req.paymentIntentId
    .substring(req.paymentIntentId.length - 8)
    .toUpperCase();
  const now = new Date().toISOString();

  // Build registration item
  const item: Record<string, unknown> = {
    PK: `EVENT#${req.eventId}`,
    SK: `REG#${confirmationId}`,
    GSI1PK: `REG#${confirmationId}`,
    GSI1SK: 'METADATA',
    GSI2PK: `EMAIL#${req.email.toLowerCase().trim()}`,
    GSI2SK: now,
    id: confirmationId,
    createdAt: now,
    eventId: req.eventId,
    eventName: event.name as string,
    // Personal
    firstName: req.firstName,
    lastName: req.lastName,
    email: req.email,
    phone: req.phone ?? '',
    dob: req.dob ?? '',
    city: req.city ?? '',
    state: req.state ?? '',
    // Emergency
    emergencyName: req.emergencyName ?? '',
    emergencyPhone: req.emergencyPhone ?? '',
    emergencyRelation: req.emergencyRelation ?? '',
    // Skill & dietary
    skillLevel: req.skillLevel ?? '',
    dietary: req.dietary ?? '',
    // Medical
    medConditions: req.medConditions ?? '',
    conditionDetails: req.conditionDetails ?? '',
    medAllergies: req.medAllergies ?? '',
    allergyDetails: req.allergyDetails ?? '',
    medMedications: req.medMedications ?? '',
    medicationDetails: req.medicationDetails ?? '',
    // Legal
    liabilityAccepted: req.liabilityAccepted,
    medicalAccepted: req.medicalAccepted,
    signature: req.signature ?? '',
    // Payment
    paymentIntentId: req.paymentIntentId,
    totalPaid: req.totalPaid,
    totalOwed: req.totalOwed,
    paymentStatus: req.totalPaid >= req.totalOwed ? 'paid' : 'partial',
  };

  await repo.putItem(item);

  // Save disclosure acceptances
  if (req.disclosureAcceptances) {
    for (const acceptance of req.disclosureAcceptances) {
      await repo.putItem({
        PK: `REG#${confirmationId}`,
        SK: `DISCLOSURE#${acceptance.disclosureId}`,
        regId: confirmationId,
        disclosureId: acceptance.disclosureId,
        acceptedVersion: acceptance.version,
        acceptedAt: now,
      });
    }
  }

  // Send email (fire-and-forget within Lambda timeout)
  await emailService.sendConfirmationEmail(
    req.email,
    `${req.firstName} ${req.lastName}`,
    event.name as string,
    confirmationId,
    req.totalPaid
  );

  return {
    success: true,
    confirmationId,
    message: 'Registration successful',
  };
}

export async function listRegistrations(eventId?: string): Promise<Record<string, unknown>[]> {
  let items: Record<string, unknown>[];
  if (eventId?.trim()) {
    items = await repo.queryByPkAndSkPrefix(`EVENT#${eventId}`, 'REG#');
  } else {
    items = await repo.scanWithFilter('begins_with(SK, :sk)', { ':sk': 'REG#' });
  }
  return items.map(itemToRegistrationMap);
}

export async function getRegistration(regId: string): Promise<Record<string, unknown>> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${regId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new NotFoundError(`Registration not found: ${regId}`);
  }
  return itemToRegistrationMap(items[0]);
}

export async function toggleAttendance(
  regId: string,
  attended: boolean,
  adminUsername: string
): Promise<Record<string, unknown>> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${regId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new NotFoundError(`Registration not found: ${regId}`);
  }

  const item = items[0];
  const pk = item.PK as string;
  const sk = item.SK as string;
  const markedAt = attended ? new Date().toISOString() : '';

  await repo.updateItem(
    pk,
    sk,
    'SET attended = :a, attendanceMarkedAt = :at, attendanceMarkedBy = :by',
    { ':a': attended, ':at': markedAt, ':by': adminUsername },
    null
  );

  return { id: regId, attended, attendanceMarkedAt: markedAt };
}

export async function resendEmail(regId: string): Promise<Record<string, unknown>> {
  const reg = await getRegistration(regId);
  await emailService.sendConfirmationEmail(
    reg.email as string,
    `${reg.firstName} ${reg.lastName}`,
    reg.eventName as string,
    reg.id as string,
    reg.totalPaid as number
  );
  return { success: true, sentTo: reg.email };
}

export async function payBalance(
  regId: string,
  amountPaid: number
): Promise<Record<string, unknown>> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${regId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new NotFoundError(`Registration not found: ${regId}`);
  }

  const item = items[0];
  const pk = item.PK as string;
  const sk = item.SK as string;
  const currentPaid = (item.totalPaid as number) || 0;
  const totalOwed = (item.totalOwed as number) || 0;

  const newTotalPaid = currentPaid + amountPaid;
  const newStatus = newTotalPaid >= totalOwed ? 'paid' : 'partial';

  await repo.updateItem(
    pk,
    sk,
    'SET totalPaid = :paid, paymentStatus = :status',
    { ':paid': newTotalPaid, ':status': newStatus },
    null
  );

  return {
    success: true,
    totalPaid: newTotalPaid,
    totalOwed,
    paymentStatus: newStatus,
  };
}

export async function getStats(): Promise<Record<string, unknown>> {
  const allRegs = await repo.scanWithFilter('begins_with(SK, :sk)', { ':sk': 'REG#' });

  const byEvent: Record<string, Record<string, unknown>> = {};
  let totalRevenue = 0;

  for (const item of allRegs) {
    const eventId = (item.eventId as string) || '';
    const paid = (item.totalPaid as number) || 0;
    const attended = item.attended === true;
    totalRevenue += paid;

    if (!byEvent[eventId]) {
      byEvent[eventId] = {
        eventId,
        eventName: item.eventName ?? '',
        count: 0,
        attended: 0,
        revenue: 0,
      };
    }

    const eventStats = byEvent[eventId];
    eventStats.count = (eventStats.count as number) + 1;
    if (attended) eventStats.attended = (eventStats.attended as number) + 1;
    eventStats.revenue = (eventStats.revenue as number) + paid;
  }

  return {
    totalRegistrations: allRegs.length,
    totalRevenue,
    events: Object.values(byEvent),
  };
}

export async function getRegistrationAcceptances(
  regId: string
): Promise<Record<string, unknown>[]> {
  const items = await repo.queryByPkAndSkPrefix(`REG#${regId}`, 'DISCLOSURE#');
  return items.map((item) => ({
    disclosureId: item.disclosureId ?? '',
    acceptedVersion: (item.acceptedVersion as number) ?? 0,
    acceptedAt: item.acceptedAt ?? '',
  }));
}

function itemToRegistrationMap(item: Record<string, unknown>): Record<string, unknown> {
  return {
    id: item.id ?? '',
    createdAt: item.createdAt ?? '',
    eventId: item.eventId ?? '',
    eventName: item.eventName ?? '',
    firstName: item.firstName ?? '',
    lastName: item.lastName ?? '',
    email: item.email ?? '',
    phone: item.phone ?? '',
    dob: item.dob ?? '',
    city: item.city ?? '',
    state: item.state ?? '',
    emergencyName: item.emergencyName ?? '',
    emergencyPhone: item.emergencyPhone ?? '',
    emergencyRelation: item.emergencyRelation ?? '',
    skillLevel: item.skillLevel ?? '',
    dietary: item.dietary ?? '',
    medConditions: item.medConditions ?? '',
    conditionDetails: item.conditionDetails ?? '',
    medAllergies: item.medAllergies ?? '',
    allergyDetails: item.allergyDetails ?? '',
    medMedications: item.medMedications ?? '',
    medicationDetails: item.medicationDetails ?? '',
    liabilityAccepted: item.liabilityAccepted ?? false,
    medicalAccepted: item.medicalAccepted ?? false,
    signature: item.signature ?? '',
    totalPaid: item.totalPaid ?? 0,
    totalOwed: item.totalOwed ?? 0,
    paymentStatus: item.paymentStatus ?? '',
    attended: item.attended ?? false,
    attendanceMarkedAt: item.attendanceMarkedAt ?? '',
    attendanceMarkedBy: item.attendanceMarkedBy ?? '',
    // Intentionally omit paymentIntentId
  };
}
