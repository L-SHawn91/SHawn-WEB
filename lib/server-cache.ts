/**
 * Process-level in-memory cache for server API routes.
 * Survives across requests within the same Node.js process (Vercel serverless
 * keeps the process warm for ~5 min, so this is effective for short-burst reuse).
 *
 * Usage:
 *   const hit = searchCache.get(key);
 *   if (hit) return hit;
 *   const result = await expensiveApiCall();
 *   searchCache.set(key, result);
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlSeconds: number, maxEntries = 200) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxEntries = maxEntries;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict oldest entries when at capacity
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  size(): number {
    return this.store.size;
  }
}

// Papers search: 5 min TTL (academic search results change slowly)
export const papersCache = new TTLCache<Record<string, unknown>>(300, 150);

// Datasets search: 10 min TTL
export const datasetsCache = new TTLCache<Record<string, unknown>>(600, 100);

// Journal metrics: 24h TTL (IF/quartile changes annually)
export const journalMetricsCache = new TTLCache<{
  if: number;
  quartile: string;
  hIndex: number;
  name: string;
  field?: string;
  subfield?: string;
  domain?: string;
  topic?: string;
  recentYears?: Array<{ year: number; works: number; citations: number }>;
  source?: string;
  metric?: string;
  year?: string;
  isOfficial?: boolean;
  matchMode?: string;
  jci?: number;
  category?: string;
  edition?: string;
  rank?: string;
  percentile?: number;
}>(86400, 500);

/**
 * Build a stable cache key from a search request body.
 * Sorts keys for determinism regardless of field order.
 */
export function makeCacheKey(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
