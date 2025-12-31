// Calendar configuration and types

// Calendar colors for visual distinction
export const CALENDAR_COLORS = {
  blue: {
    name: 'Blue',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    hex: '#3b82f6',
  },
  purple: {
    name: 'Purple',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    hex: '#a855f7',
  },
  green: {
    name: 'Green',
    bg: 'bg-green-500/10',
    border: 'border-green-500',
    text: 'text-green-700 dark:text-green-300',
    hex: '#22c55e',
  },
  red: {
    name: 'Red',
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    text: 'text-red-700 dark:text-red-300',
    hex: '#ef4444',
  },
  orange: {
    name: 'Orange',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
    hex: '#f97316',
  },
  pink: {
    name: 'Pink',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500',
    text: 'text-pink-700 dark:text-pink-300',
    hex: '#ec4899',
  },
  cyan: {
    name: 'Cyan',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
    hex: '#06b6d4',
  },
  amber: {
    name: 'Amber',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    hex: '#f59e0b',
  },
} as const

export type CalendarColor = keyof typeof CALENDAR_COLORS

// Calendar source configuration (from backend)
export interface CalendarSource {
  id: string
  name: string
  color: CalendarColor
}

// Processed event for UI rendering
export interface ProcessedEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  isAllDay: boolean
  location?: string
  url?: string
  calendarId: string
  calendarName: string
  calendarColor: CalendarColor
}
