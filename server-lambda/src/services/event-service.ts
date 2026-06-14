import * as repo from '../repository/dynamo-repository.js';
import { BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import type { CreateEventRequest } from '../types/requests.js';

export async function createEvent(req: CreateEventRequest): Promise<Record<string, unknown>> {
  if (!req.id?.trim()) {
    throw new BadRequestError('Event ID is required');
  }

  const existing = await repo.getItem(`EVENT#${req.id}`, 'METADATA');
  if (existing) {
    throw new BadRequestError(`Event with ID '${req.id}' already exists`);
  }

  const now = new Date().toISOString();
  const item: Record<string, unknown> = {
    PK: `EVENT#${req.id}`,
    SK: 'METADATA',
    GSI1PK: 'ENTITY#EVENT',
    GSI1SK: `EVENT#${req.id}`,
    id: req.id,
    name: req.name,
    date: req.date ?? '',
    location: req.location ?? '',
    price: req.price,
    badge: req.badge,
    badgeText: req.badgeText ?? '',
    active: req.active,
    deposit: req.deposit ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  if (req.lat != null) item.lat = req.lat;
  if (req.lng != null) item.lng = req.lng;
  if (req.capacity != null) {
    item.capacity = req.capacity;
    item.spotsLeft = req.capacity;
  }

  await repo.putItem(item);
  return itemToEventMap(item);
}

export async function getEvent(eventId: string): Promise<Record<string, unknown>> {
  const item = await repo.getItem(`EVENT#${eventId}`, 'METADATA');
  if (!item) {
    throw new NotFoundError(`Event not found: ${eventId}`);
  }
  return itemToEventMap(item);
}

export async function listEvents(activeOnly: boolean): Promise<Record<string, unknown>[]> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', 'ENTITY#EVENT', 'GSI1SK', 'EVENT#');
  return items
    .filter((item) => !activeOnly || item.active === true)
    .map(itemToEventMap);
}

export async function updateEvent(
  eventId: string,
  req: CreateEventRequest
): Promise<Record<string, unknown>> {
  const existing = await repo.getItem(`EVENT#${eventId}`, 'METADATA');
  if (!existing) {
    throw new NotFoundError(`Event not found: ${eventId}`);
  }

  const now = new Date().toISOString();
  const item: Record<string, unknown> = { ...existing };

  if (req.name != null) item.name = req.name;
  if (req.date != null) item.date = req.date;
  if (req.location != null) item.location = req.location;
  if (req.lat != null) item.lat = req.lat;
  if (req.lng != null) item.lng = req.lng;
  item.price = req.price;
  item.badge = req.badge;
  if (req.badgeText != null) item.badgeText = req.badgeText;
  item.active = req.active;

  if (req.capacity != null) {
    const oldCapacity = (existing.capacity as number) || 0;
    const oldSpotsLeft = (existing.spotsLeft as number) || 0;
    const newCapacity = req.capacity;
    const newSpotsLeft = Math.max(0, oldSpotsLeft + (newCapacity - oldCapacity));
    item.capacity = newCapacity;
    item.spotsLeft = newSpotsLeft;
  }
  if (req.deposit != null) {
    item.deposit = req.deposit;
  }
  item.updatedAt = now;

  await repo.putItem(item);
  return itemToEventMap(item);
}

export async function decrementSpotsLeft(eventId: string): Promise<void> {
  const event = await getEvent(eventId);
  const capacity = (event.capacity as number) || 0;
  if (capacity === 0) return; // no capacity limit set

  try {
    await repo.updateItemWithCondition(
      `EVENT#${eventId}`,
      'METADATA',
      'SET spotsLeft = spotsLeft - :one, updatedAt = :now',
      {
        ':one': 1,
        ':zero': 0,
        ':now': new Date().toISOString(),
      },
      null,
      'spotsLeft > :zero'
    );
  } catch (e) {
    if (e instanceof repo.ConditionalCheckFailedException) {
      throw new BadRequestError('This event is sold out');
    }
    throw e;
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  const existing = await repo.getItem(`EVENT#${eventId}`, 'METADATA');
  if (!existing) {
    throw new NotFoundError(`Event not found: ${eventId}`);
  }

  // Delete all registrations and their disclosure acceptances
  const registrations = await repo.queryByPkAndSkPrefix(`EVENT#${eventId}`, 'REG#');
  for (const reg of registrations) {
    const regId = reg.id as string;
    // Delete disclosure acceptances for this registration
    const acceptances = await repo.queryByPkAndSkPrefix(`REG#${regId}`, 'DISCLOSURE#');
    for (const acc of acceptances) {
      await repo.deleteItem(acc.PK as string, acc.SK as string);
    }
    // Delete the registration
    await repo.deleteItem(reg.PK as string, reg.SK as string);
  }

  // Delete event-disclosure links
  const disclosureLinks = await repo.queryByPkAndSkPrefix(`EVENT#${eventId}`, 'DISCLOSURE#');
  for (const link of disclosureLinks) {
    await repo.deleteItem(link.PK as string, link.SK as string);
  }

  // Delete the event
  await repo.deleteItem(`EVENT#${eventId}`, 'METADATA');
}

function itemToEventMap(item: Record<string, unknown>): Record<string, unknown> {
  return {
    id: item.id ?? '',
    name: item.name ?? '',
    date: item.date ?? '',
    location: item.location ?? '',
    lat: item.lat ?? 0,
    lng: item.lng ?? 0,
    price: item.price ?? 0,
    badge: item.badge ?? false,
    badgeText: item.badgeText ?? '',
    active: item.active ?? false,
    capacity: (item.capacity as number) ?? 0,
    spotsLeft: (item.spotsLeft as number) ?? 0,
    deposit: item.deposit ?? 0,
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
}
