import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginClient } from './LoginClient';

export const metadata: Metadata = {
  title: 'Masuk',
  description: 'Masuk ke akun gegarap.id untuk mengelola booking dan profil Anda.',
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
