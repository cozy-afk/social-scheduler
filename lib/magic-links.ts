import { VAMagicLink } from '@/types/models';
import { User } from '@/types/models';

/**
 * Creates a self-contained base64 token that encodes VA context.
 * No server-side lookup needed — the token IS the payload.
 */
export function createVAMagicLink(va: User): VAMagicLink {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

  const payload = {
    vaId: va.id,
    vaName: va.name,
    assignedModels: va.assignedModels,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Base64url-encode the payload as the token
  const token = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return {
    id: `ml-${Date.now()}`,
    token,
    vaId: va.id,
    vaName: va.name,
    assignedModels: va.assignedModels,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isActive: true,
  };
}

/**
 * Decode a self-contained token back to VA context payload.
 */
export function decodeVAToken(token: string): {
  vaId: string;
  vaName: string;
  assignedModels: string[];
  createdAt: string;
  expiresAt: string;
} | null {
  try {
    // Re-add base64 padding
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4;
    const padded2 = pad ? padded + '='.repeat(4 - pad) : padded;
    return JSON.parse(atob(padded2));
  } catch {
    return null;
  }
}

/**
 * Get the full URL for a VA magic link.
 */
export function getVAMagicLinkURL(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/va/${token}`;
  }
  return `/va/${token}`;
}

/**
 * Validate a magic link object.
 */
export function validateMagicLink(link: VAMagicLink): { valid: boolean; reason?: string } {
  if (!link.isActive) {
    return { valid: false, reason: 'Link has been deactivated' };
  }
  if (new Date() > new Date(link.expiresAt)) {
    return { valid: false, reason: 'Link has expired' };
  }
  return { valid: true };
}
