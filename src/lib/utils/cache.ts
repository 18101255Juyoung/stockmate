/**
 * Simple in-memory cache with TTL (Time To Live)
 * Used for caching KIS API responses to reduce API calls
 */

interface CacheEntry {
  value: any
  expiresAt: number
}

export class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map()

  /**
   * Set a value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds
   */
  set(key: string, value: any, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.cache.set(key, { value, expiresAt })
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found or expired
   */
  get(key: string): any | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  /**
   * Delete a value from cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

// Export singleton instance
const cacheInstance = new MemoryCache()

// Auto cleanup every 5 minutes (only in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    cacheInstance.cleanup()
  }, 5 * 60 * 1000)
}

export default cacheInstance
