import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator, ChevronRight, Sparkles } from 'lucide-react';
import { pageMetadata, BASE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { MaterialCalculator } from '@/features/material-calculator/presentation/MaterialCalculator';

export const metadata: Metadata = pageMetadata({
  title: 'Kalkulator Material Konstruksi',
  description:
    'Hitung kebutuhan material bangunan — semen, pasir, batu, keramik, cat — beserta estimasi biaya secara instan. Gratis dari gegarap.id.',
  path: '/tools/material-calculator',
});

/** SoftwareApplication structured data for the tool (rich result eligibility). */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Kalkulator Material Konstruksi gegarap.id',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${BASE_URL}/tools/material-calculator`,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
  description:
    'Kalkulator kebutuhan material bangunan dan estimasi biaya untuk pekerjaan dinding, lantai, plesteran, cor beton, pondasi, dan pengecatan.',
};

export default function MaterialCalculatorPage() {
  return (
    <div className="min-h-screen bg-surface/40">
      <JsonLd data={jsonLd} />

      {/* Header */}
      <section className="border-b border-border bg-card">
        <div className="container py-10 sm:py-12">
          <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-foreground">
              Beranda
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">Kalkulator Material</span>
          </nav>

          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
              <Calculator className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Kalkulator Material Konstruksi
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Estimasi kebutuhan material dan biaya untuk pekerjaan bangunan Anda — hasil langsung
                muncul saat Anda mengetik. Sesuaikan harga sesuai wilayah, lalu cari tukang untuk
                mengerjakannya.
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-800">
                <Sparkles className="h-3.5 w-3.5" />
                Gratis, tanpa perlu login
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tool */}
      <section className="container py-8 sm:py-10">
        <MaterialCalculator />
      </section>
    </div>
  );
}
