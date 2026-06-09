import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SmartTicket AI',
    short_name: 'SmartTicket',
    description: 'Next-generation AI support ticket classification and resolution platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0b14',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
