import { supabase } from './supabase';
import { clientStorage } from './clientStorage';
import { Product, InteractionType, INTERACTION_WEIGHTS, StyleCounter } from '../types';

const QUIZ_BASE_WEIGHT = 3.0; // Quiz answers get a strong base so they're not wiped by early browsing
const MAX_PRICE_SAMPLES = 20; // Rolling window for price range inference

function incrementMap(map: Record<string, number>, keys: string[], weight: number) {
  for (const key of keys) {
    const normalized = key.trim();
    if (normalized) {
      map[normalized] = (map[normalized] || 0) + weight;
    }
  }
}

function topN(map: Record<string, number>, n: number): string[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

function inferPriceRange(samples: number[]): { min: number; max: number } | null {
  if (samples.length < 3) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return {
    min: Math.max(0, Math.round(median * 0.5)),
    max: Math.round(median * 1.8),
  };
}

export const preferenceService = {
  /**
   * Seed local style counters from quiz answers.
   * Called after quiz completion so behavioral data ADDS TO quiz choices
   * instead of overwriting them. Quiz answers start with QUIZ_BASE_WEIGHT.
   */
  async seedCountersFromQuiz(
    userId: string,
    styles: string[],
    colors: string[],
    patterns: string[]
  ): Promise<void> {
    // Start fresh so previous learned data doesn't carry over after retake
    const fresh: StyleCounter = {
      style_scores: {},
      color_scores: {},
      pattern_scores: {},
      occasion_scores: {},
      season_scores: {},
      subcategory_scores: {},
      price_samples: [],
      last_synced_at: new Date().toISOString(),
    };
    incrementMap(fresh.style_scores, styles, QUIZ_BASE_WEIGHT);
    incrementMap(fresh.color_scores, colors, QUIZ_BASE_WEIGHT);
    incrementMap(fresh.pattern_scores, patterns, QUIZ_BASE_WEIGHT);
    await clientStorage.setStyleCounters(userId, fresh);
    await clientStorage.clearFeedCache(userId);
  },

  /**
   * Update local style counters based on a product interaction.
   * Tracks style, color, pattern, occasion, season, subcategory, and price.
   */
  async updateStyleCounters(
    userId: string,
    product: Product,
    interactionType: InteractionType
  ): Promise<StyleCounter> {
    const counters = await clientStorage.getStyleCounters(userId);
    const weight = Math.abs(INTERACTION_WEIGHTS[interactionType]);

    if (product.style && product.style.length > 0) {
      incrementMap(counters.style_scores, product.style, weight);
    }
    if (product.colors && product.colors.length > 0) {
      incrementMap(counters.color_scores, product.colors, weight);
    }
    if (product.attributes?.pattern) {
      incrementMap(counters.pattern_scores, [product.attributes.pattern], weight);
    }
    if (product.occasion && product.occasion.length > 0) {
      incrementMap(counters.occasion_scores, product.occasion, weight);
    }
    if (product.season && product.season.length > 0) {
      incrementMap(counters.season_scores, product.season, weight);
    }
    if (product.subcategory) {
      incrementMap(counters.subcategory_scores, [product.subcategory], weight);
    }

    // Track price from high-intent interactions (like/save/purchase) for price range inference
    const isHighIntent = Math.abs(INTERACTION_WEIGHTS[interactionType]) >= 0.5;
    const effectivePrice = product.sale_price ?? product.price;
    if (isHighIntent && effectivePrice > 0) {
      counters.price_samples = [
        ...counters.price_samples.slice(-(MAX_PRICE_SAMPLES - 1)),
        effectivePrice,
      ];
    }

    await clientStorage.setStyleCounters(userId, counters);
    return counters;
  },

  /**
   * Sync derived preferences to Supabase user_preferences.
   * Called on like/save/purchase, every 10th view, app background, etc.
   * Writes only fields where we have meaningful signal — never wipes fields with no data.
   */
  async syncToSupabase(userId: string): Promise<void> {
    try {
      const counters = await clientStorage.getStyleCounters(userId);

      const derivedStyles = topN(counters.style_scores, 5);
      const derivedColors = topN(counters.color_scores, 5);
      const derivedPatterns = topN(counters.pattern_scores, 3);

      if (derivedStyles.length === 0 && derivedColors.length === 0 && derivedPatterns.length === 0) {
        return;
      }

      const update: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (derivedStyles.length > 0) update.style_tags = derivedStyles;
      if (derivedColors.length > 0) update.favorite_colors = derivedColors;
      if (derivedPatterns.length > 0) update.pattern_preferences = derivedPatterns;

      // Infer and sync price range if we have enough purchase/save data
      const priceRange = inferPriceRange(counters.price_samples);
      if (priceRange) {
        update.price_range = priceRange;
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert(update as any, { onConflict: 'user_id' });

      if (error) {
        console.warn('Preference sync failed:', error.message);
        return;
      }

      counters.last_synced_at = new Date().toISOString();
      await clientStorage.setStyleCounters(userId, counters);
    } catch (e) {
      console.warn('Preference sync error:', e);
    }
  },

  /**
   * Full interaction handler: updates counters + conditionally syncs.
   */
  async handleInteraction(
    userId: string,
    product: Product,
    interactionType: InteractionType
  ): Promise<void> {
    await this.updateStyleCounters(userId, product, interactionType);

    const weight = INTERACTION_WEIGHTS[interactionType];

    // Sync on high-intent interactions
    if (weight >= 0.5) {
      await this.syncToSupabase(userId);
      // Invalidate feed cache so next open gets fresh personalization
      await clientStorage.clearFeedCache(userId);
    }

    // Sync every 10th view
    if (interactionType === 'view') {
      const count = await clientStorage.incrementViewCount(userId);
      if (count % 10 === 0) {
        this.syncToSupabase(userId).catch(() => {});
      }
    }
  },

  /**
   * Reset all learned preferences (for re-taking quiz).
   * Use seedCountersFromQuiz() immediately after this when new quiz data is available.
   */
  async resetLearnedPreferences(userId: string): Promise<void> {
    await clientStorage.resetStyleCounters(userId);
    await clientStorage.clearFeedCache(userId);
  },
};
