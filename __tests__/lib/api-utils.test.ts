/**
 * Unit tests for lib/api-utils.ts — pure utility functions only
 * (no Next.js runtime dependencies)
 */

// Mock next/server so tests run in jsdom without a full edge runtime
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({ data, status: init?.status ?? 200 }),
  },
}));
// Mock the Anthropic SDK (not needed for pure utility tests)
jest.mock('@anthropic-ai/sdk', () => ({ default: class {} }));

import {
  validateRequiredFields,
  parseAnthropicJsonResponse,
  getErrorMessage,
  checkRateLimit,
  isValidBase64,
  isValidImageMimeType,
  isValidUrl,
  isValidPlatform,
  isValidPostType,
  sanitizeInput,
  validateArray,
  validateStringLength,
  buildMetaUrl,
} from '@/lib/api-utils';

// ─── validateRequiredFields ───────────────────────────────────────────────────

describe('validateRequiredFields', () => {
  it('returns valid when all required fields are present', () => {
    const result = validateRequiredFields({ name: 'Alice', age: 30 }, ['name', 'age']);
    expect(result).toEqual({ valid: true });
  });

  it('returns invalid with list of missing fields', () => {
    const result = validateRequiredFields({ name: 'Alice' } as { name: string; age?: number }, ['name', 'age']);
    expect(result).toEqual({ valid: false, missing: ['age'] });
  });

  it('treats empty string as missing', () => {
    const result = validateRequiredFields({ name: '' }, ['name']);
    expect(result).toEqual({ valid: false, missing: ['name'] });
  });

  it('treats null as missing', () => {
    const result = validateRequiredFields({ name: null } as unknown as { name: string }, ['name']);
    expect(result).toEqual({ valid: false, missing: ['name'] });
  });

  it('treats undefined as missing', () => {
    const result = validateRequiredFields({} as { name?: string }, ['name']);
    expect(result).toEqual({ valid: false, missing: ['name'] });
  });

  it('collects multiple missing fields', () => {
    const result = validateRequiredFields(
      {} as { a?: string; b?: string; c?: string },
      ['a', 'b', 'c']
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missing).toHaveLength(3);
    }
  });
});

// ─── parseAnthropicJsonResponse ────────────────────────────────────────────────

describe('parseAnthropicJsonResponse', () => {
  it('parses plain JSON', () => {
    expect(parseAnthropicJsonResponse('{"key":"value"}')).toEqual({ key: 'value' });
  });

  it('strips ```json fences', () => {
    const input = '```json\n{"key":"value"}\n```';
    expect(parseAnthropicJsonResponse(input)).toEqual({ key: 'value' });
  });

  it('strips plain ``` fences', () => {
    const input = '```\n{"key":"value"}\n```';
    expect(parseAnthropicJsonResponse(input)).toEqual({ key: 'value' });
  });

  it('extracts JSON object from surrounding text', () => {
    const input = 'Here is the result: {"key":"value"} — enjoy!';
    expect(parseAnthropicJsonResponse(input)).toEqual({ key: 'value' });
  });

  it('throws on unparseable text', () => {
    expect(() => parseAnthropicJsonResponse('not json at all')).toThrow();
  });
});

// ─── getErrorMessage ──────────────────────────────────────────────────────────

describe('getErrorMessage', () => {
  it('returns message from Error instance', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns string as-is', () => {
    expect(getErrorMessage('oops')).toBe('oops');
  });

  it('returns message from plain object with message key', () => {
    expect(getErrorMessage({ message: 'obj error' })).toBe('obj error');
  });

  it('returns fallback for unknown types', () => {
    expect(getErrorMessage(42)).toBe('An unknown error occurred');
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
  });
});

// ─── checkRateLimit ───────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  const key = () => `test-${Math.random()}`;

  it('allows first request', () => {
    const { allowed } = checkRateLimit(key(), 3, 60000);
    expect(allowed).toBe(true);
  });

  it('counts remaining correctly', () => {
    const id = key();
    checkRateLimit(id, 3, 60000);
    const { remaining } = checkRateLimit(id, 3, 60000);
    expect(remaining).toBe(1);
  });

  it('blocks when limit exceeded', () => {
    const id = key();
    checkRateLimit(id, 2, 60000);
    checkRateLimit(id, 2, 60000);
    const { allowed } = checkRateLimit(id, 2, 60000);
    expect(allowed).toBe(false);
  });

  it('returns resetTime in the future', () => {
    const before = Date.now();
    const { resetTime } = checkRateLimit(key(), 5, 60000);
    expect(resetTime).toBeGreaterThan(before);
  });
});

