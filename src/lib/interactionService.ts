import { supabase } from './supabase';
import { clientStorage } from './clientStorage';
import { InteractionType, INTERACTION_WEIGHTS } from '../types';

export const interactionService = {
  /**
   * Log a user interaction. Handles dedup for views (24hr window).
   * Writes to Supabase (fire-and-forget) and updates local state.
   */
  async logInteraction(
    userId: string | null,
    productId: string,
    type: InteractionType
  ): Promise<boolean> {
    if (!userId) return false;

    // For views, check dedup
    if (type === 'view') {
      const canLog = await clientStorage.canLogView(productId);
      if (!canLog) return false;
    }

    // Mark view as logged locally
    if (type === 'view') {
      await clientStorage.markViewLogged(productId);
      await clientStorage.addSeenProductId(userId, productId);
      await clientStorage.addRecentlyViewed(userId, productId);
    }

    // Fire-and-forget Supabase insert
    this._insertToSupabase(userId, productId, type).catch(() => {});

    return true;
  },

  async _insertToSupabase(
    userId: string,
    productId: string,
    type: InteractionType
  ): Promise<void> {
    try {
      const { error } = await supabase.from('user_interactions').insert({
        user_id: userId,
        product_id: productId,
        interaction_type: type,
        interaction_value: INTERACTION_WEIGHTS[type],
      });
      if (error) {
        console.warn('Supabase interaction insert failed:', error.message);
      }
    } catch (e) {
      // Supabase table may not exist yet — fail silently
    }
  },

  /**
   * Check if user has interaction history in the last 30 days.
   * Falls back to local recently-viewed if Supabase isn't available.
   */
  async hasInteractionHistory(userId: string): Promise<boolean> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1);

      if (!error && data && data.length > 0) return true;
    } catch {}

    // Fallback: check local recently viewed
    const recent = await clientStorage.getRecentlyViewed(userId);
    return recent.length > 0;
  },

  /**
   * Get recent interactions for behavioral feed scoring.
   * Returns product IDs with their weighted scores.
   */
  async getInteractionScores(
    userId: string
  ): Promise<Record<string, number>> {
    const scores: Record<string, number> = {};

    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('product_id, interaction_type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        for (const row of data) {
          const weight = INTERACTION_WEIGHTS[row.interaction_type as InteractionType] || 0;
          scores[row.product_id] = (scores[row.product_id] || 0) + weight;
        }
        return scores;
      }
    } catch {}

    // Fallback: use local recently viewed (all weight = 0.2 for views)
    const recent = await clientStorage.getRecentlyViewed(userId);
    for (const pid of recent) {
      scores[pid] = (scores[pid] || 0) + 0.2;
    }
    return scores;
  },
};
