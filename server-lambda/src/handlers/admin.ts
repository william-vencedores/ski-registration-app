import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as registrationService from '../services/registration-service.js';
import { requireAuth } from '../middleware/jwt-auth.js';
import { jsonResponse, handleError } from '../middleware/error-handler.js';

export async function handleListRegistrations(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    const eventId = event.queryStringParameters?.eventId;
    const registrations = await registrationService.listRegistrations(eventId ?? undefined);
    return jsonResponse(200, { total: registrations.length, registrations });
  } catch (e) {
    return handleError(e);
  }
}

export async function handleGetRegistration(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    return jsonResponse(200, await registrationService.getRegistration(id));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleToggleAttendance(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    const username = requireAuth(event);
    const body = JSON.parse(event.body || '{}');
    const result = await registrationService.toggleAttendance(id, body.attended, username);
    return jsonResponse(200, result);
  } catch (e) {
    return handleError(e);
  }
}

export async function handleResendEmail(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    return jsonResponse(200, await registrationService.resendEmail(id));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleStats(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    return jsonResponse(200, await registrationService.getStats());
  } catch (e) {
    return handleError(e);
  }
}
