import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, StyleCounter, FeedCache, FeedType } from '../types';

const CACHE_TTL = {
  FEED: 15 * 60 * 1000,
  PRODUCT: 60 * 60 * 1000,
  SIMILAR: 30 * 60 * 1000,
  INTERACTION_DEDUP: 24 * 60 * 60 * 1000,
};

const MAX_SEEN_IDS = 500;

function feedCacheKey(userId: string) {
  return `@wardro8e:feed_cache_${userId}`;
}
function seenIdsKey(userId: string) {
  return `@wardro8e:seen_product_ids_${userId}`;
}
function styleCounterKey(userId: string) {
  return `@wardro8e:style_counter_${userId}`;
}
function productCacheKey(productId: string) {
  return `@wardro8e:product_cache_${productId}`;
}
function similarCacheKey(productId: string) {
  return `@wardro8e:similar_cache_${productId}`;
}
function lastInteractionKey(productId: string) {
  return `@wardro8e:last_interaction_${productId}`;
}
function recentlyViewedKey(userId: string) {
  return `@wardro8e:recently_viewed_${userId}`;
}
function viewCountKey(userId: string) {
  return `@wardro8e:view_count_${userId}`;
}

export const clientStorage = {
  // ── Feed Cache ──────────────────────────────────────────────────────
  async getFeedCache(userId: string): Promise<FeedCache | null> {
    try {
      const raw = await AsyncStorage.getItem(feedCacheKey(userId));
      if (!raw) return null;
      const cache: FeedCache = JSON.parse(raw);
      const age = Date.now() - new Date(cache.cached_at).getTime();
      if (age > CACHE_TTL.FEED) return null;
      return cache;
    } catch {
      return null;
    }
  },

  async setFeedCache(userId: string, data: Product[], feedType: FeedType): Promise<void> {
    try {
      const cache: FeedCache = {
        data,
        cached_at: new Date().toISOString(),
        feed_type: feedType,
      };
      await AsyncStorage.setItem(feedCacheKey(userId), JSON.stringify(cache));
    } catch (e) {
      console.error('Error saving feed cache:', e);
    }
  },

  async clearFeedCache(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(feedCacheKey(userId));
    } catch {}
  },

  // ── Seen Product IDs ────────────────────────────────────────────────
  async getSeenProductIds(userId: string): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(seenIdsKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async addSeenProductId(userId: string, productId: string): Promise<void> {
    try {
      const ids = await this.getSeenProductIds(userId);
      if (ids.includes(productId)) return;
      const updated = [...ids, productId];
      // Rolling window: keep only the last MAX_SEEN_IDS
      const trimmed = updated.length > MAX_SEEN_IDS
        ? updated.slice(updated.length - MAX_SEEN_IDS)
        : updated;
      await AsyncStorage.setItem(seenIdsKey(userId), JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error adding seen product ID:', e);
    }
  },

  // ── Style Counters ──────────────────────────────────────────────────
  async getStyleCounters(userId: string): Promise<StyleCounter> {
    try {
      const raw = await AsyncStorage.getItem(styleCounterKey(userId));
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      style_scores: {},
      color_scores: {},
      pattern_scores: {},
      last_synced_at: new Date().toISOString(),
    };
  },

  async setStyleCounters(userId: string, counters: StyleCounter): Promise<void> {
    try {
      await AsyncStorage.setItem(styleCounterKey(userId), JSON.stringify(counters));
    } catch (e) {
      console.error('Error saving style counters:', e);
    }
  },

  async resetStyleCounters(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(styleCounterKey(userId));
    } catch {}
  },

  // ── Product Cache ───────────────────────────────────────────────────
  async getCachedProduct(productId: string): Promise<Product | null> {
    try {
      const raw = await AsyncStorage.getItem(productCacheKey(productId));
      if (!raw) return null;
      const { product, cached_at } = JSON.parse(raw);
      const age = Date.now() - new Date(cached_at).getTime();
      if (age > CACHE_TTL.PRODUCT) return null;
      return product;
    } catch {
      return null;
    }
  },

  async setCachedProduct(product: Product): Promise<void> {
    try {
      await AsyncStorage.setItem(
        productCacheKey(product.id),
        JSON.stringify({ product, cached_at: new Date().toISOString() })
      );
    } catch {}
  },

  // ── Similar Products Cache ──────────────────────────────────────────
  async getSimilarCache(productId: string): Promise<Product[] | null> {
    try {
      const raw = await AsyncStorage.getItem(similarCacheKey(productId));
      if (!raw) return null;
      const { products, cached_at } = JSON.parse(raw);
      const age = Date.now() - new Date(cached_at).getTime();
      if (age > CACHE_TTL.SIMILAR) return null;
      return products;
    } catch {
      return null;
    }
  },

  async setSimilarCache(productId: string, products: Product[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        similarCacheKey(productId),
        JSON.stringify({ products, cached_at: new Date().toISOString() })
      );
    } catch {}
  },

  // ── Interaction Dedup ───────────────────────────────────────────────
  async canLogView(productId: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(lastInteractionKey(productId));
      if (!raw) return true;
      const age = Date.now() - new Date(raw).getTime();
      return age > CACHE_TTL.INTERACTION_DEDUP;
    } catch {
      return true;
    }
  },

  async markViewLogged(productId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(
        lastInteractionKey(productId),
        new Date().toISOString()
      );
    } catch {}
  },

  // ── Recently Viewed ─────────────────────────────────────────────────
  async getRecentlyViewed(userId: string): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(recentlyViewedKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async addRecentlyViewed(userId: string, productId: string): Promise<void> {
    try {
      let ids = await this.getRecentlyViewed(userId);
      ids = ids.filter((id) => id !== productId);
      ids.unshift(productId);
      if (ids.length > 30) ids = ids.slice(0, 30);
      await AsyncStorage.setItem(recentlyViewedKey(userId), JSON.stringify(ids));
    } catch {}
  },

  // ── View Counter (for sync cadence: every 10th view) ────────────────
  async incrementViewCount(userId: string): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(viewCountKey(userId));
      const count = raw ? parseInt(raw, 10) + 1 : 1;
      await AsyncStorage.setItem(viewCountKey(userId), String(count));
      return count;
    } catch {
      return 0;
    }
  },

  // ── Bulk Clear (for logout) ─────────────────────────────────────────
  async clearAllRecommendationData(userId: string): Promise<void> {
    try {
      const keys = [
        feedCacheKey(userId),
        seenIdsKey(userId),
        styleCounterKey(userId),
        recentlyViewedKey(userId),
        viewCountKey(userId),
      ];
      await AsyncStorage.multiRemove(keys);
    } catch {}
  },
};
