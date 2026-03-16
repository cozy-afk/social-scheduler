'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval } from 'date-fns';

type CalendarViewType = 'day' | 'week' | 'month';

interface CalendarViewSwitcherProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function CalendarViewSwitcher({
  currentView,
  onViewChange,
  currentDate,
  onDateChange,
}: CalendarViewSwitcherProps) {
  const navigatePrevious = () => {
    if (currentView === 'day') {
      onDateChange(addDays(currentDate, -1));
    } else if (currentView === 'week') {
      onDateChange(addWeeks(currentDate, -1));
    } else {
      onDateChange(addMonths(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (currentView === 'day') {
      onDateChange(addDays(currentDate, 1));
    } else if (currentView === 'week') {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const getDateLabel = () => {
    if (currentView === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Date Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={navigatePrevious}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900 min-w-[280px]">
            {getDateLabel()}
          </h2>
        </div>

        <button
          onClick={navigateNext}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={() => onDateChange(new Date())}
          className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* View Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onViewChange('day')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentView === 'day'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => onViewChange('week')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentView === 'week'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => onViewChange('month')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentView === 'month'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Month
        </button>
      </div>
    </div>
  );
}

/**
 * Get days to display based on current view and date
 */
export function getDaysForView(currentDate: Date, view: CalendarViewType): Date[] {
  if (view === 'day') {
    return [currentDate];
  } else if (view === 'week') {
    return eachDayOfInterval({
      start: startOfWeek(currentDate),
      end: endOfWeek(currentDate),
    });
  } else {
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }
}
