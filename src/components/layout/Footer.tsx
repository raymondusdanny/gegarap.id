import Link from 'next/link';
import { Hammer, MapPin } from 'lucide-react';

const columns = [
  {
    title: 'Layanan',
    links: [
      { label: 'Cari Tukang', href: '/search' },
      { label: 'Tukang Ledeng', href: '/search?category=Tukang+Ledeng' },
      { label: 'Tukang Listrik', href: '/search?category=Tukang+Listrik' },
      { label: 'Pembersih Rumah', href: '/search?category=Pembersih+Rumah' },
    ],
  },
  {
    title: 'Mitra',
    links: [
      { label: 'Jadi Mitra', href: '/onboarding' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Pusat Bantuan', href: '#' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', href: '#' },
      { label: 'Kebijakan Privasi', href: '#' },
      { label: 'Syarat & Ketentuan', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
                <Hammer className="h-5 w-5" />
              </span>
              <span className="text-xl font-extrabold tracking-tight">
                gegarap<span className="text-primary">.id</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Platform hyper-local yang menghubungkan Anda dengan tukang terverifikasi di seluruh
              Yogyakarta. Cepat, aman, terpercaya.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Daerah Istimewa Yogyakarta
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} gegarap.id — Seluruh hak cipta dilindungi.
          </p>
          <p className="text-sm text-muted-foreground">
            Dibuat dengan <span className="text-primary">♥</span> di Yogyakarta
          </p>
        </div>
      </div>
    </footer>
  );
}
