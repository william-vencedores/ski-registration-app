import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as adminUserService from '../services/admin-user-service.js';
import { requireAuth } from '../middleware/jwt-auth.js';
import { jsonResponse, handleError } from '../middleware/error-handler.js';

export async function handleListUsers(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    return jsonResponse(200, await adminUserService.listUsers());
  } catch (e) {
    return handleError(e);
  }
}

export async function handleCreateUser(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    const body = JSON.parse(event.body || '{}');
    return jsonResponse(200, await adminUserService.createUser(body));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleUpdateUser(event: APIGatewayProxyEventV2, username: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    const body = JSON.parse(event.body || '{}');
    return jsonResponse(200, await adminUserService.updateUser(username, body));
  } catch (e) {
    return handleError(e);
  }
}

export async function handleDeleteUser(event: APIGatewayProxyEventV2, username: string): Promise<APIGatewayProxyResultV2> {
  try {
    requireAuth(event);
    await adminUserService.deleteUser(username);
    return jsonResponse(200, { success: true });
  } catch (e) {
    return handleError(e);
  }
}
