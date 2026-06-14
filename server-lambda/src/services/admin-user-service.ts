import bcrypt from 'bcryptjs';
import * as repo from '../repository/dynamo-repository.js';
import { BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import type { CreateAdminUserRequest } from '../types/requests.js';

export async function createUser(req: CreateAdminUserRequest): Promise<Record<string, unknown>> {
  if (!req.username || !req.password) {
    throw new BadRequestError('Username and password are required');
  }

  const existing = await repo.getItem('ADMIN', `USER#${req.username}`);
  if (existing) {
    throw new BadRequestError(`User already exists: ${req.username}`);
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(req.password, 10);

  const item: Record<string, unknown> = {
    PK: 'ADMIN',
    SK: `USER#${req.username}`,
    username: req.username,
    passwordHash,
    displayName: req.displayName || req.username,
    createdAt: now,
  };

  await repo.putItem(item);
  return userToMap(item);
}

export async function listUsers(): Promise<Record<string, unknown>[]> {
  const items = await repo.queryByPkAndSkPrefix('ADMIN', 'USER#');
  return items.map(userToMap);
}

export async function updateUser(
  username: string,
  req: CreateAdminUserRequest
): Promise<Record<string, unknown>> {
  const existing = await repo.getItem('ADMIN', `USER#${username}`);
  if (!existing) {
    throw new NotFoundError(`User not found: ${username}`);
  }

  const parts: string[] = [];
  const exprValues: Record<string, unknown> = {};

  if (req.displayName != null) {
    parts.push('displayName = :dn');
    exprValues[':dn'] = req.displayName;
  }
  if (req.password?.trim()) {
    parts.push('passwordHash = :ph');
    exprValues[':ph'] = await bcrypt.hash(req.password, 10);
  }

  if (parts.length === 0) {
    throw new BadRequestError('Nothing to update');
  }

  await repo.updateItem('ADMIN', `USER#${username}`, `SET ${parts.join(', ')}`, exprValues, null);

  const updated = await repo.getItem('ADMIN', `USER#${username}`);
  return userToMap(updated!);
}

export async function deleteUser(username: string): Promise<void> {
  const allAdmins = await repo.queryByPkAndSkPrefix('ADMIN', 'USER#');
  if (allAdmins.length <= 1) {
    throw new BadRequestError('Cannot delete the last admin user');
  }

  const existing = await repo.getItem('ADMIN', `USER#${username}`);
  if (!existing) {
    throw new NotFoundError(`User not found: ${username}`);
  }

  await repo.deleteItem('ADMIN', `USER#${username}`);
}

export async function ensureDefaultAdmin(
  defaultUsername: string,
  defaultPassword: string
): Promise<void> {
  const admins = await repo.queryByPkAndSkPrefix('ADMIN', 'USER#');
  if (admins.length === 0) {
    await createUser({
      username: defaultUsername,
      password: defaultPassword,
      displayName: 'Admin',
    });
  }
}

export async function verifyPassword(username: string, password: string): Promise<boolean> {
  const item = await repo.getItem('ADMIN', `USER#${username}`);
  if (!item) return false;
  return bcrypt.compare(password, item.passwordHash as string);
}

function userToMap(item: Record<string, unknown>): Record<string, unknown> {
  return {
    username: item.username ?? '',
    displayName: item.displayName ?? '',
    createdAt: item.createdAt ?? '',
    lastLogin: item.lastLogin ?? '',
    // Never expose passwordHash
  };
}
