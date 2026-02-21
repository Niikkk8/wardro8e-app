import { supabase } from './supabase';
import { clientStorage } from './clientStorage';
import { interactionService } from './interactionService';
import { Product, FeedType, FeedOptions, UserPreferences } from '../types';
import { STATIC_PRODUCTS } from '../data/staticProducts';

const DEFAULT_LIMIT = 20;

function applyGenderFilter(products: Product[], gender?: string | null): Product[] {
  if (!gender || gender === 'both') return products;
  const genderLower = gender.toLowerCase();
  if (genderLower === 'women' || genderLower === 'woman') {
    return products.filter((p) => p.gender === 'women' || p.gender === 'unisex');
  }
  if (genderLower === 'men' || genderLower === 'man') {
    return products.filter((p) => p.gender === 'men' || p.gender === 'unisex');
  }
  return products;
}

function applyExcludeFilter(products: Product[], excludeIds: string[]): Product[] {
  if (excludeIds.length === 0) return products;
  const excludeSet = new Set(excludeIds);
  return products.filter((p) => !excludeSet.has(p.id));
}

function paginate(products: Product[], limit: number, offset: number): Product[] {
  return products.slice(offset, offset + limit);
}

/**
 * Score a product for the preference-based feed.
 */
function scoreByPreferences(product: Product, prefs: UserPreferences): number {
  let score = 0;

  // Style match
  if (prefs.style_tags && product.style) {
    for (const tag of prefs.style_tags) {
      if (product.style.some((s) => s.toLowerCase() === tag.toLowerCase())) {
        score += 3;
      }
    }
  }

  // Color match
  if (prefs.favorite_colors && product.colors) {
    for (const color of prefs.favorite_colors) {
      if (product.colors.some((c) => c.toLowerCase() === color.toLowerCase())) {
        score += 2;
      }
    }
  }

  // Pattern match
  if (prefs.pattern_preferences && product.attributes?.pattern) {
    const pattern = product.attributes.pattern.toLowerCase();
    if (prefs.pattern_preferences.some((p) => p.toLowerCase() === pattern)) {
      score += 1.5;
    }
  }

  // Featured bonus
  if (product.is_featured) score += 1;

  return score;
}

/**
 * Enforce max 2 products per brand per page.
 */
function applyBrandDiversityCap(products: Product[], maxPerBrand: number = 2): Product[] {
  const brandCount: Record<string, number> = {};
  return products.filter((p) => {
    const brand = p.source_brand_name || p.brand_id || 'unknown';
    brandCount[brand] = (brandCount[brand] || 0) + 1;
    return brandCount[brand] <= maxPerBrand;
  });
}

