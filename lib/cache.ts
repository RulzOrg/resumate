/**
 * Client-side caching utilities
 * Uses localStorage with TTL support
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Get item from cache
 */
export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const item = localStorage.getItem(key)
    if (!item) return null

    const cached: CacheItem<T> = JSON.parse(item)
    const now = Date.now()

    // Check if expired
    if (now - cached.timestamp > cached.ttl) {
      localStorage.removeItem(key)
      return null
    }

    return cached.data
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

/**
 * Set item in cache
 */
export function setCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
  if (typeof window === 'undefined') return

  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

/**
 * Remove item from cache
 */
export function removeCache(key: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Cache remove error:', error)
  }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.clear()
  } catch (error) {
    console.error('Cache clear error:', error)
  }
}

/**
 * Cache with stale-while-revalidate pattern
 */
export async function cacheWithRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // Try to get from cache first
  const cached = getCache<T>(key)
  
  if (cached) {
    // Return cached data immediately
    // But revalidate in background if stale
    const item = localStorage.getItem(key)
    if (item) {
      const parsed: CacheItem<T> = JSON.parse(item)
      const age = Date.now() - parsed.timestamp
      
      // If more than half the TTL has passed, revalidate
      if (age > ttl / 2) {
        fetcher().then(data => setCache(key, data, ttl)).catch(console.error)
      }
    }
    
    return cached
  }

  // No cache, fetch fresh data
  const data = await fetcher()
  setCache(key, data, ttl)
  return data
}

/**
 * Memory cache for runtime (doesn't persist)
 */
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

export const memoryCache = new MemoryCache()
