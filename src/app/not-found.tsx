import Link from 'next/link';
import { Hammer, Home, Search } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary">
        <Hammer className="h-8 w-8" />
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-primary">Error 404</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Sepertinya halaman yang Anda cari sudah dipindahkan atau tidak pernah ada.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
          <Home className="h-5 w-5" />
          Kembali ke Beranda
        </Link>
        <Link href="/search" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          <Search className="h-5 w-5" />
          Cari Tukang
        </Link>
      </div>
    </div>
  );
}