export const feedService = {
  /**
   * Determine which feed type to use for a user.
   */
  async determineFeedType(userId: string | null): Promise<FeedType> {
    if (!userId) return 'cold_start';

    try {
      // Check for interaction history
      const hasHistory = await interactionService.hasInteractionHistory(userId);
      if (hasHistory) return 'behavioral';

      // Check for quiz preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('style_tags, favorite_colors')
        .eq('user_id', userId)
        .single();

      if (prefs && (
        (prefs.style_tags && prefs.style_tags.length > 0) ||
        (prefs.favorite_colors && prefs.favorite_colors.length > 0)
      )) {
        return 'preference';
      }
    } catch {}

    return 'cold_start';
  },

  /**
   * Get the user's preferences from Supabase.
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return data as UserPreferences;
    } catch {
      return null;
    }
  },

  /**
   * Get the user's gender preference for filtering.
   */
  async getUserGender(userId: string): Promise<string | null> {
    try {
      // Check user_preferences first
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('gender')
        .eq('user_id', userId)
        .single();

      if (prefs?.gender) return prefs.gender;

      // Fall back to users table
      const { data: profile } = await supabase
        .from('users')
        .select('gender')
        .eq('id', userId)
        .single();

      if (profile?.gender) {
        const genderMap: Record<string, string> = {
          woman: 'women',
          man: 'men',
        };
        return genderMap[profile.gender] || null;
      }
    } catch {}
    return null;
  },

  /**
   * Cold Start Feed: trending/featured products.
   */
  getColdStartFeed(options: FeedOptions = {}): Product[] {
    const { limit = DEFAULT_LIMIT, offset = 0, excludeIds = [], gender } = options;

    let products = [...STATIC_PRODUCTS].filter((p) => p.is_active);
    products = applyGenderFilter(products, gender);
    products = applyExcludeFilter(products, excludeIds);

    // Sort: featured first, then by index (proxy for recency)
    products.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return 0;
    });

    products = applyBrandDiversityCap(products);
    return paginate(products, limit, offset);
  },

  /**
   * Preference Feed: scored by style/color/pattern match.
   */
  getPreferenceFeed(prefs: UserPreferences, options: FeedOptions = {}): Product[] {
    const { limit = DEFAULT_LIMIT, offset = 0, excludeIds = [], gender } = options;

    let products = [...STATIC_PRODUCTS].filter((p) => p.is_active);
    products = applyGenderFilter(products, gender || prefs.gender);
    products = applyExcludeFilter(products, excludeIds);

    const scored = products.map((p) => ({
      product: p,
      score: scoreByPreferences(p, prefs) + Math.random() * 0.5, // Small random jitter
    }));

    scored.sort((a, b) => b.score - a.score);

    let result = scored.map((s) => s.product);
    result = applyBrandDiversityCap(result);
    return paginate(result, limit, offset);
  },

  /**
   * Behavioral Feed: 70% interaction-based + 30% preference-based.
   */
  async getBehavioralFeed(
    userId: string,
    prefs: UserPreferences | null,
    options: FeedOptions = {}
  ): Promise<Product[]> {
    const { limit = DEFAULT_LIMIT, offset = 0, excludeIds = [], gender } = options;

    const interactionScores = await interactionService.getInteractionScores(userId);

    // Find anchor products (top interacted)
    const anchorIds = Object.entries(interactionScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const anchors = STATIC_PRODUCTS.filter((p) => anchorIds.includes(p.id));

    let products = [...STATIC_PRODUCTS].filter((p) => p.is_active);
    products = applyGenderFilter(products, gender || prefs?.gender);
    products = applyExcludeFilter(products, excludeIds);

    // Score each candidate
    const scored = products.map((candidate) => {
      // Behavioral score: similarity to anchor products
      let behavioralScore = 0;
      for (const anchor of anchors) {
        if (anchor.id === candidate.id) continue;
        let sim = 0;
        if (anchor.category === candidate.category) sim += 2;
        if (anchor.style && candidate.style) {
          sim += anchor.style.filter((s) =>
            candidate.style!.some((cs) => cs.toLowerCase() === s.toLowerCase())
          ).length * 1.5;
        }
        if (anchor.colors && candidate.colors) {
          sim += anchor.colors.filter((c) =>
            candidate.colors.some((cc) => cc.toLowerCase() === c.toLowerCase())
          ).length;
        }
        if (anchor.attributes?.pattern && candidate.attributes?.pattern &&
            anchor.attributes.pattern.toLowerCase() === candidate.attributes.pattern.toLowerCase()) {
          sim += 1;
        }
        const anchorWeight = interactionScores[anchor.id] || 0.2;
        behavioralScore += sim * anchorWeight;
      }

      // Preference score
      let prefScore = 0;
      if (prefs) {
        prefScore = scoreByPreferences(candidate, prefs);
      }

      // Blend: 70% behavioral + 30% preference
      const totalScore = 0.7 * behavioralScore + 0.3 * prefScore + Math.random() * 0.3;

      return { product: candidate, score: totalScore };
    });

    scored.sort((a, b) => b.score - a.score);

    let result = scored.map((s) => s.product);
    result = applyBrandDiversityCap(result);
    return paginate(result, limit, offset);
  },

  /**
   * Main entry point: load the feed with caching and tier decision.
   */
  async loadFeed(
    userId: string | null,
    options: FeedOptions & { forceRefresh?: boolean } = {}
  ): Promise<{ products: Product[]; feedType: FeedType; fromCache: boolean }> {
    const { forceRefresh = false, ...feedOptions } = options;
    const effectiveUserId = userId || 'guest';

    // Check cache (only for first page)
    if (!forceRefresh && (feedOptions.offset || 0) === 0) {
      const cache = await clientStorage.getFeedCache(effectiveUserId);
      if (cache) {
        return { products: cache.data, feedType: cache.feed_type, fromCache: true };
      }
    }

    // Get seen product IDs for exclusion
    const seenIds = userId
      ? await clientStorage.getSeenProductIds(userId)
      : [];
    const allExcludeIds = [...(feedOptions.excludeIds || []), ...seenIds];

    // Get gender preference
    const gender = userId
      ? await this.getUserGender(userId)
      : null;

    const mergedOptions: FeedOptions = {
      ...feedOptions,
      excludeIds: allExcludeIds,
      gender: feedOptions.gender || gender,
    };

    // Determine feed type
    const feedType = await this.determineFeedType(userId);

    let products: Product[];

    switch (feedType) {
      case 'behavioral': {
        const prefs = userId ? await this.getUserPreferences(userId) : null;
        products = await this.getBehavioralFeed(userId!, prefs, mergedOptions);
        break;
      }
      case 'preference': {
        const prefs = await this.getUserPreferences(userId!);
        if (prefs) {
          products = this.getPreferenceFeed(prefs, mergedOptions);
        } else {
          products = this.getColdStartFeed(mergedOptions);
        }
        break;
      }
      default:
        products = this.getColdStartFeed(mergedOptions);
    }

    // Cache first page
    if ((feedOptions.offset || 0) === 0) {
      await clientStorage.setFeedCache(effectiveUserId, products, feedType);
    }

    return { products, feedType, fromCache: false };
  },
};
