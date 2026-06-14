import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Replicate Java key padding logic exactly for backward compatibility
function getPaddedSecret(): string {
  const secret = config.jwt.secret;
  return secret.length >= 32 ? secret : (secret + '0'.repeat(32)).substring(0, 32);
}

const paddedSecret = getPaddedSecret();

export interface JwtPayload {
  sub: string;
  role: string;
  username: string;
  iat: number;
  exp: number;
}

export function generateToken(username: string, role: string): string {
  return jwt.sign(
    { sub: username, role, username },
    paddedSecret,
    { expiresIn: `${config.jwt.expirationHours}h` }
  );
}

export function parseToken(token: string): JwtPayload {
  return jwt.verify(token, paddedSecret) as JwtPayload;
}

export function isValid(token: string): boolean {
  try {
    parseToken(token);
    return true;
  } catch {
    return false;
  }
}

export function extractUsername(event: APIGatewayProxyEventV2): string | null {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    const payload = parseToken(token);
    return payload.username || payload.sub;
  } catch {
    return null;
  }
}

export function requireAuth(event: APIGatewayProxyEventV2): string {
  const username = extractUsername(event);
  if (!username) {
    throw new AuthError('Not authenticated');
  }
  return username;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
