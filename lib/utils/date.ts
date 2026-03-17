import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarViewType } from '@/components/CalendarView';

// ─── Date Navigation ───────────────────────────────────────────────────────────

export function navigateDate(currentDate: Date, direction: 'prev' | 'next', view: CalendarViewType): Date {
  const navigationMap = {
    prev: {
      day: subDays,
      week: subWeeks,
      month: subMonths,
    },
    next: {
      day: addDays,
      week: addWeeks,
      month: addMonths,
    },
  } as const;

  const navigateFn = navigationMap[direction][view];
  return navigateFn(currentDate, 1);
}

// ─── Date Formatting ───────────────────────────────────────────────────────────

export function formatViewTitle(currentDate: Date, view: CalendarViewType): string {
  if (view === 'day') {
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  }

  if (view === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
  }

  return format(currentDate, 'MMMM yyyy');
}

// ─── Date Comparisons ───────────────────────────────────────────────────────────

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

// ─── Week Utilities ─────────────────────────────────────────────────────────────

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

// ─── Month Utilities ───────────────────────────────────────────────────────────

export function getMonthStart(date: Date): Date {
  return startOfMonth(date);
}

export function getMonthEnd(date: Date): Date {
  return endOfMonth(date);
}

// ─── Time Formatting ───────────────────────────────────────────────────────────

export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateShort(date: Date): string {
  return format(date, 'MMM d');
}

export function formatDateTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm');
}

// ─── Display Formatting ─────────────────────────────────────────────────────────

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function getWeekdayName(date: Date): string {
  return WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
}
