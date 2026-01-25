/**
 * Validation Utilities
 *
 * This module provides validation functions for form inputs.
 * Used with React Hook Form and Zod for comprehensive form validation.
 */

import { z } from 'zod';

/**
 * Validates Indian phone number format
 * Must be exactly 10 digits, starting with 6-9
 *
 * @param phone - Phone number string
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidPhoneNumber("9876543210"); // true
 * isValidPhoneNumber("1234567890"); // false (starts with 1)
 * isValidPhoneNumber("98765");      // false (not 10 digits)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Indian mobile numbers: 10 digits, starting with 6, 7, 8, or 9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Formats a phone number to remove spaces, dashes, and +91
 * Extracts just the 10-digit number
 *
 * @param phone - Phone number string (may include +91, spaces, dashes)
 * @returns Clean 10-digit phone number, or original if invalid
 *
 * @example
 * cleanPhoneNumber("+91 98765-43210"); // "9876543210"
 * cleanPhoneNumber("98765 43210");     // "9876543210"
 */
export function cleanPhoneNumber(phone: string): string {
  // Remove +91, spaces, dashes
  const cleaned = phone.replace(/[\s\-+]/g, '');

  // If starts with 91 and has 12 digits total, remove the 91 prefix
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Zod schema for phone number validation
 * Use with React Hook Form
 *
 * @example
 * const schema = z.object({
 *   phone: phoneNumberSchema,
 * });
 */
export const phoneNumberSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine(
    (val) => {
      const cleaned = cleanPhoneNumber(val);
      return isValidPhoneNumber(cleaned);
    },
    {
      message: 'Phone number must be 10 digits starting with 6, 7, 8, or 9',
    }
  )
  .transform(cleanPhoneNumber);

/**
 * Validates email format
 *
 * @param email - Email string
 * @returns true if valid email format, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Zod schema for email validation
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Validates that a number is positive
 * Useful for farm size, quote amounts, payment amounts
 *
 * @param value - Number to validate
 * @returns true if positive, false otherwise
 */
export function isPositiveNumber(value: number): boolean {
  return value > 0;
}

/**
 * Zod schema for positive number (e.g., farm size in acres)
 */
export const positiveNumberSchema = z
  .number()
  .positive('Must be a positive number')
  .or(
    z
      .string()
      .min(1, 'Required')
      .transform((val) => parseFloat(val))
      .refine((val) => !isNaN(val) && val > 0, 'Must be a positive number')
  );

/**
 * Zod schema for currency amount (rupees)
 * Must be positive and up to 2 decimal places
 */
export const currencySchema = z
  .number()
  .positive('Amount must be positive')
  .refine(
    (val) => {
      // Check if it has more than 2 decimal places
      const decimalPart = val.toString().split('.')[1];
      return !decimalPart || decimalPart.length <= 2;
    },
    {
      message: 'Amount can have at most 2 decimal places',
    }
  )
  .or(
    z
      .string()
      .min(1, 'Amount is required')
      .transform((val) => parseFloat(val))
      .refine((val) => !isNaN(val) && val > 0, 'Amount must be positive')
  );

/**
 * Validates that a string is not empty (after trimming)
 *
 * @param value - String to validate
 * @returns true if not empty, false otherwise
 */
export function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Zod schema for required text field
 */
export const requiredStringSchema = z
  .string()
  .min(1, 'This field is required')
  .refine((val) => val.trim().length > 0, 'This field cannot be empty');

/**
 * Zod schema for optional text field
 */
export const optionalStringSchema = z.string().optional().or(z.literal(''));

/**
 * Validates date is not in the future
 * Useful for "actual visit date" (can't visit in the future)
 *
 * @param date - Date to validate
 * @returns true if date is today or in the past, false otherwise
 */
export function isNotFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  return date <= today;
}

/**
 * Zod schema for date that cannot be in the future
 */
export const pastOrTodayDateSchema = z
  .string()
  .refine(
    (val) => {
      const date = new Date(val);
      return isNotFutureDate(date);
    },
    {
      message: 'Date cannot be in the future',
    }
  );

/**
 * Validates date is not in the past
 * Useful for "scheduled visit date" or "quote valid until"
 *
 * @param date - Date to validate
 * @returns true if date is today or in the future, false otherwise
 */
export function isNotPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  return date >= today;
}

/**
 * Zod schema for date that cannot be in the past
 */
export const todayOrFutureDateSchema = z
  .string()
  .refine(
    (val) => {
      const date = new Date(val);
      return isNotPastDate(date);
    },
    {
      message: 'Date cannot be in the past',
    }
  );

/**
 * Formats currency for display (Indian format with commas)
 *
 * @param amount - Amount in rupees
 * @returns Formatted string with rupee symbol
 *
 * @example
 * formatCurrency(50000); // "₹50,000"
 * formatCurrency(1234567.89); // "₹12,34,567.89"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parses currency string to number
 * Removes rupee symbol, commas, etc.
 *
 * @param currencyString - Formatted currency string
 * @returns Number value, or NaN if invalid
 *
 * @example
 * parseCurrency("₹50,000"); // 50000
 * parseCurrency("12,34,567.89"); // 1234567.89
 */
export function parseCurrency(currencyString: string): number {
  // Remove rupee symbol, commas, spaces
  const cleaned = currencyString.replace(/[₹,\s]/g, '');
  return parseFloat(cleaned);
}

/**
 * Validates that a value is selected from dropdown
 * (i.e., not empty string or placeholder value)
 *
 * @param value - Selected value
 * @returns true if valid selection, false otherwise
 */
export function isValidSelection(value: string): boolean {
  return value !== '' && value !== 'select' && value !== 'none';
}

/**
 * Zod schema for dropdown selection (required)
 */
export const requiredSelectionSchema = z
  .string()
  .min(1, 'Please select an option')
  .refine(isValidSelection, 'Please select a valid option');

/**
 * Validates WhatsApp number (same as phone number for India)
 *
 * @param whatsapp - WhatsApp number
 * @returns true if valid, false otherwise
 */
export function isValidWhatsAppNumber(whatsapp: string): boolean {
  return isValidPhoneNumber(whatsapp);
}

/**
 * Zod schema for optional WhatsApp number
 */
export const whatsAppNumberSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val || val === '') return true; // Optional
      const cleaned = cleanPhoneNumber(val);
      return isValidWhatsAppNumber(cleaned);
    },
    {
      message: 'WhatsApp number must be 10 digits starting with 6, 7, 8, or 9',
    }
  )
  .transform((val) => (val ? cleanPhoneNumber(val) : ''));
