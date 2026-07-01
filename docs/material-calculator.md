# Smart Construction Material Calculator

Fitur kalkulator kebutuhan material bangunan + estimasi biaya, terintegrasi ke
gegarap.id. Diadaptasi dari repo `kalkulator_material` (Next.js house-RAB
estimator) yang logika hitungnya menempel di dalam komponen React, lalu
di-refactor menjadi arsitektur berlapis yang bersih dan **config-driven**.

> Ringkas: satu mesin hitung murni (pure) dipakai identik di **client** (hasil
> instan saat mengetik) dan **server** (`POST /api/material/calculate`), sehingga
> tidak ada dua sumber kebenaran. Menambah jenis pekerjaan atau material cukup
> menambah data di config — tidak menyentuh engine/UI/API.

---

## 1. Struktur folder (Clean Architecture)

```
src/features/material-calculator/
├─ domain/                     # murni, tanpa React/Next/Prisma
│  ├─ types.ts                 # Formula, InputSpec, MaterialLineSpec, CalculationResult
│  ├─ units.ts                 # normalisasi m/cm/mm → meter, pembulatan, Rupiah
│  └─ engine.ts                # calculate(): satu-satunya tempat aritmetika terjadi
├─ configs/
│  └─ material-formulas.ts     # SUMBER KEBENARAN resep hitung (7 pekerjaan)
├─ infrastructure/
│  └─ materials.ts             # registry material: label, satuan, harga default
├─ application/
│  ├─ dto.ts                   # Zod: validasi request + normalisasi input
│  └─ service.ts              # MaterialCalculatorService: orkestrasi engine+harga
└─ presentation/
   ├─ MaterialCalculator.tsx   # container (state, hitung instan, riwayat)
   ├─ JobSelector.tsx          # pilih jenis pekerjaan
   ├─ DimensionInput.tsx       # render 1 input dari spec (+ toggle satuan)
   ├─ CostEstimator.tsx        # opsional: upah tukang + override harga
   ├─ ResultCard.tsx           # rincian material + breakdown biaya + CTA
   ├─ useCalculatorHistory.ts  # riwayat lokal (localStorage, tanpa DB)
   └─ icons.ts                 # map nama ikon config → komponen Lucide
```

Arah dependensi: `presentation → application → domain`, dengan `configs` &
`infrastructure` sebagai data yang di-inject. Domain tidak meng-import apa pun
dari lapisan atas.

Titik integrasi gegarap:

- `src/app/tools/material-calculator/page.tsx` — route publik `/tools/material-calculator` (SEO + JSON-LD `WebApplication`).
- `src/app/api/material/calculate/route.ts` — endpoint `POST` (rate-limited).
- `src/components/layout/Navbar.tsx` — menu "Kalkulator".
- `src/components/dashboard/ToolsSection.tsx` — kartu tool di dashboard.
- `src/app/(marketing)/page.tsx` — CTA di homepage.
- `src/app/sitemap.ts` — route didaftarkan.

---

## 2. Sistem formula config-driven

Setiap pekerjaan adalah satu objek `Formula` di `configs/material-formulas.ts`:

- `inputs: InputSpec[]` — field deklaratif (length/count/number/select) yang
  otomatis dirender UI dan divalidasi service.
- `metrics(inputs)` — turunan geometri (luas, volume, keliling) sebagai fungsi murni.
- `materials: MaterialLineSpec[]` — tiap baris = `coefficient × basis (+ waste)`,
  dibulatkan, lalu diberi harga dari registry. `coefficient` bisa konstan atau
  fungsi dari input (mis. mutu beton mengubah kebutuhan semen).
- `labor?` — produktivitas (unit/tukang/hari) untuk estimasi upah opsional.

Pekerjaan yang tersedia: dinding bata merah, dinding bata ringan (hebel), lantai
keramik/granit, plesteran & acian, cor beton, pondasi batu kali, pengecatan —
mencakup material semen, pasir, batu (kali & split), keramik, cat, bata, hebel,
besi.

**Menambah pekerjaan baru** = tambah satu objek `Formula`. **Menambah material** =
tambah satu baris di `infrastructure/materials.ts`. Engine, service, API, dan UI
tidak berubah.

---

## 3. Aliran data & validasi

1. Input mentah (form / body HTTP) masuk `application`.
2. `normalizeInputs()` mengubah semua panjang ke **meter** (batas satuan
   dilewati tepat sekali di sini).
3. `buildNormalizedSchema()` (Zod dinamis dari `InputSpec`) memvalidasi nilai
   ternormalisasi terhadap batas min/max. Error → map field (`handle()` → 422).
4. `engine.calculate()` menghitung kuantitas + biaya dari price book (harga
   default + override user).

Client memakai jalur yang sama via `calculateWithForm()` (tanpa throw, aman
dipanggil tiap ketukan) sehingga hasil UI = hasil API.

---

## 4. Keputusan desain

- **Adaptasi, bukan porting mentah.** Logika `useMemo` 300-baris di
  `StepSummary.tsx`/`SimpleCalculator.tsx` dipecah: geometri → `metrics`,
  koefisien → data config, aritmetika → engine murni.
- **Koefisien indikatif** mengikuti praktik umum (analisa SNI) dan grounded pada
  dataset asli. Bukan pengganti RAB surveyor — disebutkan eksplisit di UI.
- **Riwayat di localStorage**, bukan DB: tanpa auth, tanpa migrasi, privat ke
  perangkat pengguna. Sesuai sifat tool publik.
- **Uang selalu integer Rupiah** (`toRupiah`), konsisten dengan `lib/utils`.
- **Konversi kembali ke marketplace**: hasil selalu menawarkan CTA "Cari Tukang".

---

## 5. Pengujian

`src/__tests__/material-calculator.test.ts` (18 test): normalisasi satuan,
integritas config (tiap material punya harga), kuantitas material + pembulatan,
paritas cm↔m, upah tukang, koefisien berbasis select (mutu beton, lapis cat),
edge case (bukaan > bidang → 0), override harga, validasi (job tak dikenal →
`NotFoundError`, dimensi di luar batas → `ZodError`), dan paritas client↔server.
