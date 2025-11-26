import type { JPLData } from './jplHorizons';

const CACHE_PREFIX = 'solar_system_cache_';
const CACHE_VERSION = 'v1';

interface CachedItem {
  version: string;
  timestamp: number;
  date: string; // The target date for the simulation
  data: JPLData;
}

export const dataCache = {
  /**
   * Generate a cache key for a specific body and date
   */
  getKey: (id: string, date: string): string => {
    return `${CACHE_PREFIX}${CACHE_VERSION}_${id}_${date}`;
  },

  /**
   * Retrieve data from cache if it exists and is valid
   */
  get: (id: string, date: string): JPLData | null => {
    try {
      const key = dataCache.getKey(id, date);
      const itemStr = localStorage.getItem(key);
      
      if (!itemStr) return null;
      
      const item: CachedItem = JSON.parse(itemStr);
      
      // Basic validation
      if (item.version !== CACHE_VERSION) return null;
      
      // Optional: Expiry check (e.g., if cache is older than 7 days, invalidate?)
      // For now, since the data for a specific date shouldn't change, we can keep it indefinitely
      // until the user clears it or storage runs out.
      
      return item.data;
    } catch (e) {
      console.warn('Failed to read from cache', e);
      return null;
    }
  },

  /**
   * Save data to cache
   */
  set: (id: string, date: string, data: JPLData): void => {
    try {
      const key = dataCache.getKey(id, date);
      const item: CachedItem = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        date,
        data
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.warn('Failed to write to cache (storage might be full)', e);
    }
  },

  /**
   * Clear all solar system cache
   */
  clear: (): void => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
