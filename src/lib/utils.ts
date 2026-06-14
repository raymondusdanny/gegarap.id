import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Builds a wa.me deep link from a phone number and message. Normalises common
 * Indonesian formats (leading 0 → 62, strips spaces/symbols) and URL-encodes
 * the message.
 */
export function buildWALink(phone: string, message = ''): string {
  const cleaned = phone.replace(/\D/g, '').replace(/^0/, '62');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${cleaned}${text}`;
}
