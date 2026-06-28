# Payment Resilience — Risk Scoring, Retry, Idempotency & Fallback

Dokumen ini menjelaskan lapisan ketahanan (resilience) yang ditambahkan di atas
sistem pembayaran Midtrans yang sudah ada (lihat `docs/payment-status-mapping.md`
untuk state machine, webhook, escrow, refund, disbursement, dan notifikasi).

> Ringkas: sistem inti (Snap, webhook bertanda-tangan + idempotency ledger, state
> machine 11-status, fraud velocity/device, refund/payout) **sudah** production-grade.
> Lapisan ini menambah: **perbaikan "No payment channels"**, **risk scoring engine
> (ML-ready)**, **retry**, **idempotency key**, dan **fallback transfer manual**.

---

## 1. Struktur Folder (yang relevan)

```
src/
├─ lib/
│  ├─ midtrans.ts          # Snap/Core + enabled_payments + retry + typed errors  [diubah]
│  ├─ retry.ts             # withRetry() exponential backoff + jitter             [baru]
│  ├─ manual-transfer.ts   # instruksi transfer bank (fallback gateway down)      [baru]
│  ├─ risk-scoring.ts      # risk engine + feature logging (dataset ML)           [baru]
│  ├─ fraud.ts             # velocity + device fingerprint (sudah ada)
│  ├─ payment-state.ts     # state machine + PaymentEvent audit (sudah ada)
│  ├─ logger.ts            # structured JSON logs + Sentry + ops paging (sudah ada)
│  ├─ repositories/
│  │  ├─ payment.ts        # akses DB Payment terisolasi (Clean Arch)            [baru]
│  │  └─ webhook-event.ts  # akses DB ledger idempotency webhook                 [baru]
│  └─ services/
│     ├─ booking.ts        # orkestrasi: idempotency→risk→snap/fallback→persist   [diubah]
│     └─ midtrans-webhook.ts # logika verifikasi/idempotency/state transition     [baru]
├─ app/
│  ├─ api/
│  │  ├─ bookings/route.ts          # POST create (teruskan Idempotency-Key)       [diubah]
│  │  ├─ bookings/[id]/pay/route.ts # re-issue Snap dari dashboard (sudah ada)
│  │  └─ webhooks/midtrans/route.ts # thin controller → midtrans-webhook service  [diubah]
│  └─ (customer)/book/[id]/BookingForm.tsx  # kirim Idempotency-Key + UI fallback  [diubah]
└─ __tests__/
   ├─ retry.test.ts
   ├─ risk-scoring.test.ts
   └─ manual-transfer.test.ts
```

---

## 2. Fix: "No payment channels available"

**Akar masalah (paling sering):** Snap hanya menampilkan channel yang **AKTIF di
akun merchant** Anda (Dashboard Midtrans → Settings → Snap Preferences / Payment
Methods) **dan** cocok dengan request. Dua kesalahan di sisi kode yang juga
memicunya:

1. Mengirim `enabled_payments: []` — array kosong **menyembunyikan semua channel**.
2. Mengirim nama channel yang belum diaktifkan akun.

**Solusi di kode (`src/lib/midtrans.ts`):**

- **Default = auto-detect.** Field `enabled_payments` **tidak dikirim** sama sekali
  kecuali sengaja dikonfigurasi → Snap menampilkan semua channel aktif.
- Override opsional via `MIDTRANS_ENABLED_PAYMENTS`:
  - kosong / `all` → omit (auto-detect)
  - `default` → daftar kurasi `DEFAULT_ENABLED_PAYMENTS`
    (`gopay, shopeepay, other_qris, bca_va, bni_va, bri_va, permata_va, indomaret, alfamart`)
  - `a,b,c` → daftar eksplisit
  - **tidak pernah** menghasilkan array kosong (input kosong → otomatis omit).
- `item_details` **wajib** berjumlah persis = `gross_amount`, kalau tidak Midtrans
  menolak request (400). Di sini item tunggal `price = amount, quantity = 1`.
- `credit_card: { secure: true }` (3DS) diaktifkan untuk akseptasi kartu produksi.
- `order_id` dijaga ≤ 50 char (`GGR-{uuid}-{base36 ms}` ≈ 49).

**Checklist verifikasi cepat saat channel kosong:**

1. Mode benar? `MIDTRANS_IS_PRODUCTION` cocok dengan jenis key (`SB-Mid-*` = sandbox,
   `Mid-*` = production).
2. Channel diaktifkan di Dashboard Midtrans (sandbox & production terpisah).
3. `MIDTRANS_ENABLED_PAYMENTS` tidak memaksa channel yang belum aktif.
4. `gross_amount` memenuhi minimum channel (mis. beberapa VA punya minimum).

---

## 3. Retry (`src/lib/retry.ts`)

