/**
 * Input validation utilities used across controllers and services.
 */

import { PaginationOptions } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

/**
 * Validate an email address format.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Validate a password meets complexity requirements.
 * Returns validation result with specific error messages.
 */
export function validatePassword(
  password: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must be at most ${MAX_PASSWORD_LENGTH} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate and normalize pagination options.
 * Clamps values to safe ranges and provides defaults.
 */
export function validatePagination(options: Partial<PaginationOptions>): PaginationOptions {
  const page = Math.max(1, Math.floor(options.page || 1));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(options.limit || DEFAULT_PAGE_SIZE)));

  const allowedSortOrders: Array<'asc' | 'desc'> = ['asc', 'desc'];
  const sortOrder = allowedSortOrders.includes(options.sortOrder as 'asc' | 'desc')
    ? (options.sortOrder as 'asc' | 'desc')
    : 'desc';

  const sortBy =
    options.sortBy && typeof options.sortBy === 'string' && /^[a-zA-Z_]+$/.test(options.sortBy)
      ? options.sortBy
      : 'createdAt';

  return { page, limit, sortBy, sortOrder };
}

/**
 * Validate a UUID v4 format string.
 */
export function validateUUID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Sanitize a string input by trimming and removing potentially harmful characters.
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
}
