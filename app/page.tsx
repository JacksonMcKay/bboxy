'use client';

import dynamic from 'next/dynamic';

// Import the Map component dynamically with no SSR
// This is necessary because Mapbox GL relies on browser APIs
const MapWithNoSSR = dynamic(() => import('./components/Map'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="h-screen w-full">
        <MapWithNoSSR />
      </div>
    </main>
  );
}