`withRetry(fn, opts)` — exponential backoff + **full jitter** (mencegah thundering
herd). Hanya error **transient** yang diulang; error **permanen** langsung dilempar.

- Klasifikasi error Midtrans (`isTransientMidtransError`):
  - tanpa `httpStatusCode` (network/DNS/timeout) → transient
  - `429` (rate limit) → transient
  - `>= 500` → transient
  - `4xx` lain (payload/keys salah) → **permanen** (tidak diulang)
- Dipakai di `createSnapToken`, `getTransactionStatus`, dan `refundViaGateway`.
- Refund memakai `refund_key` stabil → call ke gateway **idempoten**, retry tidak
  pernah double-refund.

Error yang sudah dipetakan tipe:
- `MidtransUnavailableError` (transient, habis retry) → caller boleh **fallback**.
- `MidtransRequestError` (permanen 4xx) → **tidak** fallback (itu bug kita).

---

## 4. Idempotency Key

Mencegah **double booking / double charge** saat request POST diulang (klik ganda,
retry jaringan, retry browser).

- Klien mengirim header `Idempotency-Key` (UUID per submit) — lihat `BookingForm.tsx`.
- `createBooking` (service):
  1. Sebelum kerja apa pun, cari `Payment.idempotencyKey` (unik) milik customer ini.
     Jika ada → kembalikan hasil booking yang sama (tanpa Snap/Job baru).
  2. Saat create, jika terjadi **race**, unique-constraint `idempotencyKey` memicu
     Prisma `P2002` → ambil pemenang dan kembalikan hasilnya.
- `Payment.idempotencyKey` sudah `@unique` di schema (tanpa migrasi baru).

---

## 5. Risk Scoring Engine (`src/lib/risk-scoring.ts`)

Memberi skor risiko **0–100** untuk tiap booking dari tiga keluarga sinyal:

| Keluarga         | Sinyal                                                            |
|------------------|------------------------------------------------------------------|
| Amount anomaly   | DP vs rata-rata/rasio historis customer; nominal besar tanpa riwayat |
| Frequency        | jumlah booking 1 jam & 24 jam terakhir                           |
| User history     | umur akun, pembayaran gagal/refund, flag fraud sebelumnya        |

- **Band:** `LOW < 40 ≤ MEDIUM < 70 ≤ HIGH`.
- **Advisory by default** (sesuai filosofi platform "flag, admin yang putuskan"):
  HIGH → tulis `FraudFlag` (dedup 1/jam), **tidak** auto-block.
- **Hard-block opsional:** `RISK_BLOCK_THRESHOLD` (default tak pernah block). Jika
  skor ≥ threshold, `createBooking` melempar `ForbiddenError` (403).
- **Fault tolerant:** error DB apa pun → assessment netral `LOW` (tidak pernah
  memblok booking sah).

### ML-ready: feature logging

Tiap assessment menulis satu baris log `risk.scored` berisi **feature vector numerik
datar** + `score` + `band` + `modelVersion` + `outcome: null`.

- Baris log ini = **dataset training**. Kirim ke warehouse, gabung dengan label
  hasil akhir transaksi (settled-good vs refund-abuse/chargeback) → data supervised
  tanpa instrumentasi tambahan.
- `RISK_MODEL_VERSION` mem-bucket baris saat model ML menggantikan heuristik.
- Fungsi murni `scoreFeatures(features)` dipisah dari I/O → mudah di-unit-test dan
  nanti tinggal diganti pemanggilan model.

---

## 6. Fallback Transfer Manual (`src/lib/manual-transfer.ts`)

Jika gateway **unavailable** setelah retry **dan** rekening tujuan dikonfigurasi
(`MANUAL_TRANSFER_BANK/ACCOUNT/HOLDER`), booking **tetap tersimpan** dan customer
menerima instruksi transfer bank, bukan dead-end.

- **Kode unik** deterministik (1–999) ditambahkan ke nominal → ops bisa mencocokkan
  transfer masuk meski dua customer berutang nominal dasar sama (trik rekonsiliasi
  tanpa VA).
- Payment disimpan `paymentGateway = 'MANUAL_TRANSFER'`, status `PENDING`. Ops
  konfirmasi transfer masuk → admin force-action menaikkan ke `PAID`.
- Jika rekening **tidak** dikonfigurasi, error gateway tetap di-surface (tidak
  menawarkan transfer ke mana-mana).

---

## 7. Arsitektur (diagram)

