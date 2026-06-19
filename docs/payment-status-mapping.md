# Payment Status → Label Mapping (untuk tim Frontend)

> Sumber kebenaran ada di kode: [`src/lib/payment-state.ts`](../src/lib/payment-state.ts)
> (`STATUS_LABELS`, `customerStatusLabel()`, `providerStatusLabel()`). Dokumen ini
> hanya ringkasan. **Jangan pernah menampilkan status mentah** (`PENDING`, `HELD`, …)
> ke end-user.

## Lifecycle

```
DRAFT → PENDING → PAID → HELD → RELEASED
                   │       ├→ REFUND_REQUESTED → REFUNDED | REFUND_REJECTED
                   │       └→ DISPUTED → RELEASED | REFUNDED
                   ├→ EXPIRED   (PENDING > 60 menit tanpa bayar)
                   └→ FAILED    (gateway menolak)
```

Transisi **hanya** dipicu backend (webhook gateway / aksi user yang divalidasi
ulang). Setiap transisi tercatat di `PaymentEvent` (audit immutable).

## Tabel label

| Status internal    | Label Customer                                   | Label Provider                                   | Tone    |
| ------------------ | ------------------------------------------------ | ------------------------------------------------ | ------- |
| `DRAFT`            | Menyiapkan Pembayaran                            | —                                                | info    |
| `PENDING`          | Menunggu Pembayaran                              | — (belum muncul ke provider)                     | warning |
| `PAID`             | Pembayaran Diterima, Mencari Provider            | Job Baru — Pembayaran Customer Sudah Aman        | success |
| `HELD`             | Dana Ditahan Aman — Provider Sedang Mengerjakan  | Sedang Dikerjakan — Dana Akan Cair Setelah Selesai | info  |
| `RELEASED`         | Selesai — Terima kasih!                          | Dana Telah Dicairkan ke Rekening Anda            | success |
| `REFUND_REQUESTED` | Refund Sedang Diproses                           | Pembatalan Sedang Ditinjau                       | warning |
| `REFUNDED`         | Dana Telah Dikembalikan                          | Pembatalan Disetujui — Dana Dikembalikan ke Customer | info |
| `REFUND_REJECTED`  | Pengajuan Refund Ditolak                         | Pembatalan Ditolak — Pekerjaan Dilanjutkan       | info    |
| `DISPUTED`         | Sedang Ditinjau Tim Kami (estimasi 48 jam)       | Ada Komplain — Tim Kami Akan Hubungi Anda        | warning |
| `EXPIRED`          | Pembayaran Kedaluwarsa                           | —                                                | danger  |
| `FAILED`           | Pembayaran Gagal                                 | —                                                | danger  |

`—` artinya status itu tidak disurfacing ke pihak tersebut.

## Cara pakai

```ts
import { customerStatusLabel, providerStatusLabel, STATUS_LABELS } from '@/lib/payment-state';

customerStatusLabel(payment.status); // string aman untuk customer
providerStatusLabel(payment.status); // string aman untuk provider
STATUS_LABELS[payment.status].tone;  // 'info' | 'success' | 'warning' | 'danger' → warna badge
```

Setiap perubahan status WAJIB memicu notifikasi (push/WA), bukan hanya update
diam-diam di DB (Bagian 9).

## Notifikasi otomatis (Bagian 9)

Copy & dispatch terpusat di [`src/lib/notifications.ts`](../src/lib/notifications.ts)
(`notifyPaymentStatus(paymentId, status, extra?)`). Call site transisi cukup
memanggilnya — kata-katanya hidup di satu tempat. Pihak yang diberi tahu per
status: `PAID`/`HELD`/`RELEASED`/`REFUNDED` → customer + provider; `DISPUTED`/
`REFUND_REJECTED` → customer + provider; `EXPIRED`/`FAILED` → customer saja.
Pengiriman best-effort (tidak pernah memutus transaksi).

| Transisi | Dipicu di |
| --- | --- |
| → PAID / FAILED | webhook Midtrans |
| → HELD | `POST /api/bookings/:id/start` |
| → RELEASED | `releaseAndSettle()` (complete / auto-release 72h / admin) |
| → REFUNDED / DISPUTED | refund route + admin resolve/force |
| → EXPIRED | cron auto-cancel |

## Pergerakan dana nyata (Bagian 6/7)

- **Refund ke customer:** `refundViaGateway()` di [`lib/midtrans.ts`](../src/lib/midtrans.ts).
  Tanpa kredensial = no-op sukses (dev). Jika gateway gagal padahal DB sudah
  `REFUNDED` → alarm `GATEWAY_REFUND_FAILED` + page ops (mismatch, perlu manual).
- **Payout ke provider:** `IDisbursementProvider` di [`lib/disbursement.ts`](../src/lib/disbursement.ts).
  Default `MockDisbursementProvider`; set `DISBURSEMENT_PROVIDER=gateway` +
  `MIDTRANS_IRIS_API_KEY` untuk Iris nyata (fail-closed tanpa key).

## Fraud & observability

- **Fraud** ([`lib/fraud.ts`](../src/lib/fraud.ts)): velocity (maks 3 booking
  `PENDING` bersamaan → blokir booking baru + `FraudFlag VELOCITY`) dan device
  fingerprint (>5 akun/device/24 jam → `FraudFlag DEVICE_MISMATCH`). Flag TIDAK
  pernah auto-blokir akun — admin yang memutuskan.
- **Observability** ([`lib/logger.ts`](../src/lib/logger.ts) + [`lib/sentry.ts`](../src/lib/sentry.ts)):
  `warn`/`error` & alarm diteruskan ke Sentry (tag `paymentId`/`bookingId`) bila
  `SENTRY_DSN` + `@sentry/nextjs` tersedia. Alarm wajib (mismatch nominal, spike
  signature gagal >5/10mnt, disbursement gagal berulang, refund gateway gagal)
  juga di-page ke `OPS_ALERT_PHONE` via `notifyOps()`.
