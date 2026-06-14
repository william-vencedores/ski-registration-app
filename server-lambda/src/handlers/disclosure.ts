import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as disclosureService from '../services/disclosure-service.js';
import { requireAuth } from '../middleware/jwt-auth.js';
import { jsonResponse, handleError } from '../middleware/error-handler.js';

export async function handleListDisclosures(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    return jsonResponse(200, await disclosureService.listDisclosures());
  } catch (e) {
    return handleError(e);
  }
}

export async function handleGetDisclosure(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    return jsonResponse(200, await disclosureService.getDisclosure(id));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleGetDisclosureVersion(event: APIGatewayProxyEventV2, id: string, version: number): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    return jsonResponse(200, await disclosureService.getDisclosureVersion(id, version));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleCreateDisclosure(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    const body = JSON.parse(event.body || '{}');
    return jsonResponse(200, await disclosureService.createDisclosure(body));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleUpdateDisclosure(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    const body = JSON.parse(event.body || '{}');
    return jsonResponse(200, await disclosureService.updateDisclosure(id, body));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleDeleteDisclosure(event: APIGatewayProxyEventV2, id: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    await disclosureService.deleteDisclosure(id);
    return jsonResponse(200, { success: true });
  } catch (e) {
    return handleError(e);
  }
}
