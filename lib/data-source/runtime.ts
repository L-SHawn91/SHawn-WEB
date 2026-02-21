export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_SHAWNBRAIN_API_BASE_URL?.trim() || '';
  if (!base) return '';
  return base.replace(/\/$/, '');
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
