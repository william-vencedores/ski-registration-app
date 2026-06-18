import { randomBytes } from 'crypto';
import * as repo from '../repository/dynamo-repository.js';
import * as eventService from './event-service.js';
import * as emailService from './email-service.js';
import * as disclosureService from './disclosure-service.js';
import { BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import { isValidEmail } from '../utils/validation.js';
import type { SubmitRegistrationRequest, AddMinorsRequest, MinorInput } from '../types/requests.js';

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
  if (!isValidEmail(req.email)) {
    throw new BadRequestError('A valid email address is required');
  }
  if (!isZelle && !req.paymentIntentId) {
    throw new BadRequestError('Missing required fields');
  }

  // Check for duplicate registration (same email + same event)
  if (await isAlreadyRegistered(req.eventId, req.email)) {
    throw new BadRequestError('You are already registered for this event.');
  }

  // Validate event exists
  const event = await eventService.getEvent(req.eventId);

  // Compute per-person amounts authoritatively from the event (never trust the
  // client). Every participant — the guardian and any minors — pays the same
  // per-person price; the single card charge / Zelle transfer covers them all.
  const price = (event.price as number) || 0;
  const deposit = (event.deposit as number) || 0;
  const baseAmount = req.partialPayment && deposit > 0 ? deposit : price;
  const perPersonOwed = price;
  const perPersonPaid = isZelle ? 0 : baseAmount;
  const perPersonStatus = isZelle
    ? 'pending'
    : perPersonPaid >= perPersonOwed
      ? 'paid'
      : 'partial';

  // Keep only minors that actually have a name entered.
  const minors = (req.minors ?? []).filter(
    (m) => m && (m.firstName?.trim() || m.lastName?.trim())
  );
  const headcount = 1 + minors.length;

  // When a minor is being registered, every minor-audience disclosure marked
  // required for this event must be accepted (one guardian acceptance covers all
  // minors). Enforced server-side so the client check can't be bypassed.
  if (minors.length > 0) {
    const eventDisclosures = await disclosureService.getEventDisclosures(req.eventId);
    const accepted = req.disclosureAcceptances ?? [];
    const missing = eventDisclosures.filter(
      (d) =>
        d.audience === 'minors' &&
        d.required === true &&
        !accepted.some((a) => a.disclosureId === d.id && a.version === d.version)
    );
    if (missing.length > 0) {
      throw new BadRequestError(
        'Additional minor waiver(s) must be accepted when registering a minor.'
      );
    }
  }

  const now = new Date().toISOString();
  const guardianId = isZelle
    ? randomBytes(4).toString('hex').toUpperCase()
    : req.paymentIntentId!.substring(req.paymentIntentId!.length - 8).toUpperCase();
  const guardianName = `${req.firstName} ${req.lastName}`;
  const normalizedEmail = req.email.toLowerCase().trim();

  // Reserve a spot for every head. The guardian decrement mirrors the original
  // single-person behaviour (throws if the event is already sold out). Minor
  // decrements are best-effort: the payment is already captured by this point,
  // so a late capacity miss must not discard a paid registration.
  await eventService.decrementSpotsLeft(req.eventId);
  for (let i = 0; i < minors.length; i++) {
    try {
      await eventService.decrementSpotsLeft(req.eventId);
    } catch (e) {
      if (!(e instanceof BadRequestError)) throw e;
    }
  }

  // Guardian (primary) registration
  const guardianItem: Record<string, unknown> = {
    PK: `EVENT#${req.eventId}`,
    SK: `REG#${guardianId}`,
    GSI1PK: `REG#${guardianId}`,
    GSI1SK: 'METADATA',
    GSI2PK: `EMAIL#${normalizedEmail}`,
    GSI2SK: now,
    id: guardianId,
    createdAt: now,
    eventId: req.eventId,
    eventName: event.name as string,
    // Personal
    firstName: req.firstName,
    lastName: req.lastName,
    email: req.email,
    phone: req.phone ?? '',
    dob: req.dob ?? '',
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
    totalPaid: perPersonPaid,
    totalOwed: perPersonOwed,
    paymentStatus: perPersonStatus,
    isMinor: false,
  };
  if (isZelle) {
    guardianItem.zelleAmount = baseAmount;
  }

  await repo.putItem(guardianItem);
  await saveDisclosureAcceptances(guardianId, req.disclosureAcceptances, now);

  // One registration per minor, linked back to the guardian. We only collected
  // the minor's name and date of birth; contact and emergency details are
  // inherited from the guardian, who signs the documents on their behalf.
  const minorCtx: MinorContext = {
    eventId: req.eventId,
    eventName: event.name as string,
    guardianId,
    guardianName,
    email: req.email,
    phone: req.phone ?? '',
    emergencyName: req.emergencyName ?? '',
    emergencyPhone: req.emergencyPhone ?? '',
    emergencyRelation: req.emergencyRelation ?? '',
    signature: req.signature ?? '',
    liabilityAccepted: req.liabilityAccepted,
    medicalAccepted: req.medicalAccepted,
    paymentMethod: isZelle ? 'zelle' : 'stripe',
    paymentIntentId: req.paymentIntentId ?? '',
    totalPaid: perPersonPaid,
    totalOwed: perPersonOwed,
    paymentStatus: perPersonStatus,
    zelleAmount: baseAmount,
  };
  for (const minor of minors) {
    const minorItem = buildMinorItem(minor, minorCtx, now);
    await repo.putItem(minorItem);
    await saveDisclosureAcceptances(minorItem.id as string, req.disclosureAcceptances, now);
  }

  // Emails reflect the whole group the guardian paid for.
  const groupPaid = perPersonPaid * headcount;
  const groupOwed = perPersonOwed * headcount;
  const groupZelle = baseAmount * headcount;

  if (isZelle) {
    await emailService.sendZellePendingEmail(
      req.email,
      guardianName,
      event.name as string,
      guardianId,
      groupZelle
    );
  } else {
    await emailService.sendConfirmationEmail(
      req.email,
      guardianName,
      event.name as string,
      guardianId,
      groupPaid
    );
  }

  // Notify the admin inbox of every new registration (failures are swallowed
  // inside sendEmail, so this never blocks a successful registration).
  await emailService.sendAdminNotificationEmail({
    firstName: req.firstName,
    lastName: req.lastName,
    email: req.email,
    phone: req.phone,
    eventName: event.name as string,
    confirmationId: guardianId,
    paymentMethod: isZelle ? 'zelle' : 'stripe',
    paymentStatus: perPersonStatus,
    totalPaid: groupPaid,
    totalOwed: groupOwed,
    zelleAmount: isZelle ? groupZelle : undefined,
    headcount,
  });

  return {
    success: true,
    confirmationId: guardianId,
    paymentStatus: perPersonStatus,
    headcount,
    message: 'Registration successful',
  };
}

