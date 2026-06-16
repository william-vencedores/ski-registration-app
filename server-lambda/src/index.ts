import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { handleCorsPreFlight, addCorsHeaders } from './middleware/cors.js';
import { jsonResponse } from './middleware/error-handler.js';

// Auth handlers
import { handleLogin, handleMe } from './handlers/auth.js';
// Event handlers
import {
  handleListEvents, handleGetEvent, handleGetEventDisclosures,
  handleCreateEvent, handleUpdateEvent, handleDeleteEvent,
  handleAttachDisclosure, handleDetachDisclosure,
} from './handlers/events.js';
// Registration handlers
import { handleSubmit, handlePayBalance, handleCheckRegistration } from './handlers/registration.js';
// Payment handlers
import { handleCreateIntent, handleCreateBalanceIntent } from './handlers/payment.js';
// Webhook handler
import { handleWebhook } from './handlers/webhook.js';
// Admin handlers
import {
  handleListRegistrations, handleGetRegistration,
  handleToggleAttendance, handleResendEmail, handleStats, handleMarkAsPaid,
  handleSetAmountPaid,
} from './handlers/admin.js';
// Disclosure handlers
import {
  handleListDisclosures, handleGetDisclosure, handleGetDisclosureVersion,
  handleCreateDisclosure, handleUpdateDisclosure, handleDeleteDisclosure,
} from './handlers/disclosure.js';
// Admin user handlers
import {
  handleListUsers, handleCreateUser, handleUpdateUser, handleDeleteUser,
} from './handlers/admin-users.js';
// Returning user handlers
import { handleSendCode, handleVerifyCode } from './handlers/returning.js';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreFlight(event);
  if (preflightResponse) return preflightResponse;

  const method = event.requestContext.http.method;
  const path = event.rawPath;

  let response: APIGatewayProxyResultV2;

  try {
    response = await route(method, path, event);
  } catch (e) {
    console.error('[Router] Unhandled error:', e);
    response = jsonResponse(500, { error: 'Internal server error' });
  }

  return addCorsHeaders(event, response);
}

