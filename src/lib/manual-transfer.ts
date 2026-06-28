/**
 * Manual bank-transfer fallback (PROMPT MASTER — fallback system).
 *
 * When the payment gateway is unavailable (after retries) we must not dead-end
 * the customer: the booking is still saved and we hand them bank-transfer
 * instructions instead of a Snap popup. Ops reconciles the incoming transfer
 * manually and flips the Payment to PAID (admin force-action).
 *
 * Bank details come from env — NEVER hardcode an account number. If the bank env
 * is not configured, `isManualTransferConfigured` is false and callers should
 * surface the gateway error rather than offering a transfer to nowhere.
 *
 * A per-order "unique code" (1–999, added on top of the amount) lets ops match
 * an incoming transfer to a specific order even when two customers owe the same
 * base amount — a common Indonesian VA-less reconciliation trick.
 */

export interface ManualTransferInstruction {
  method: 'MANUAL_TRANSFER';
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  /** Base order amount in Rupiah (the DP). */
  baseAmount: number;
  /** Small disambiguation code added to the amount (0–999). */
  uniqueCode: number;
  /** Exact amount the customer must transfer: baseAmount + uniqueCode. */
  transferAmount: number;
  /** External reference (order id) to put in the transfer note. */
  reference: string;
  /** ISO deadline after which the booking auto-expires. */
  expiresAt: string;
  /** Ready-to-display, human-readable steps (Bahasa Indonesia). */
  instructions: string[];
}

/** Whether a destination bank account is configured for the fallback. */
export function isManualTransferConfigured(): boolean {
  return Boolean(
    process.env.MANUAL_TRANSFER_BANK?.trim() &&
      process.env.MANUAL_TRANSFER_ACCOUNT?.trim() &&
      process.env.MANUAL_TRANSFER_HOLDER?.trim()
  );
}

/** Hours a manual-transfer instruction stays valid before the booking expires. */
export const MANUAL_TRANSFER_EXPIRY_HOURS = 24;

/**
 * Deterministically derive a 1–999 unique code from the order reference, so the
 * same order always yields the same expected transfer amount (idempotent across
 * retries / page reloads).
 */
export function uniqueCodeFor(reference: string): number {
  let hash = 0;
  for (let i = 0; i < reference.length; i++) {
    hash = (hash * 31 + reference.charCodeAt(i)) >>> 0;
  }
  return (hash % 999) + 1; // 1..999, never 0 (so the amount always shifts)
}

export interface ManualTransferParams {
  amount: number;
  reference: string;
  /** Override clock for deterministic tests. */
  now?: Date;
}

/** Build the bank-transfer instruction payload. Throws if no bank configured. */
export function buildManualTransferInstruction(params: ManualTransferParams): ManualTransferInstruction {
  const bankName = process.env.MANUAL_TRANSFER_BANK?.trim();
  const accountNumber = process.env.MANUAL_TRANSFER_ACCOUNT?.trim();
  const accountHolder = process.env.MANUAL_TRANSFER_HOLDER?.trim();
  if (!bankName || !accountNumber || !accountHolder) {
    throw new Error('Manual transfer belum dikonfigurasi (MANUAL_TRANSFER_* kosong).');
  }

  const uniqueCode = uniqueCodeFor(params.reference);
  const transferAmount = params.amount + uniqueCode;
  const now = params.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + MANUAL_TRANSFER_EXPIRY_HOURS * 3_600_000
  ).toISOString();

  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return {
    method: 'MANUAL_TRANSFER',
    bankName,
    accountNumber,
    accountHolder,
    baseAmount: params.amount,
    uniqueCode,
    transferAmount,
    reference: params.reference,
    expiresAt,
    instructions: [
      `Transfer TEPAT ${rp(transferAmount)} ke rekening ${bankName} ${accountNumber} a.n. ${accountHolder}.`,
      `Nominal harus persis (termasuk kode unik ${uniqueCode}) agar pembayaran otomatis terverifikasi.`,
      `Cantumkan kode "${params.reference}" pada berita/catatan transfer.`,
      `Selesaikan dalam ${MANUAL_TRANSFER_EXPIRY_HOURS} jam, sebelum ${new Date(expiresAt).toLocaleString('id-ID')}.`,
      `Pembayaran dikonfirmasi maksimal 1×24 jam setelah dana kami terima.`,
    ],
  };
}