/** Persist one disclosure-acceptance record per accepted disclosure for a reg. */
async function saveDisclosureAcceptances(
  regId: string,
  acceptances: SubmitRegistrationRequest['disclosureAcceptances'],
  now: string
): Promise<void> {
  if (!acceptances) return;
  for (const acceptance of acceptances) {
    await repo.putItem({
      PK: `REG#${regId}`,
      SK: `DISCLOSURE#${acceptance.disclosureId}`,
      regId,
      disclosureId: acceptance.disclosureId,
      acceptedVersion: acceptance.version,
      acceptedAt: now,
    });
  }
}

/** Shared details a minor registration inherits from its guardian. */
interface MinorContext {
  eventId: string;
  eventName: string;
  guardianId: string;
  guardianName: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  signature: string;
  liabilityAccepted: boolean;
  medicalAccepted: boolean;
  paymentMethod: 'stripe' | 'zelle';
  paymentIntentId: string;
  totalPaid: number;
  totalOwed: number;
  paymentStatus: string;
  zelleAmount: number;
}

/**
 * Build a minor's registration item. A minor is its own registration linked to
 * the guardian; we only collected the minor's name and DOB, so contact,
 * emergency and legal details are inherited from the guardian.
 */
function buildMinorItem(
  minor: MinorInput,
  ctx: MinorContext,
  now: string
): Record<string, unknown> {
  const minorId = randomBytes(4).toString('hex').toUpperCase();
  const item: Record<string, unknown> = {
    PK: `EVENT#${ctx.eventId}`,
    SK: `REG#${minorId}`,
    GSI1PK: `REG#${minorId}`,
    GSI1SK: 'METADATA',
    GSI2PK: `EMAIL#${ctx.email.toLowerCase().trim()}`,
    GSI2SK: now,
    id: minorId,
    createdAt: now,
    eventId: ctx.eventId,
    eventName: ctx.eventName,
    firstName: minor.firstName?.trim() ?? '',
    lastName: minor.lastName?.trim() ?? '',
    email: ctx.email,
    phone: ctx.phone,
    dob: minor.dob ?? '',
    emergencyName: ctx.emergencyName,
    emergencyPhone: ctx.emergencyPhone,
    emergencyRelation: ctx.emergencyRelation,
    skillLevel: '',
    dietary: '',
    medConditions: 'no',
    conditionDetails: '',
    medAllergies: 'no',
    allergyDetails: '',
    medMedications: 'no',
    medicationDetails: '',
    liabilityAccepted: ctx.liabilityAccepted,
    medicalAccepted: ctx.medicalAccepted,
    signature: ctx.signature,
    paymentMethod: ctx.paymentMethod,
    paymentIntentId: ctx.paymentIntentId,
    totalPaid: ctx.totalPaid,
    totalOwed: ctx.totalOwed,
    paymentStatus: ctx.paymentStatus,
    isMinor: true,
    guardianRegId: ctx.guardianId,
    guardianName: ctx.guardianName,
  };
  if (ctx.paymentMethod === 'zelle') {
    item.zelleAmount = ctx.zelleAmount;
  }
  return item;
}

