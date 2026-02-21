import { supabase } from './supabase';
import { clientStorage } from './clientStorage';
import { Product, InteractionType, INTERACTION_WEIGHTS, StyleCounter } from '../types';

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

export const preferenceService = {
  /**
   * Update local style counters based on a product interaction.
   * Weight multiplier depends on interaction type.
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

    await clientStorage.setStyleCounters(userId, counters);
    return counters;
  },

  /**
   * Sync derived preferences to Supabase user_preferences.
   * Called on like/save/purchase, every 10th view, app background, etc.
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

      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: userId,
            style_tags: derivedStyles,
            favorite_colors: derivedColors,
            pattern_preferences: derivedPatterns,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

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
   */
  async resetLearnedPreferences(userId: string): Promise<void> {
    await clientStorage.resetStyleCounters(userId);
    await clientStorage.clearFeedCache(userId);
  },
};
