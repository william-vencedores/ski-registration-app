import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { AuthError } from './jwt-auth.js';

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function handleError(error: unknown): APIGatewayProxyResultV2 {
  if (error instanceof BadRequestError) {
    return jsonResponse(400, { error: error.message });
  }
  if (error instanceof NotFoundError) {
    return jsonResponse(404, { error: error.message });
  }
  if (error instanceof AuthError) {
    return jsonResponse(401, { error: error.message });
  }

  console.error('[Error]', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return jsonResponse(500, { error: message });
}

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
