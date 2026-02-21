import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SHawnbrain',
    short_name: '숀두뇌',
    description: 'SHawnbrain Web Hub - Papers, Datasets, Market Intelligence',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#0f172a',
    lang: 'ko',
  };
}
