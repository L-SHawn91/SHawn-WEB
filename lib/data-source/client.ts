import { resolveApiUrl } from './runtime';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(resolveApiUrl(path), init);
}
