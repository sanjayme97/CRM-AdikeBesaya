/**
 * Date Formatting Utilities
 *
 * This module provides functions for formatting dates consistently across the application.
 * Uses date-fns library for date manipulation.
 *
 * Date Storage Format:
 * - All dates stored in Google Sheets as ISO 8601 strings (e.g., "2025-01-17T14:30:00.000Z")
 * - Display format varies by context (forms vs lists vs dashboard)
 */

import { format, formatDistance, formatRelative, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';

/**
 * Formats a date for display in lists and tables
 * Format: "17 Jan 2025"
 *
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date string, or empty string if invalid
 *
 * @example
 * formatDateForDisplay("2025-01-17T14:30:00.000Z");
 * // Returns: "17 Jan 2025"
 */
export function formatDateForDisplay(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return format(dateObj, 'dd MMM yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formats a date with time for detailed views
 * Format: "17 Jan 2025, 2:30 PM"
 *
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted datetime string, or empty string if invalid
 *
 * @example
 * formatDateTimeForDisplay("2025-01-17T14:30:00.000Z");
 * // Returns: "17 Jan 2025, 2:30 PM"
 */
export function formatDateTimeForDisplay(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return format(dateObj, 'dd MMM yyyy, h:mm a');
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
}

/**
 * Formats a date for form inputs (HTML date input expects "YYYY-MM-DD")
 * Format: "2025-01-17"
 *
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date string for HTML input, or empty string if invalid
 *
 * @example
 * formatDateForInput("2025-01-17T14:30:00.000Z");
 * // Returns: "2025-01-17"
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Converts a date to ISO string for storing in Google Sheets
 * Format: "2025-01-17T14:30:00.000Z"
 *
 * @param date - Date object or string
 * @returns ISO 8601 date string
 *
 * @example
 * toISOString(new Date());
 * // Returns: "2025-01-17T14:30:00.000Z"
 */
export function toISOString(date: string | Date): string {
  if (typeof date === 'string') {
    // If already ISO string, validate and return
    const parsed = parseISO(date);
    if (isValid(parsed)) {
      return parsed.toISOString();
    }
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
}

/**
 * Gets current date/time as ISO string
 * Useful for createdDate, lastUpdated, etc.
 *
 * @returns Current date/time as ISO string
 *
 * @example
 * const createdDate = getCurrentISOString();
 * // Returns: "2025-01-17T14:30:00.000Z"
 */
export function getCurrentISOString(): string {
  return new Date().toISOString();
}

/**
 * Formats a date relative to now (e.g., "2 days ago", "in 3 hours")
 * Useful for "last updated" or "created" timestamps
 *
 * @param date - Date string (ISO format) or Date object
 * @returns Relative time string, or empty string if invalid
 *
 * @example
 * formatRelativeTime("2025-01-15T14:30:00.000Z");
 * // Returns: "2 days ago" (if today is Jan 17)
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return formatDistance(dateObj, new Date(), { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
}

/**
 * Formats a date in relative format with context (e.g., "yesterday at 2:30 PM", "tomorrow at 10:00 AM")
 *
 * @param date - Date string (ISO format) or Date object
 * @returns Contextual relative date string, or empty string if invalid
 *
 * @example
 * formatRelativeWithContext("2025-01-16T14:30:00.000Z");
 * // Returns: "yesterday at 2:30 PM" (if today is Jan 17)
 */
export function formatRelativeWithContext(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return formatRelative(dateObj, new Date());
  } catch (error) {
    console.error('Error formatting relative date with context:', error);
    return '';
  }
}

/**
 * Validates if a date string is a valid ISO date
 *
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidISODate("2025-01-17T14:30:00.000Z");
 * // Returns: true
 */
export function isValidISODate(dateString: string): boolean {
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed);
  } catch {
    return false;
  }
}

/**
 * Gets start of day (00:00:00) for a given date
 * Useful for date range filters
 *
 * @param date - Date string or Date object
 * @returns Date object at start of day
 *
 * @example
 * getStartOfDay("2025-01-17");
 * // Returns: Date object for 2025-01-17T00:00:00
 */
export function getStartOfDay(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(dateObj);
}

/**
 * Gets end of day (23:59:59.999) for a given date
 * Useful for date range filters
 *
 * @param date - Date string or Date object
 * @returns Date object at end of day
 *
 * @example
 * getEndOfDay("2025-01-17");
 * // Returns: Date object for 2025-01-17T23:59:59.999
 */
export function getEndOfDay(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return endOfDay(dateObj);
}

/**
 * Formats a date for the Indian locale
 * Format: "17/01/2025"
 *
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date string in Indian format (DD/MM/YYYY)
 *
 * @example
 * formatDateIndian("2025-01-17T14:30:00.000Z");
 * // Returns: "17/01/2025"
 */
export function formatDateIndian(date: string | Date | null | undefined): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';

    return format(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting Indian date:', error);
    return '';
  }
}

/**
 * Parses a date from HTML input format (YYYY-MM-DD) to ISO string
 *
 * @param inputDate - Date string from HTML input (YYYY-MM-DD)
 * @returns ISO 8601 date string
 *
 * @example
 * parseDateFromInput("2025-01-17");
 * // Returns: "2025-01-17T00:00:00.000Z"
 */
export function parseDateFromInput(inputDate: string): string {
  const date = new Date(inputDate);
  return date.toISOString();
}
