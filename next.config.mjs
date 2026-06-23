/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable the `src/instrumentation.ts` hook (Sentry init, Bagian 10). On
  // Next 14.2 this is still behind an experimental flag (default from 15).
  experimental: {
    instrumentationHook: true,
    // firebase-admin (and its transitive deps) must NOT be webpack-bundled, or a
    // pure-ESM transitive dep gets require()'d in the Vercel serverless runtime
    // and throws ERR_REQUIRE_ESM. Externalizing leaves it as a native node
    // require from node_modules (nft traces it into the lambda). Fixes every
    // server route that touches Firebase Admin (auth/session/providers/etc.).
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  // Let Firebase's Google sign-in popup keep a handle to its opener so
  // window.closed/window.close() work — otherwise the browser's default COOP
  // blocks them, spamming "Cross-Origin-Opener-Policy would block..." warnings
  // and making the popup-close detection flaky. `same-origin-allow-popups` is
  // the value Firebase recommends for OAuth-popup apps.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
      },
    ];
  },
};

export default nextConfig;