/**
 * Add one or more minors to an existing (guardian) registration, charging only
 * for the additional minors. Used by an already-registered parent who comes
 * back to bring a child.
 */
export async function addMinorsToRegistration(
  req: AddMinorsRequest
): Promise<Record<string, unknown>> {
  const isZelle = req.paymentMethod === 'zelle';

  if (!req.guardianRegId) {
    throw new BadRequestError('Missing guardian registration');
  }
  if (!isZelle && !req.paymentIntentId) {
    throw new BadRequestError('Missing required fields');
  }

  const minors = (req.minors ?? []).filter(
    (m) => m && (m.firstName?.trim() || m.lastName?.trim())
  );
  if (minors.length === 0) {
    throw new BadRequestError('At least one minor is required');
  }

  // getRegistration throws NotFoundError if the guardian reg does not exist.
  const guardian = await getRegistration(req.guardianRegId);
  if (guardian.isMinor === true) {
    throw new BadRequestError('Cannot add minors to a minor registration');
  }

  const eventId = guardian.eventId as string;
  const event = await eventService.getEvent(eventId);
  const price = (event.price as number) || 0;
  const deposit = (event.deposit as number) || 0;
  const baseAmount = req.partialPayment && deposit > 0 ? deposit : price;
  const perPersonOwed = price;
  const perPersonPaid = isZelle ? 0 : baseAmount;
  const perPersonStatus = isZelle
    ? 'pending'
    : perPersonPaid >= perPersonOwed
      ? 'paid'
      : 'partial';

  const now = new Date().toISOString();
  const guardianName = `${guardian.firstName} ${guardian.lastName}`.trim();

  // Each minor inherits the guardian's already-accepted disclosures.
  const guardianAcceptances = await getRegistrationAcceptances(req.guardianRegId);
  const acceptances = guardianAcceptances.map((a) => ({
    disclosureId: a.disclosureId as string,
    version: (a.acceptedVersion as number) ?? 0,
  }));

  const ctx: MinorContext = {
    eventId,
    eventName: event.name as string,
    guardianId: req.guardianRegId,
    guardianName,
    email: guardian.email as string,
    phone: (guardian.phone as string) ?? '',
    emergencyName: (guardian.emergencyName as string) ?? '',
    emergencyPhone: (guardian.emergencyPhone as string) ?? '',
    emergencyRelation: (guardian.emergencyRelation as string) ?? '',
    signature: (guardian.signature as string) ?? '',
    liabilityAccepted: guardian.liabilityAccepted === true,
    medicalAccepted: guardian.medicalAccepted === true,
    paymentMethod: isZelle ? 'zelle' : 'stripe',
    paymentIntentId: req.paymentIntentId ?? '',
    totalPaid: perPersonPaid,
    totalOwed: perPersonOwed,
    paymentStatus: perPersonStatus,
    zelleAmount: baseAmount,
  };

  for (const minor of minors) {
    const item = buildMinorItem(minor, ctx, now);
    // Best-effort spot reservation — the payment is already captured, so a late
    // capacity miss must not discard a paid minor registration.
    try {
      await eventService.decrementSpotsLeft(eventId);
    } catch (e) {
      if (!(e instanceof BadRequestError)) throw e;
    }
    await repo.putItem(item);
    await saveDisclosureAcceptances(item.id as string, acceptances, now);
  }

  const count = minors.length;
  const groupPaid = perPersonPaid * count;
  const groupZelle = baseAmount * count;

  if (isZelle) {
    await emailService.sendZellePendingEmail(
      guardian.email as string,
      guardianName,
      event.name as string,
      req.guardianRegId,
      groupZelle
    );
  } else {
    await emailService.sendConfirmationEmail(
      guardian.email as string,
      guardianName,
      event.name as string,
      req.guardianRegId,
      groupPaid
    );
  }

  await emailService.sendAdminNotificationEmail({
    firstName: guardian.firstName as string,
    lastName: guardian.lastName as string,
    email: guardian.email as string,
    phone: guardian.phone as string,
    eventName: event.name as string,
    confirmationId: req.guardianRegId,
    paymentMethod: isZelle ? 'zelle' : 'stripe',
    paymentStatus: perPersonStatus,
    totalPaid: groupPaid,
    totalOwed: perPersonOwed * count,
    zelleAmount: isZelle ? groupZelle : undefined,
  });

  return { success: true, count, paymentStatus: perPersonStatus };
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

/** Fields an admin may edit on a registration. */
const EDITABLE_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'dob',
  'emergencyName', 'emergencyPhone', 'emergencyRelation',
  'skillLevel', 'dietary',
] as const;