// ─── isValidUrl ───────────────────────────────────────────────────────────────

describe('isValidUrl', () => {
  it('accepts valid https URL', () => {
    expect(isValidUrl('https://example.com/path')).toBe(true);
  });

  it('accepts valid http URL', () => {
    expect(isValidUrl('http://localhost:3000')).toBe(true);
  });

  it('rejects plain strings', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

// ─── isValidImageMimeType ──────────────────────────────────────────────────────

describe('isValidImageMimeType', () => {
  it('accepts image/jpeg', () => expect(isValidImageMimeType('image/jpeg')).toBe(true));
  it('accepts image/png', () => expect(isValidImageMimeType('image/png')).toBe(true));
  it('accepts image/gif', () => expect(isValidImageMimeType('image/gif')).toBe(true));
  it('accepts image/webp', () => expect(isValidImageMimeType('image/webp')).toBe(true));
  it('rejects video/mp4', () => expect(isValidImageMimeType('video/mp4')).toBe(false));
  it('rejects text/plain', () => expect(isValidImageMimeType('text/plain')).toBe(false));
  it('is case-insensitive', () => expect(isValidImageMimeType('IMAGE/JPEG')).toBe(true));
});

// ─── isValidPlatform ──────────────────────────────────────────────────────────

describe('isValidPlatform', () => {
  it('accepts all known platforms', () => {
    ['instagram', 'tiktok', 'x', 'threads', 'fanvue'].forEach((p) =>
      expect(isValidPlatform(p)).toBe(true)
    );
  });

  it('rejects unknown platforms', () => {
    expect(isValidPlatform('twitter')).toBe(false);
    expect(isValidPlatform('youtube')).toBe(false);
    expect(isValidPlatform('')).toBe(false);
  });
});

// ─── isValidPostType ──────────────────────────────────────────────────────────

describe('isValidPostType', () => {
  it('accepts all known post types', () => {
    [
      'instagram_post', 'instagram_reel', 'instagram_story',
      'tiktok_reel', 'tiktok_slideshow', 'tiktok_story',
      'x_post', 'threads_post', 'fanvue_post',
    ].forEach((t) => expect(isValidPostType(t)).toBe(true));
  });

  it('rejects unknown post types', () => {
    expect(isValidPostType('youtube_video')).toBe(false);
    expect(isValidPostType('')).toBe(false);
  });
});

// ─── sanitizeInput ────────────────────────────────────────────────────────────

describe('sanitizeInput', () => {
  it('removes < and > characters', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('removes control characters', () => {
    expect(sanitizeInput('hello\x00world')).toBe('helloworld');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('leaves normal text untouched', () => {
    expect(sanitizeInput('Hello, world!')).toBe('Hello, world!');
  });
});

// ─── validateArray ────────────────────────────────────────────────────────────

describe('validateArray', () => {
  it('returns array when valid', () => {
    expect(validateArray<number>([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('throws when not an array', () => {
    expect(() => validateArray('not array')).toThrow('Expected an array');
  });

  it('throws when below minLength', () => {
    expect(() => validateArray([1], 2)).toThrow('at least 2');
  });

  it('throws when above maxLength', () => {
    expect(() => validateArray([1, 2, 3], 0, 2)).toThrow('at most 2');
  });

  it('accepts empty array by default', () => {
    expect(validateArray([])).toEqual([]);
  });
});

// ─── validateStringLength ──────────────────────────────────────────────────────

describe('validateStringLength', () => {
  it('does not throw for valid length', () => {
    expect(() => validateStringLength('hello', 1, 10)).not.toThrow();
  });

  it('throws for string too short', () => {
    expect(() => validateStringLength('hi', 5)).toThrow('at least 5');
  });

  it('throws for string too long', () => {
    expect(() => validateStringLength('hello world', 0, 5)).toThrow('at most 5');
  });
});

// ─── buildMetaUrl ────────────────────────────────────────────────────────────

describe('buildMetaUrl', () => {
  it('includes endpoint and query params', () => {
    const url = buildMetaUrl('me/insights', { metric: 'reach', period: 'day' });
    expect(url).toContain('/me/insights');
    expect(url).toContain('metric=reach');
    expect(url).toContain('period=day');
  });

  it('works without params', () => {
    const url = buildMetaUrl('me', {});
    expect(url).toContain('/me');
    expect(url).not.toContain('?');
  });

  it('coerces numbers to strings', () => {
    const url = buildMetaUrl('test', { limit: 30 });
    expect(url).toContain('limit=30');
  });
});
