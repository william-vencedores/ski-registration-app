import { randomBytes } from 'crypto';
import * as repo from '../repository/dynamo-repository.js';
import * as eventService from './event-service.js';
import * as emailService from './email-service.js';
import { BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import type { SubmitRegistrationRequest } from '../types/requests.js';

/** True if this email already has a registration for the given event. */
export async function isAlreadyRegistered(eventId: string, email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const existingRegs = await repo.queryGsi('GSI2', 'GSI2PK', `EMAIL#${normalizedEmail}`, 'GSI2SK', null);
  return existingRegs.some((existing) => ((existing.eventId as string) || '') === eventId);
}

export async function submitRegistration(
  req: SubmitRegistrationRequest
): Promise<Record<string, unknown>> {
  const isZelle = req.paymentMethod === 'zelle';

  if (!req.firstName || !req.lastName || !req.email || !req.eventId) {
    throw new BadRequestError('Missing required fields');
  }
  if (!isZelle && !req.paymentIntentId) {
    throw new BadRequestError('Missing required fields');
  }

  // Check for duplicate registration (same email + same event)
  if (await isAlreadyRegistered(req.eventId, req.email)) {
    throw new BadRequestError('You are already registered for this event.');
  }

  // Validate event exists and decrement spots
  const event = await eventService.getEvent(req.eventId);
  await eventService.decrementSpotsLeft(req.eventId);

  const confirmationId = isZelle
    ? randomBytes(4).toString('hex').toUpperCase()
    : req.paymentIntentId!.substring(req.paymentIntentId!.length - 8).toUpperCase();
  const now = new Date().toISOString();

  // Payment fields differ by method. Zelle is a manual transfer verified later,
  // so nothing is paid yet and the spot is held as 'pending'.
  const totalOwed = req.totalOwed;
  const totalPaid = isZelle ? 0 : req.totalPaid;
  const paymentStatus = isZelle
    ? 'pending'
    : totalPaid >= totalOwed
      ? 'paid'
      : 'partial';

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
    paymentMethod: isZelle ? 'zelle' : 'stripe',
    paymentIntentId: req.paymentIntentId ?? '',
    totalPaid,
    totalOwed,
    paymentStatus,
  };

  // For Zelle, record the amount the participant says they will send (informational).
  if (isZelle) {
    item.zelleAmount = req.zelleAmount ?? 0;
  }

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
  if (isZelle) {
    await emailService.sendZellePendingEmail(
      req.email,
      `${req.firstName} ${req.lastName}`,
      event.name as string,
      confirmationId,
      req.zelleAmount ?? 0
    );
  } else {
    await emailService.sendConfirmationEmail(
      req.email,
      `${req.firstName} ${req.lastName}`,
      event.name as string,
      confirmationId,
      totalPaid
    );
  }

  // Notify the admin inbox of every new registration (failures are swallowed
  // inside sendEmail, so this never blocks a successful registration).
  await emailService.sendAdminNotificationEmail({
    firstName: req.firstName,
    lastName: req.lastName,
    email: req.email,
    phone: req.phone,
    city: req.city,
    state: req.state,
    eventName: event.name as string,
    confirmationId,
    paymentMethod: isZelle ? 'zelle' : 'stripe',
    paymentStatus,
    totalPaid,
    totalOwed,
    zelleAmount: req.zelleAmount,
  });

  return {
    success: true,
    confirmationId,
    paymentStatus,
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
  if (reg.paymentMethod === 'zelle' && reg.paymentStatus === 'pending') {
    await emailService.sendZellePendingEmail(
      reg.email as string,
      `${reg.firstName} ${reg.lastName}`,
      reg.eventName as string,
      reg.id as string,
      (reg.zelleAmount as number) || 0
    );
  } else {
    await emailService.sendConfirmationEmail(
      reg.email as string,
      `${reg.firstName} ${reg.lastName}`,
      reg.eventName as string,
      reg.id as string,
      reg.totalPaid as number
    );
  }
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

/**
 * Record the amount actually received via Zelle for a registration. An admin
 * reconciles this manually against their bank. The received amount is stored as
 * totalPaid (so it flows into revenue stats) and the payment status is recomputed.
 */
export async function setZelleReceived(
  regId: string,
  amountReceived: number
): Promise<Record<string, unknown>> {
  if (Number.isNaN(amountReceived) || amountReceived < 0) {
    throw new BadRequestError('Invalid amount received');
  }

  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${regId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new NotFoundError(`Registration not found: ${regId}`);
  }

  const item = items[0];
  const pk = item.PK as string;
  const sk = item.SK as string;
  const totalOwed = (item.totalOwed as number) || 0;

  const newStatus =
    amountReceived >= totalOwed && totalOwed > 0
      ? 'paid'
      : amountReceived > 0
        ? 'partial'
        : 'pending';

  await repo.updateItem(
    pk,
    sk,
    'SET totalPaid = :paid, paymentStatus = :status',
    { ':paid': amountReceived, ':status': newStatus },
    null
  );

  return {
    id: regId,
    totalPaid: amountReceived,
    totalOwed,
    paymentStatus: newStatus,
  };
}

export async function markAsPaid(regId: string): Promise<Record<string, unknown>> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${regId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new NotFoundError(`Registration not found: ${regId}`);
  }

  const item = items[0];
  const pk = item.PK as string;
  const sk = item.SK as string;
  const totalOwed = (item.totalOwed as number) || 0;

  await repo.updateItem(
    pk,
    sk,
    'SET totalPaid = :paid, paymentStatus = :status',
    { ':paid': totalOwed, ':status': 'paid' },
    null
  );

  return { id: regId, totalPaid: totalOwed, totalOwed, paymentStatus: 'paid' };
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
    paymentMethod: item.paymentMethod ?? 'stripe',
    totalPaid: item.totalPaid ?? 0,
    totalOwed: item.totalOwed ?? 0,
    zelleAmount: item.zelleAmount ?? 0,
    paymentStatus: item.paymentStatus ?? '',
    attended: item.attended ?? false,
    attendanceMarkedAt: item.attendanceMarkedAt ?? '',
    attendanceMarkedBy: item.attendanceMarkedBy ?? '',
    // Intentionally omit paymentIntentId
  };
}
