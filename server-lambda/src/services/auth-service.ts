import * as repo from '../repository/dynamo-repository.js';
import * as adminUserService from './admin-user-service.js';
import { generateToken } from '../middleware/jwt-auth.js';

export async function login(
  username: string,
  password: string
): Promise<Record<string, unknown> | null> {
  const valid = await adminUserService.verifyPassword(username, password);

  if (!valid) {
    // Delay on failure to slow brute force
    await new Promise((resolve) => setTimeout(resolve, 600));
    return null;
  }

  // Update lastLogin
  await repo.updateItem(
    'ADMIN',
    `USER#${username}`,
    'SET lastLogin = :t',
    { ':t': new Date().toISOString() },
    null
  );

  const token = generateToken(username, 'admin');
  return {
    token,
    expiresIn: '8h',
    username,
  };
}
