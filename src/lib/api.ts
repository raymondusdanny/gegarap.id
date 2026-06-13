import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fieldErrors } from './validations';

/** Consistent success envelope. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/** Consistent error envelope. */
export function fail(message: string, status = 400, errors?: Record<string, string>) {
  return NextResponse.json({ ok: false, message, errors }, { status });
}

/**
 * Wraps a route handler with shared error handling so individual routes stay clean.
 * Validation errors become 422 with a field-error map; everything else is a 500.
 */
export function handle(fn: () => Promise<NextResponse>) {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return fail('Data yang dikirim tidak valid.', 422, fieldErrors(err));
      }
      console.error('[api] Unhandled error:', err);
      return fail('Terjadi kesalahan pada server. Silakan coba lagi.', 500);
    }
  };
}
