/**
 * WhatsApp messaging via the Fonnte API (https://fonnte.com) plus the phone
 * normalisation helpers shared by the OTP flow.
 *
 * Lives separately from `otp.ts` (which imports from here) so there's no import
 * cycle: otp → whatsapp, never the reverse.
 */

/** Normalise an Indonesian phone number to the `628xxxxxxxxxx` form. */
export function normalizePhone(raw: string): string {
  let num = raw.replace(/\D/g, '');
  if (num.startsWith('0')) num = '62' + num.slice(1);
  if (!num.startsWith('62')) num = '62' + num;
  return num;
}

/** True for a plausible Indonesian mobile number in normalised form. */
export function isValidIndonesianPhone(phone: string): boolean {
  return /^628[1-9][0-9]{7,11}$/.test(phone);
}

/**
 * Send a free-form WhatsApp message. Returns whether Fonnte accepted it.
 *
 * In non-production, if `FONNTE_TOKEN` is unset we log the message and report
 * success so the OTP flow is testable locally without a Fonnte account.
 */
export async function sendWAMessage(phone: string, message: string): Promise<boolean> {
  const target = normalizePhone(phone);
  const token = process.env.FONNTE_TOKEN;

  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[wa:dev] FONNTE_TOKEN belum diset — pesan ke ${target}:\n${message}`);
      return true;
    }
    console.error('[wa] FONNTE_TOKEN tidak tersedia di environment produksi.');
    return false;
  }

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, message }),
    });
    const data = (await res.json().catch(() => null)) as { status?: boolean } | null;
    return data?.status === true;
  } catch (err) {
    console.error('[wa] Gagal mengirim pesan via Fonnte:', err);
    return false;
  }
}
