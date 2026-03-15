import { supabase } from './supabase';
import { clientStorage } from './clientStorage';
import { interactionService } from './interactionService';
import { getProducts, getProductsByIds } from './productsApi';
import { Product, FeedType, FeedOptions, UserPreferences } from '../types';

const DEFAULT_LIMIT = 20;
const PYTHON_SERVICE_URL = process.env.EXPO_PUBLIC_PYTHON_SERVICE_URL || '';
const FEED_TIMEOUT_MS = 10000;

function normalizeProductGender(g: string | undefined | null): 'men' | 'women' | 'unisex' {
  if (g == null || !String(g).trim()) return 'unisex';
  const s = String(g).trim().toLowerCase();
  if (s === 'woman' || s === 'women' || s === 'female') return 'women';
  if (s === 'man' || s === 'men' || s === 'male') return 'men';
  return 'unisex'; // both, unisex, unknown, kids → show to everyone
}

function applyGenderFilter(products: Product[], gender?: string | null): Product[] {
  if (!gender || gender === 'both') return products;
  const genderLower = String(gender).trim().toLowerCase();
  if (genderLower === 'unisex_only') {
    return products.filter((p) => normalizeProductGender(p.gender) === 'unisex');
  }
  const wantWomen = genderLower === 'women' || genderLower === 'woman';
  const wantMen = genderLower === 'men' || genderLower === 'man';
  if (!wantWomen && !wantMen) return products;
  return products.filter((p) => {
    const pg = normalizeProductGender(p.gender);
    if (pg === 'unisex') return true;
    return wantWomen ? pg === 'women' : pg === 'men';
  });
}

function applyExcludeFilter(products: Product[], excludeIds: string[]): Product[] {
  if (excludeIds.length === 0) return products;
  const excludeSet = new Set(excludeIds);
  return products.filter((p) => !excludeSet.has(p.id));
}

function paginate(products: Product[], limit: number, offset: number): Product[] {
  return products.slice(offset, offset + limit);
}

function scoreByPreferences(product: Product, prefs: UserPreferences): number {
  let score = 0;

  if (prefs.style_tags && product.style) {
    for (const tag of prefs.style_tags) {
      if (product.style.some((s) => s.toLowerCase() === tag.toLowerCase())) {
        score += 3;
      }
    }
  }

  if (prefs.favorite_colors && product.colors) {
    for (const color of prefs.favorite_colors) {
      if (product.colors.some((c) => c.toLowerCase() === color.toLowerCase())) {
        score += 2;
      }
    }
  }

  if (prefs.pattern_preferences && product.attributes?.pattern) {
    const pattern = product.attributes.pattern.toLowerCase();
    if (prefs.pattern_preferences.some((p) => p.toLowerCase() === pattern)) {
      score += 1.5;
    }
  }

  if (product.is_featured) score += 1;

  return score;
}

function applyBrandDiversityCap(products: Product[], maxPerBrand: number = 5): Product[] {
  const brandCount: Record<string, number> = {};
  return products.filter((p) => {
    const brand = p.source_brand_name || p.brand_id || 'unknown';
    brandCount[brand] = (brandCount[brand] || 0) + 1;
    return brandCount[brand] <= maxPerBrand;
  });
}

/**
 * Map a Python service product response to the Product type.
 */
function mapPythonProduct(item: any): Product {
  return {
    id: item.id,
    brand_id: null,
    title: item.title || '',
    description: item.description || '',
    price: Number(item.price) || 0,
    sale_price: item.sale_price != null ? Number(item.sale_price) : null,
    category: item.category || '',
    subcategory: item.subcategory || null,
    gender: (item.gender as Product['gender']) || 'unisex',
    colors: Array.isArray(item.colors) ? item.colors : [],
    size_range: Array.isArray(item.size_range) ? item.size_range : [],
    fit_type: item.fit_type || undefined,
    style: Array.isArray(item.style) ? item.style : undefined,
    occasion: Array.isArray(item.occasion) ? item.occasion : undefined,
    season: Array.isArray(item.season) ? item.season : undefined,
    attributes: {
      pattern: item.pattern || item.attributes?.pattern,
      materials: item.materials || item.attributes?.materials,
      sleeve_type: item.attributes?.sleeve_type,
      neck_type: item.attributes?.neck_type,
      length: item.attributes?.length,
      waist_type: item.attributes?.waist_type,
      closure_type: item.attributes?.closure_type,
      care_instructions: item.attributes?.care_instructions,
    },
    image_urls: Array.isArray(item.image_urls) ? item.image_urls : [],
    embedding: null,
    is_active: true,
    source_platform: item.source_platform || undefined,
    source_brand_name: item.source_brand_name || undefined,
    affiliate_url: item.affiliate_url || undefined,
    is_featured: item.is_featured || undefined,
    created_at: item.created_at || undefined,
  };
}

