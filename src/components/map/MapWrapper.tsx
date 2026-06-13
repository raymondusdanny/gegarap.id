'use client';

import dynamic from 'next/dynamic';

const MapWrapper = dynamic(() => import('./ProviderMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center shadow-inner border border-gray-200">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 font-medium text-sm">Memuat Peta Interaktif...</span>
      </div>
    </div>
  ),
});

export default MapWrapper;
