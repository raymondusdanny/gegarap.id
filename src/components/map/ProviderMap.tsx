'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Provider {
  id: string;
  user: { name: string };
  category: string;
  dailyRate: number;
  latitude: number | null;
  longitude: number | null;
}

interface MapProps {
  providers: Provider[];
}

type LocatedProvider = Provider & { latitude: number; longitude: number };

export default function ProviderMap({ providers }: MapProps) {
  const center: [number, number] = [-7.7956, 110.3695];

  const locatedProviders = providers.filter(
    (p): p is LocatedProvider => p.latitude !== null && p.longitude !== null
  );

  return (
    <div className="h-[500px] w-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 relative z-0">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={center} icon={customIcon}>
          <Popup>
            <div className="font-semibold text-primary">Lokasi Anda</div>
          </Popup>
        </Marker>

        {locatedProviders.map((provider) => (
          <Marker
            key={provider.id}
            position={[provider.latitude, provider.longitude]}
            icon={customIcon}
          >
            <Popup className="rounded-lg">
              <div className="flex min-w-[210px] flex-col gap-2">
                <div className="text-base font-bold text-slate-900">{provider.user.name}</div>
                <div className="inline-block w-fit rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {provider.category}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Tarif:{' '}
                  <span className="font-bold text-slate-900">
                    Rp {provider.dailyRate.toLocaleString('id-ID')}/hari
                  </span>
                </div>
                <Link
                  href={`/book/${provider.id}`}
                  className="mt-2 rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800"
                >
                  Booking Sekarang
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
