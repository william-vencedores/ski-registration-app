import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as eventService from '../services/event-service.js';
import * as disclosureService from '../services/disclosure-service.js';
import { requireAuth } from '../middleware/jwt-auth.js';
import { jsonResponse, handleError } from '../middleware/error-handler.js';

// Public
export async function handleListEvents(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const activeOnly = event.queryStringParameters?.activeOnly !== 'false';
    const events = await eventService.listEvents(activeOnly);
    return jsonResponse(200, events);
  } catch (e) {
    return handleError(e);
  }
}

export async function handleGetEvent(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    return jsonResponse(200, await eventService.getEvent(id));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleGetEventDisclosures(event: APIGatewayProxyEventV2, eventId: string): Promise<APIGatewayProxyResultV2> {
  try {
    return jsonResponse(200, await disclosureService.getEventDisclosures(eventId));
  } catch (e) {
    return handleError(e);
  }
}

// Admin
export async function handleCreateEvent(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    const body = JSON.parse(event.body || '{}');
    return jsonResponse(200, await eventService.createEvent(body));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleUpdateEvent(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    const body = JSON.parse(event.body || '{}');
    return jsonResponse(200, await eventService.updateEvent(id, body));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleDeleteEvent(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    await eventService.deleteEvent(id);
    return jsonResponse(200, { success: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function handleAttachDisclosure(event: APIGatewayProxyEventV2, eventId: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    const body = JSON.parse(event.body || '{}');
    await disclosureService.attachToEvent(eventId, body.disclosureId, body.displayOrder);
    return jsonResponse(200, { success: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function handleDetachDisclosure(event: APIGatewayProxyEventV2, eventId: string, disclosureId: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    await disclosureService.detachFromEvent(eventId, disclosureId);
    return jsonResponse(200, { success: true });
  } catch (e) {
    return handleError(e);
  }
}