/**
 * Update editable contact/personal fields on a registration. When the email
 * changes we also move the GSI2 lookup key (and cascade it to any linked
 * minors) so returning-user verification keeps finding the group.
 */
export async function updateRegistration(
  regId: string,
  updates: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${regId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new NotFoundError(`Registration not found: ${regId}`);
  }
  const item = items[0];

  const setParts: string[] = [];
  const exprValues: Record<string, unknown> = {};
  const exprNames: Record<string, string> = {};
  let newEmailNormalized: string | null = null;

  for (const field of EDITABLE_FIELDS) {
    if (updates[field] === undefined) continue;
    let value = updates[field];

    if (field === 'email') {
      const email = String(value).trim();
      if (!isValidEmail(email)) {
        throw new BadRequestError('A valid email address is required');
      }
      value = email;
      const normalized = email.toLowerCase();
      if (normalized !== String(item.email ?? '').toLowerCase()) {
        newEmailNormalized = normalized;
      }
    } else if (typeof value === 'string') {
      value = value.trim();
    }

    exprNames[`#${field}`] = field;
    exprValues[`:${field}`] = value;
    setParts.push(`#${field} = :${field}`);
  }

  if (newEmailNormalized) {
    exprValues[':gsi2pk'] = `EMAIL#${newEmailNormalized}`;
    setParts.push('GSI2PK = :gsi2pk');
  }

  if (setParts.length === 0) {
    return getRegistration(regId);
  }

  await repo.updateItem(
    item.PK as string,
    item.SK as string,
    `SET ${setParts.join(', ')}`,
    exprValues,
    exprNames
  );

  // Cascade an email change from a guardian to its minors so the whole group
  // stays under one email partition.
  if (newEmailNormalized && item.isMinor !== true) {
    const eventRegs = await repo.queryByPkAndSkPrefix(`EVENT#${item.eventId}`, 'REG#');
    const minors = eventRegs.filter((r) => (r.guardianRegId as string) === regId);
    for (const minor of minors) {
      await repo.updateItem(
        minor.PK as string,
        minor.SK as string,
        'SET #email = :email, GSI2PK = :gsi2pk',
        { ':email': exprValues[':email'], ':gsi2pk': `EMAIL#${newEmailNormalized}` },
        { '#email': 'email' }
      );
    }
  }

  return getRegistration(regId);
}