/**
 * Call the Python service /personalized-feed endpoint.
 * Returns null if the service is unavailable.
 */
async function callPythonPersonalizedFeed(
  userId: string,
  options: FeedOptions & { gender?: string | null }
): Promise<Product[] | null> {
  if (!PYTHON_SERVICE_URL) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

    const response = await fetch(`${PYTHON_SERVICE_URL}/personalized-feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        limit: options.limit ?? DEFAULT_LIMIT,
        offset: options.offset ?? 0,
        exclude_ids: options.excludeIds ?? [],
        gender: options.gender ?? null,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data)) return null;

    return data.map(mapPythonProduct);
  } catch {
    if (__DEV__) console.log('[feedService] Python service unavailable, using fallback');
    return null;
  }
}

export const feedService = {
  async determineFeedType(userId: string | null): Promise<FeedType> {
    if (!userId) return 'cold_start';

    try {
      const hasHistory = await interactionService.hasInteractionHistory(userId);
      if (hasHistory) return 'behavioral';

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

  async getUserGender(userId: string): Promise<string | null> {
    try {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('gender')
        .eq('user_id', userId)
        .single();

      if (prefs?.gender) return prefs.gender;

      const { data: profile } = await supabase
        .from('users')
        .select('gender')
        .eq('id', userId)
        .single();

      if (profile?.gender) {
        const genderMap: Record<string, string> = { woman: 'women', man: 'men' };
        return genderMap[profile.gender] || null;
      }
    } catch {}
    return null;
  },

  async getColdStartFeed(options: FeedOptions = {}): Promise<Product[]> {
    const { limit = DEFAULT_LIMIT, offset = 0, excludeIds = [], gender } = options;

    const fetched = await getProducts({
      limit: Math.max(limit + excludeIds.length + 100, 150),
      offset: 0,
      gender,
      orderBy: ['is_featured', 'created_at'],
      orderAsc: [false, false],
    });

    let products = applyExcludeFilter(fetched, excludeIds);
    products = applyBrandDiversityCap(products);
    const page = paginate(products, limit, offset);
    if (page.length === 0 && offset === 0) {
      return this.getUnfilteredFallbackFeed({ limit, offset, gender });
    }
    return page;
  },

  /** Fallback when main feed is empty: no exclusions, but still respect user gender (men/unisex or women/unisex). */
  async getUnfilteredFallbackFeed(options: FeedOptions = {}): Promise<Product[]> {
    const { limit = DEFAULT_LIMIT, offset = 0, gender } = options;
    const fetched = await getProducts({
      limit: limit + offset + 50,
      offset: 0,
      gender,
      orderBy: ['is_featured', 'created_at'],
      orderAsc: [false, false],
    });
    const products = applyBrandDiversityCap(fetched);
    return paginate(products, limit, offset);
  },

  async getPreferenceFeed(prefs: UserPreferences, options: FeedOptions = {}): Promise<Product[]> {
    const { limit = DEFAULT_LIMIT, offset = 0, excludeIds = [], gender } = options;

    // Try Python service first (uses server-side scoring + CLIP). Must pass real user_id so the service can load user_preferences.
    if (PYTHON_SERVICE_URL && prefs.user_id) {
      const pythonResults = await callPythonPersonalizedFeed(prefs.user_id, {
        ...options,
        gender: gender || prefs.gender || undefined,
      });
      if (pythonResults && pythonResults.length > 0) {
        return pythonResults;
      }
    }

    const fetched = await getProducts({
      limit: 200,
      offset: 0,
      gender: gender || prefs.gender || undefined,
      excludeIds,
    });

    const scored = fetched.map((p) => ({
      product: p,
      score: scoreByPreferences(p, prefs) + Math.random() * 0.5,
    }));

    scored.sort((a, b) => b.score - a.score);

    let result = scored.map((s) => s.product);
    result = applyBrandDiversityCap(result);
    return paginate(result, limit, offset);
  },

  async getBehavioralFeed(
    userId: string,
    prefs: UserPreferences | null,
    options: FeedOptions = {}
  ): Promise<Product[]> {
    const { limit = DEFAULT_LIMIT, offset = 0, excludeIds = [], gender } = options;

    // Try Python service first (uses CLIP embeddings for anchor similarity)
    const pythonResults = await callPythonPersonalizedFeed(userId, {
      limit,
      offset,
      excludeIds,
      gender: gender || prefs?.gender || undefined,
    });

    if (pythonResults && pythonResults.length > 0) {
      if (__DEV__) console.log('[feedService] Using Python behavioral feed:', pythonResults.length, 'items');
      return pythonResults;
    }

    // Local fallback
    if (__DEV__) console.log('[feedService] Falling back to local behavioral scoring');

    const interactionScores = await interactionService.getInteractionScores(userId);

    const anchorIds = Object.entries(interactionScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const anchors = await getProductsByIds(anchorIds);

    const fetched = await getProducts({
      limit: 200,
      offset: 0,
      gender: gender || prefs?.gender || undefined,
      excludeIds,
    });

    const scored = fetched.map((candidate) => {
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

      let prefScore = 0;
      if (prefs) {
        prefScore = scoreByPreferences(candidate, prefs);
      }

      const totalScore = 0.7 * behavioralScore + 0.3 * prefScore + Math.random() * 0.3;
      return { product: candidate, score: totalScore };
    });

    scored.sort((a, b) => b.score - a.score);

    let result = scored.map((s) => s.product);
    result = applyBrandDiversityCap(result);
    return paginate(result, limit, offset);
  },

  async loadFeed(
    userId: string | null,
    options: FeedOptions & { forceRefresh?: boolean } = {}
  ): Promise<{ products: Product[]; feedType: FeedType; fromCache: boolean }> {
    const { forceRefresh = false, ...feedOptions } = options;
    const effectiveUserId = userId || 'guest';

    // Serve from cache on first page
    if (!forceRefresh && (feedOptions.offset || 0) === 0) {
      const cache = await clientStorage.getFeedCache(effectiveUserId);
      if (cache && cache.data.length > 0) {
        if (__DEV__) console.log('[Feed] Serving from cache:', cache.data.length, 'products');
        return { products: cache.data, feedType: cache.feed_type, fromCache: true };
      }
    }

    // No "already seen" exclusions — with a small catalog that would over-restrict the feed.
    const allExcludeIds = feedOptions.excludeIds ?? [];

    const gender = userId ? await this.getUserGender(userId) : null;
    // When logged in but gender unknown, use safe default so we never show wrong gender
    const effectiveGender = feedOptions.gender || gender || (userId ? 'unisex_only' : null);

    const mergedOptions: FeedOptions = {
      ...feedOptions,
      excludeIds: allExcludeIds,
      gender: effectiveGender,
    };

    const feedType = await this.determineFeedType(userId);
    if (__DEV__) console.log('[Feed] Loading feed from API, type:', feedType);

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
          products = await this.getPreferenceFeed(prefs, mergedOptions);
        } else {
          products = await this.getColdStartFeed(mergedOptions);
        }
        break;
      }
      default:
        products = await this.getColdStartFeed(mergedOptions);
    }

    // If personalized/behavioral/preference returned empty, show something: fallback still respects gender
    const requestedOffset = (feedOptions.offset ?? 0);
    if (products.length === 0 && requestedOffset === 0) {
      if (__DEV__) console.log('[Feed] Empty result, using fallback (still gender-filtered)');
      products = await this.getUnfilteredFallbackFeed({
        limit: feedOptions.limit ?? DEFAULT_LIMIT,
        offset: 0,
        gender: mergedOptions.gender,
      });
    }

    // Cache first page only
    // Client-side gender filter: never show women's to a man (or vice versa), even if backend/cache leaked
    if (effectiveGender && effectiveGender !== 'both') {
      products = applyGenderFilter(products, effectiveGender);
    }

    if ((feedOptions.offset || 0) === 0) {
      await clientStorage.setFeedCache(effectiveUserId, products, feedType);
    }

    if (__DEV__) console.log('[Feed] API returned', products.length, 'products');
    return { products, feedType, fromCache: false };
  },
};
