import { Suspense } from 'react';
import { pageMetadata } from '@/lib/seo';
import { RegisterClient } from './RegisterClient';

export const metadata = pageMetadata({
  title: 'Daftar',
  description: 'Buat akun gegarap.id untuk memesan jasa tukang terpercaya di sekitar Anda.',
  path: '/register',
});

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterClient />
    </Suspense>
  );
}
