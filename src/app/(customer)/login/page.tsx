import { Suspense } from 'react';
import { pageMetadata } from '@/lib/seo';
import { LoginClient } from './LoginClient';

export const metadata = pageMetadata({
  title: 'Masuk',
  description: 'Masuk ke akun gegarap.id untuk mengelola booking dan profil Anda.',
  path: '/login',
});

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