```
                 ┌──────────────┐
 Browser ──POST──►  /api/bookings │  (Idempotency-Key)
                 └──────┬───────┘
                        ▼
              ┌───────────────────────┐
              │  booking service      │
              │  1. idempotency check │
              │  2. velocity guard    │──► FraudFlag
              │  3. device check      │──► DeviceEvent
              │  4. risk scoring  ────┼──► risk.scored log (dataset ML) + FraudFlag
              │  5. fee snapshot      │
              │  6. Snap token  ──────┼──► Midtrans Snap (withRetry)
              │       └─ gagal? ──────┼──► Manual Transfer instruction
              │  7. persist Job+Pay   │
              └──────────┬────────────┘
                         ▼
            Snap popup / Bank instructions

  Midtrans ──webhook(signed)──► /api/webhooks/midtrans
            ├─ verify sig (timing-safe)   ├─ idempotency ledger (WebhookEvent)
            ├─ amount mismatch alarm       ├─ state machine (PaymentEvent audit)
            └─ PAID → Job CONFIRMED + notif + receipt email
```

---

## 8. Strategi Scaling

- **DB:** index sudah ada untuk query admin/dashboard (`status`, `customerId`,
  `providerProfileId`). Tambah read-replica saat baca laporan berat.
- **Webhook:** sudah idempoten (ledger `WebhookEvent` unik `[gateway,externalId,eventType]`).
  Untuk volume tinggi, terima cepat (200) lalu proses async lewat antrian.
- **Rate limit:** sudah ada Upstash async limiter; jadikan otoritatif lintas instance.
- **Risk scoring:** heuristik in-process murah; saat naik ke model ML, panggil
  endpoint inferensi di balik `scoreFeatures` (kontrak fitur sudah stabil).

### Queue (BullMQ / Redis) — rekomendasi

| Pekerjaan                  | Sekarang                  | Saran (skala)                          |
|----------------------------|---------------------------|----------------------------------------|
| Notifikasi WhatsApp        | OutboxMessage + cron      | BullMQ queue + retry/backoff per pesan |
| Email nota                 | best-effort di webhook    | enqueue job email (lepas dari webhook) |
| Disbursement (Iris)        | cron auto-release         | queue dengan idempotency + DLQ         |
| Webhook processing         | inline                    | enqueue payload, worker proses + ack   |
| Risk feature export        | log line `risk.scored`    | stream ke warehouse (Kafka/Firehose)   |

DLQ (dead-letter queue) untuk job yang gagal berulang → ops review, bukan hilang.

---

## 9. Common Bugs & Fixes

| Gejala                                   | Penyebab                                              | Fix                                                                 |
|------------------------------------------|------------------------------------------------------|--------------------------------------------------------------------|
| "No payment channels available"          | channel belum aktif / `enabled_payments: []` / salah mode | Aktifkan channel di Dashboard; jangan kirim `[]`; cek `MIDTRANS_IS_PRODUCTION` |
| 400 "transaction_details.order_id too long" | order_id > 50 char                                | `GGR-{uuid}-{base36 ms}` (≈49)                                      |
| 400 gross/item mismatch                  | `item_details` tak berjumlah `gross_amount`          | Pastikan total item = gross_amount                                  |
| Double booking saat klik ganda           | tanpa idempotency                                    | Kirim `Idempotency-Key`; service dedup + tangani `P2002`            |
| Pembayaran "sukses" tapi DB tak berubah  | webhook tak verified / signature salah               | Set Notification URL; verifikasi `sha512(order+status+gross+key)`   |
| Refund dobel saat retry                  | refund tanpa key stabil                              | `refund_key` stabil → idempoten                                     |
| Booking gagal total saat gateway down    | tidak ada fallback                                   | Aktifkan `MANUAL_TRANSFER_*` → instruksi transfer manual           |
| Skor risiko memblok user jujur           | threshold terlalu agresif                            | Default flag-only; setel `RISK_BLOCK_THRESHOLD` hati-hati          |

---

## 10. Production Checklist

- [ ] `MIDTRANS_SERVER_KEY` / `CLIENT_KEY` produksi terpasang; `MIDTRANS_IS_PRODUCTION=true`.
- [ ] Channel pembayaran diaktifkan di Dashboard Midtrans (production).
- [ ] `MIDTRANS_ENABLED_PAYMENTS` kosong (auto-detect) kecuali memang perlu kurasi.
- [ ] Notification URL di Dashboard = `https://www.gegarap.id/api/webhooks/midtrans`.
- [ ] Tanda tangan webhook diverifikasi (sudah) + idempotency ledger aktif (sudah).
- [ ] `MANUAL_TRANSFER_*` diisi bila ingin fallback transfer manual aktif.
- [ ] `RISK_BLOCK_THRESHOLD` ditinjau (mulai flag-only, naikkan bertahap).
- [ ] Pipeline ekspor log `risk.scored` ke warehouse untuk dataset ML.
- [ ] `OPS_ALERT_PHONE` + Sentry (`SENTRY_DSN`) aktif untuk alarm finansial.
- [ ] Tidak ada secret hardcode — semua via ENV.
- [ ] `npm run typecheck && npm run lint && npm test && npm run build` hijau.
```