/**
 * Delete a registration (and its disclosure-acceptance records), restoring the
 * event's available spots. Deleting a guardian cascades to every minor linked
 * to them; deleting a minor removes only that minor.
 */
export async function deleteRegistration(
  regId: string
): Promise<Record<string, unknown>> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${regId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new NotFoundError(`Registration not found: ${regId}`);
  }
  const item = items[0];
  const eventId = item.eventId as string;

  const toDelete = [item];
  if (item.isMinor !== true) {
    const eventRegs = await repo.queryByPkAndSkPrefix(`EVENT#${eventId}`, 'REG#');
    const minors = eventRegs.filter((r) => (r.guardianRegId as string) === regId);
    toDelete.push(...minors);
  }

  for (const member of toDelete) {
    const memberId = member.id as string;
    const disclosures = await repo.queryByPkAndSkPrefix(`REG#${memberId}`, 'DISCLOSURE#');
    for (const d of disclosures) {
      await repo.deleteItem(d.PK as string, d.SK as string);
    }
    await repo.deleteItem(member.PK as string, member.SK as string);
    await eventService.incrementSpotsLeft(eventId);
  }

  return { success: true, deleted: toDelete.length };
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
  _amountPaid: number
): Promise<Record<string, unknown>> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${regId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new NotFoundError(`Registration not found: ${regId}`);
  }

  // The balance payment settles the whole group in full (the client charges the
  // summed remaining of the guardian plus any linked minors), so mark every
  // outstanding per-person record paid. The amount charged is authoritative
  // server-side via createBalancePaymentIntent.
  const guardian = items[0];
  const eventId = guardian.eventId as string;
  const eventRegs = await repo.queryByPkAndSkPrefix(`EVENT#${eventId}`, 'REG#');
  const group = eventRegs.filter(
    (r) => r.id === regId || (r.guardianRegId as string) === regId
  );

  let groupPaid = 0;
  let groupOwed = 0;
  for (const member of group) {
    const owed = (member.totalOwed as number) || 0;
    groupOwed += owed;
    groupPaid += owed;
    if (((member.totalPaid as number) || 0) >= owed) continue;
    await repo.updateItem(
      member.PK as string,
      member.SK as string,
      'SET totalPaid = :paid, paymentStatus = :status',
      { ':paid': owed, ':status': 'paid' },
      null
    );
  }

  return {
    success: true,
    totalPaid: groupPaid,
    totalOwed: groupOwed,
    paymentStatus: 'paid',
  };
}

/**
 * Set the total amount paid for a registration. An admin reconciles this
 * manually — e.g. a Zelle transfer, or the balance on a card deposit paid by
 * other means. The amount is stored as totalPaid (so it flows into revenue
 * stats) and the payment status is recomputed.
 */
export async function setAmountPaid(
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
    isMinor: item.isMinor ?? false,
    guardianRegId: item.guardianRegId ?? '',
    guardianName: item.guardianName ?? '',
    // Intentionally omit paymentIntentId
  };
}
