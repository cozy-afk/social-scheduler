import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Standard API response types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

// Standard error codes
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

// Anthropic client singleton
let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Response helpers
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data } as ApiResponse<T>,
    { status }
  );
}

export function errorResponse(
  message: string,
  status: number = 500,
  code?: ApiErrorCode,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  console.error(`[API Error] ${message}`, details);
  return NextResponse.json(
    {
      error: message,
      ...(code && { code }),
      ...(details && { details }),
    } as ApiErrorResponse,
    { status }
  );
}

export function validationErrorResponse(
  message: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 400, ApiErrorCode.VALIDATION_ERROR, details);
}

export function unauthorizedResponse(
  message: string = 'Unauthorized',
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 401, ApiErrorCode.AUTHENTICATION_ERROR, details);
}

export function forbiddenResponse(
  message: string = 'Forbidden',
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 403, ApiErrorCode.AUTHORIZATION_ERROR, details);
}

export function notFoundResponse(
  message: string = 'Resource not found',
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 404, ApiErrorCode.NOT_FOUND, details);
}

// Request validation helpers
export async function parseRequestBody<T>(req: NextRequest): Promise<T> {
  try {
    const body = await req.json();
    return body as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

export function validateRequiredFields<T>(
  body: T,
  requiredFields: (keyof T)[]
): { valid: true } | { valid: false; missing: string[] } {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(String(field));
    }
  }

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

// JSON parsing helpers
export function parseAnthropicJsonResponse(rawText: string): unknown {
  let text = rawText.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(text);
  } catch (error) {
    // Try to extract JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Failed to parse JSON response');
  }
}

// Type-safe error message extraction
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

// Safe fetch wrapper with error handling
export async function safeFetch(
  url: string,
  options?: RequestInit,
  errorMessage: string = 'External API request failed'
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || errorData.error || `${errorMessage}: ${response.status}`
      );
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(errorMessage);
  }
}

// Meta API helper
const META_API_BASE = 'https://graph.facebook.com/v19.0';

export interface MetaApiConfig {
  accessToken?: string;
  igUserId?: string;
}

export function getMetaConfig(req: NextRequest, searchParams: URLSearchParams): MetaApiConfig {
  const accessToken = searchParams.get('accessToken') || process.env.META_ACCESS_TOKEN;
  const igUserId = searchParams.get('igUserId') || process.env.META_IG_USER_ID;

  return { accessToken, igUserId };
}

export function validateMetaConfig(config: MetaApiConfig): void {
  if (!config.accessToken || !config.igUserId) {
    throw new Error('Missing accessToken or igUserId');
  }
}

export function buildMetaUrl(
  endpoint: string,
  params: Record<string, string | number | boolean>
): string {
  const queryString = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return `${META_API_BASE}/${endpoint}${queryString ? `?${queryString}` : ''}`;
}

// Rate limiting helper (in-memory, for production use Redis)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every minute to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

// Request size validation
export function validateRequestSize(req: NextRequest, maxSizeBytes: number = 10 * 1024 * 1024): void {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
    throw new Error(`Request body too large (max ${maxSizeBytes} bytes)`);
  }
}

// Base64 validation
export function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

// Image MIME type validation
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function isValidImageMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType.toLowerCase());
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Platform and post type validation
import { Platform, PostType } from '@/types/models';

export function isValidPlatform(platform: string): platform is Platform {
  return ['instagram', 'tiktok', 'x', 'threads', 'fanvue'].includes(platform);
}

export function isValidPostType(postType: string): postType is PostType {
  return [
    'instagram_post',
    'instagram_reel',
    'instagram_story',
    'tiktok_reel',
    'tiktok_slideshow',
    'tiktok_story',
    'x_post',
    'threads_post',
    'fanvue_post',
  ].includes(postType);
}

// Async handler wrapper for consistent error handling
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse<unknown>>
): (req: NextRequest) => Promise<NextResponse<unknown>> {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      const message = getErrorMessage(error);
      return errorResponse(message, 500, ApiErrorCode.INTERNAL_ERROR);
    }
  };
}

// Sanitize user input to prevent injection attacks
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

// Validate array of items
export function validateArray<T>(
  value: unknown,
  minLength: number = 0,
  maxLength: number = Infinity
): T[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected an array');
  }

  if (value.length < minLength) {
    throw new Error(`Array must have at least ${minLength} items`);
  }

  if (value.length > maxLength) {
    throw new Error(`Array must have at most ${maxLength} items`);
  }

  return value as T[];
}

// Validate string length
export function validateStringLength(
  value: string,
  minLength: number = 0,
  maxLength: number = Infinity
): void {
  if (value.length < minLength) {
    throw new Error(`String must be at least ${minLength} characters`);
  }

  if (value.length > maxLength) {
    throw new Error(`String must be at most ${maxLength} characters`);
  }
}
