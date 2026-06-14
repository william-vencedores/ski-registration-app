import { v4 as uuidv4 } from 'uuid';
import * as repo from '../repository/dynamo-repository.js';
import { NotFoundError } from '../middleware/error-handler.js';
import type { CreateDisclosureRequest } from '../types/requests.js';

export async function createDisclosure(req: CreateDisclosureRequest): Promise<Record<string, unknown>> {
  const id = uuidv4().substring(0, 8);
  const now = new Date().toISOString();
  const version = 1;

  // Write version record
  const versionItem: Record<string, unknown> = {
    PK: `DISCLOSURE#${id}`,
    SK: `VERSION#${version}`,
    id,
    version,
    titleEs: req.titleEs,
    titleEn: req.titleEn,
    contentEs: req.contentEs,
    contentEn: req.contentEn,
    required: req.required,
    createdAt: now,
  };
  await repo.putItem(versionItem);

  // Write LATEST pointer
  const latestItem: Record<string, unknown> = {
    PK: `DISCLOSURE#${id}`,
    SK: 'LATEST',
    id,
    latestVersion: version,
    titleEs: req.titleEs,
    titleEn: req.titleEn,
    required: req.required,
    createdAt: now,
  };
  await repo.putItem(latestItem);

  return itemToDisclosureMap(versionItem);
}

export async function updateDisclosure(
  id: string,
  req: CreateDisclosureRequest
): Promise<Record<string, unknown>> {
  const latest = await repo.getItem(`DISCLOSURE#${id}`, 'LATEST');
  if (!latest) {
    throw new NotFoundError(`Disclosure not found: ${id}`);
  }

  const newVersion = ((latest.latestVersion as number) || 0) + 1;
  const now = new Date().toISOString();

  // Write new version
  const versionItem: Record<string, unknown> = {
    PK: `DISCLOSURE#${id}`,
    SK: `VERSION#${newVersion}`,
    id,
    version: newVersion,
    titleEs: req.titleEs,
    titleEn: req.titleEn,
    contentEs: req.contentEs,
    contentEn: req.contentEn,
    required: req.required,
    createdAt: now,
  };
  await repo.putItem(versionItem);

  // Update LATEST pointer
  await repo.updateItem(
    `DISCLOSURE#${id}`,
    'LATEST',
    'SET latestVersion = :v, titleEs = :tEs, titleEn = :tEn, #req = :req',
    {
      ':v': newVersion,
      ':tEs': req.titleEs,
      ':tEn': req.titleEn,
      ':req': req.required,
    },
    { '#req': 'required' }
  );

  return itemToDisclosureMap(versionItem);
}

export async function getDisclosure(id: string): Promise<Record<string, unknown>> {
  const latest = await repo.getItem(`DISCLOSURE#${id}`, 'LATEST');
  if (!latest) {
    throw new NotFoundError(`Disclosure not found: ${id}`);
  }
  const version = (latest.latestVersion as number) || 1;
  const versionItem = await repo.getItem(`DISCLOSURE#${id}`, `VERSION#${version}`);
  return itemToDisclosureMap(versionItem!);
}

export async function getDisclosureVersion(
  id: string,
  version: number
): Promise<Record<string, unknown>> {
  const item = await repo.getItem(`DISCLOSURE#${id}`, `VERSION#${version}`);
  if (!item) {
    throw new NotFoundError(`Disclosure version not found: ${id} v${version}`);
  }
  return itemToDisclosureMap(item);
}

export async function listDisclosures(): Promise<Record<string, unknown>[]> {
  const items = await repo.scanWithFilter('begins_with(SK, :sk)', { ':sk': 'LATEST' });
  const disclosures: Record<string, unknown>[] = [];

  for (const item of items) {
    if (typeof item.PK !== 'string' || !item.PK.startsWith('DISCLOSURE#')) continue;
    const id = item.id as string;
    const version = (item.latestVersion as number) || 1;
    const versionItem = await repo.getItem(`DISCLOSURE#${id}`, `VERSION#${version}`);
    if (versionItem) {
      const map = itemToDisclosureMap(versionItem);
      map.latestVersion = version;
      disclosures.push(map);
    }
  }

  return disclosures;
}

export async function deleteDisclosure(id: string): Promise<void> {
  const latest = await repo.getItem(`DISCLOSURE#${id}`, 'LATEST');
  if (!latest) {
    throw new NotFoundError(`Disclosure not found: ${id}`);
  }
  const allItems = await repo.queryByPk(`DISCLOSURE#${id}`);
  for (const item of allItems) {
    await repo.deleteItem(item.PK as string, item.SK as string);
  }
}

export async function attachToEvent(
  eventId: string,
  disclosureId: string,
  displayOrder: number
): Promise<void> {
  const disclosure = await repo.getItem(`DISCLOSURE#${disclosureId}`, 'LATEST');
  if (!disclosure) {
    throw new NotFoundError(`Disclosure not found: ${disclosureId}`);
  }

  await repo.putItem({
    PK: `EVENT#${eventId}`,
    SK: `DISCLOSURE#${disclosureId}`,
    eventId,
    disclosureId,
    displayOrder,
    addedAt: new Date().toISOString(),
  });
}

export async function detachFromEvent(eventId: string, disclosureId: string): Promise<void> {
  await repo.deleteItem(`EVENT#${eventId}`, `DISCLOSURE#${disclosureId}`);
}

export async function getEventDisclosures(eventId: string): Promise<Record<string, unknown>[]> {
  const links = await repo.queryByPkAndSkPrefix(`EVENT#${eventId}`, 'DISCLOSURE#');

  const sorted = links.sort(
    (a, b) => ((a.displayOrder as number) || 0) - ((b.displayOrder as number) || 0)
  );

  const result: Record<string, unknown>[] = [];
  for (const link of sorted) {
    const disclosureId = link.disclosureId as string;
    try {
      const disclosure = await getDisclosure(disclosureId);
      disclosure.displayOrder = (link.displayOrder as number) || 0;
      result.push(disclosure);
    } catch {
      // Skip if disclosure not found
    }
  }
  return result;
}

function itemToDisclosureMap(item: Record<string, unknown>): Record<string, unknown> {
  return {
    id: item.id ?? '',
    version: (item.version as number) ?? 0,
    titleEs: item.titleEs ?? '',
    titleEn: item.titleEn ?? '',
    contentEs: item.contentEs ?? '',
    contentEn: item.contentEn ?? '',
    required: item.required ?? false,
    createdAt: item.createdAt ?? '',
  };
}
