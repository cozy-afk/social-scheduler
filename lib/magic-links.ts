import { VAMagicLink, User } from '@/types/models';

/**
 * Creates a permanent (no expiry) magic link for a VA.
 * Only revocable manually via the admin panel.
 */
export function createVAMagicLink(va: User): VAMagicLink {
  const now = new Date();

  const payload = {
    vaId: va.id,
    vaName: va.name,
    assignedModels: va.assignedModels,
    createdAt: now.toISOString(),
  };

  const token = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return {
    id: `ml-${Date.now()}`,
    token,
    vaId: va.id,
    vaName: va.name,
    assignedModels: va.assignedModels,
    createdAt: now.toISOString(),
    expiresAt: '9999-12-31T23:59:59.000Z', // effectively permanent
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
} | null {
  try {
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
 * Validate a magic link — only checks isActive (no expiry check).
 */
export function validateMagicLink(link: VAMagicLink): { valid: boolean; reason?: string } {
  if (!link.isActive) {
    return { valid: false, reason: 'Link has been deactivated' };
  }
  return { valid: true };
}