async function route(
  method: string,
  path: string,
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // ── Health ─────────────────────────────────────────────
  if (method === 'GET' && path === '/api/health') {
    return jsonResponse(200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  // ── Auth ───────────────────────────────────────────────
  if (method === 'POST' && path === '/api/auth/login') {
    return handleLogin(event);
  }
  if (method === 'GET' && path === '/api/auth/me') {
    return handleMe(event);
  }

  // ── Public Events ──────────────────────────────────────
  if (method === 'GET' && path === '/api/events') {
    return handleListEvents(event);
  }
  {
    const match = path.match(/^\/api\/events\/([^/]+)\/disclosures$/);
    if (method === 'GET' && match) {
      return handleGetEventDisclosures(event, match[1]);
    }
  }
  {
    const match = path.match(/^\/api\/events\/([^/]+)$/);
    if (method === 'GET' && match) {
      return handleGetEvent(event, match[1]);
    }
  }

  // ── Registration ───────────────────────────────────────
  if (method === 'POST' && path === '/api/registration/submit') {
    return handleSubmit(event);
  }
  if (method === 'POST' && path === '/api/registration/check') {
    return handleCheckRegistration(event);
  }
  if (method === 'POST' && path === '/api/registration/pay-balance') {
    return handlePayBalance(event);
  }

  // ── Payment ────────────────────────────────────────────
  if (method === 'POST' && path === '/api/payment/create-intent') {
    return handleCreateIntent(event);
  }
  if (method === 'POST' && path === '/api/payment/create-balance-intent') {
    return handleCreateBalanceIntent(event);
  }

  // ── Webhook ────────────────────────────────────────────
  if (method === 'POST' && path === '/api/webhook') {
    return handleWebhook(event);
  }

  // ── Returning User ─────────────────────────────────────
  if (method === 'POST' && path === '/api/returning/send-code') {
    return handleSendCode(event);
  }
  if (method === 'POST' && path === '/api/returning/verify-code') {
    return handleVerifyCode(event);
  }

  // ── Admin: Registrations ───────────────────────────────
  if (method === 'GET' && path === '/api/admin/registrations') {
    return handleListRegistrations(event);
  }
  if (method === 'GET' && path === '/api/admin/stats') {
    return handleStats(event);
  }
  {
    const match = path.match(/^\/api\/admin\/registrations\/([^/]+)\/attendance$/);
    if (method === 'PATCH' && match) {
      return handleToggleAttendance(event, match[1]);
    }
  }
  {
    const match = path.match(/^\/api\/admin\/registrations\/([^/]+)\/email$/);
    if (method === 'POST' && match) {
      return handleResendEmail(event, match[1]);
    }
  }
  {
    const match = path.match(/^\/api\/admin\/registrations\/([^/]+)\/paid$/);
    if (method === 'PATCH' && match) {
      return handleMarkAsPaid(event, match[1]);
    }
  }
  {
    const match = path.match(/^\/api\/admin\/registrations\/([^/]+)\/amount-paid$/);
    if (method === 'PATCH' && match) {
      return handleSetAmountPaid(event, match[1]);
    }
  }
  {
    const match = path.match(/^\/api\/admin\/registrations\/([^/]+)$/);
    if (method === 'GET' && match) {
      return handleGetRegistration(event, match[1]);
    }
  }

  // ── Admin: Events ──────────────────────────────────────
  if (method === 'POST' && path === '/api/admin/events') {
    return handleCreateEvent(event);
  }
  {
    const match = path.match(/^\/api\/admin\/events\/([^/]+)\/disclosures\/([^/]+)$/);
    if (method === 'DELETE' && match) {
      return handleDetachDisclosure(event, match[1], match[2]);
    }
  }
  {
    const match = path.match(/^\/api\/admin\/events\/([^/]+)\/disclosures$/);
    if (method === 'POST' && match) {
      return handleAttachDisclosure(event, match[1]);
    }
  }
  {
    const match = path.match(/^\/api\/admin\/events\/([^/]+)$/);
    if (match) {
      if (method === 'PUT') return handleUpdateEvent(event, match[1]);
      if (method === 'DELETE') return handleDeleteEvent(event, match[1]);
    }
  }

  // ── Admin: Disclosures ─────────────────────────────────
  if (method === 'GET' && path === '/api/admin/disclosures') {
    return handleListDisclosures(event);
  }
  if (method === 'POST' && path === '/api/admin/disclosures') {
    return handleCreateDisclosure(event);
  }
  {
    const match = path.match(/^\/api\/admin\/disclosures\/([^/]+)\/versions\/(\d+)$/);
    if (method === 'GET' && match) {
      return handleGetDisclosureVersion(event, match[1], parseInt(match[2], 10));
    }
  }
  {
    const match = path.match(/^\/api\/admin\/disclosures\/([^/]+)$/);
    if (match) {
      if (method === 'GET') return handleGetDisclosure(event, match[1]);
      if (method === 'PUT') return handleUpdateDisclosure(event, match[1]);
      if (method === 'DELETE') return handleDeleteDisclosure(event, match[1]);
    }
  }

  // ── Admin: Users ───────────────────────────────────────
  if (method === 'GET' && path === '/api/admin/users') {
    return handleListUsers(event);
  }
  if (method === 'POST' && path === '/api/admin/users') {
    return handleCreateUser(event);
  }
  {
    const match = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (match) {
      if (method === 'PUT') return handleUpdateUser(event, match[1]);
      if (method === 'DELETE') return handleDeleteUser(event, match[1]);
    }
  }

  // ── 404 ────────────────────────────────────────────────
  return jsonResponse(404, { error: `Not found: ${method} ${path}` });
}
