import { Platform } from '@/types/models';
import { addDays, format, startOfDay } from 'date-fns';

// Optimal engagement windows by platform (24h format, model's local time)
export const PLATFORM_PEAK_HOURS: Record<Platform, number[]> = {
  instagram: [9, 12, 18, 20],   // 9am, noon, 6pm, 8pm
  tiktok:    [7, 12, 19, 21],   // 7am, noon, 7pm, 9pm
  threads:   [9, 12, 17, 20],   // 9am, noon, 5pm, 8pm
  x:         [8, 12, 17, 19],   // 8am, noon, 5pm, 7pm
  fanvue:    [9, 13, 20, 22],   // 9am, 1pm, 8pm, 10pm
};

// Hours to never post (model local time) — sleeping / off-peak
const BLACKOUT_HOURS = new Set([0, 1, 2, 3, 4, 5, 6, 23]);

export interface SmartSlot {
  id: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  platform: Platform;
  localHour: number;
  peakScore: number; // 0–1, higher = better engagement window
}

/**
 * Convert a local hour for a given timezone into a UTC-equivalent Date on a base day.
 * Returns null if conversion fails (unsupported timezone etc).
 */
function localHourToUTC(dateStr: string, localHour: number, timezone: string): Date | null {
  try {
    const isoStr = `${dateStr}T${String(localHour).padStart(2, '0')}:00:00`;
    // Use Intl.DateTimeFormat to find the timezone offset
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    // Create a UTC date and find what local time that corresponds to
    const localDate = new Date(isoStr);
    const parts = dtf.formatToParts(localDate);
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0');
    const tzHour = get('hour') === 24 ? 0 : get('hour');
    const diffMs = (localHour - tzHour) * 3600_000;
    return new Date(localDate.getTime() + diffMs);
  } catch {
    return null;
  }
}

/**
 * Generate smart schedule slots for the next `days` days for the given platforms.
 * Respects model timezone and peak engagement windows.
 * Falls back to generic business hours (9am, 1pm, 7pm) if no peaks defined.
 */
export function generateSmartSlots(
  platforms: Platform[],
  timezone = 'America/New_York',
  days = 14,
): SmartSlot[] {
  const today = startOfDay(new Date());
  const slots: SmartSlot[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    for (const platform of platforms) {
      const peakHours = PLATFORM_PEAK_HOURS[platform] ?? [9, 13, 19];

      for (const localHour of peakHours) {
        if (BLACKOUT_HOURS.has(localHour)) continue;

        const timeStr = `${String(localHour).padStart(2, '0')}:00`;

        // Score: highest scored hours get priority
        const distFromPrime = Math.min(
          Math.abs(localHour - 9),
          Math.abs(localHour - 12),
          Math.abs(localHour - 19),
        );
        const peakScore = Math.max(0, 1 - distFromPrime / 6);

        slots.push({
          id: `smart-${dateStr}-${platform}-${localHour}`,
          date: dateStr,
          time: timeStr,
          platform,
          localHour,
          peakScore,
        });
      }
    }
  }

  return slots;
}

/**
 * Get the local hour currently in a given timezone.
 */
export function getCurrentLocalHour(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0');
    return h === 24 ? 0 : h;
  } catch {
    return new Date().getHours();
  }
}

/** Human-readable timezone label, e.g. "GMT+1 (Europe/London)" */
export function formatTimezone(timezone: string): string {
  try {
    const now = new Date();
    const offset = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? '';
    return `${offset} · ${timezone.replace('_', ' ')}`;
  } catch {
    return timezone;
  }
}
