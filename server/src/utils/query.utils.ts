/**
 * Query Parameter Utilities
 * Helper functions for handling Express query parameters
 */

import { ParsedQs } from 'qs';

/**
 * Extract string from query parameter
 * Returns undefined if array or missing
 */
export function getString(value: string | string[] | ParsedQs | ParsedQs[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

/**
 * Extract number from query parameter
 */
export function getNumber(value: string | string[] | ParsedQs | ParsedQs[] | undefined): number | undefined {
  const str = getString(value);
  if (str === undefined) return undefined;
  const num = parseInt(str, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Extract boolean from query parameter
 */
export function getBoolean(value: string | string[] | ParsedQs | ParsedQs[] | undefined): boolean | undefined {
  const str = getString(value);
  if (str === undefined) return undefined;
  if (str === 'true' || str === '1') return true;
  if (str === 'false' || str === '0') return false;
  return undefined;
}

/**
 * Extract date string from query parameter (validates format)
 */
export function getDateString(value: string | string[] | ParsedQs | ParsedQs[] | undefined): string | undefined {
  const str = getString(value);
  if (str === undefined) return undefined;

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(str)) return undefined;

  const date = new Date(str);
  if (isNaN(date.getTime())) return undefined;

  return str;
}
