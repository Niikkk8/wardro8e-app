import { supabase } from './supabase';
import { clientStorage } from './clientStorage';
import { interactionService } from './interactionService';
import { getProducts, getProductsByIds } from './productsApi';
import { Product, FeedType, FeedOptions, UserPreferences } from '../types';

const DEFAULT_LIMIT = 20;
const PYTHON_SERVICE_URL = process.env.EXPO_PUBLIC_PYTHON_SERVICE_URL || '';
const FEED_TIMEOUT_MS = 10000;
const EXPLORE_TIMEOUT_MS = 8000;

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

/**
 * Shuffle the top `topFraction` of a scored+sorted array, keep the rest in order.
 * Ensures relevant products still surface, but in a different order each session.
 */
function shuffleTopTier<T>(items: T[], topFraction = 0.6): T[] {
  if (items.length <= 2) return items;
  const cutoff = Math.max(2, Math.floor(items.length * topFraction));
  const top = items.slice(0, cutoff);
  const rest = items.slice(cutoff);
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]];
  }
  return [...top, ...rest];
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

// ── Explore & Trending helpers ────────────────────────────────────────────────

export interface ExploreFeedOptions {
  limit?: number;
  offset?: number;
  excludeIds?: string[];
  gender?: string | null;
  vibe?: string | null;   // Style tag filter
}

/** Diverse explore feed with category/brand diversity + serendipity. Local fallback. */
async function getLocalExploreFeed(options: ExploreFeedOptions): Promise<Product[]> {
  const { limit = 30, offset = 0, excludeIds = [], gender, vibe } = options;

  let fetched = await getProducts({
    limit: 300,
    offset: 0,
    gender: gender ?? undefined,
    orderBy: ['is_featured', 'created_at'],
    orderAsc: [false, false],
  });

  // Vibe / style filter — soft blend if not enough matches
  if (vibe && vibe !== 'All') {
    const vibeLower = vibe.toLowerCase();
    const vibeMatched = fetched.filter((p) =>
      p.style?.some((s) => s.toLowerCase() === vibeLower)
    );
    if (vibeMatched.length >= limit) {
      fetched = vibeMatched;
    } else if (vibeMatched.length >= 5) {
      const vibeIds = new Set(vibeMatched.map((p) => p.id));
      const others = fetched.filter((p) => !vibeIds.has(p.id));
      fetched = [...vibeMatched, ...others.slice(0, vibeMatched.length * 3)];
    }
  }

  // Exclude already-seen
  const excludeSet = new Set(excludeIds);
  fetched = fetched.filter((p) => !excludeSet.has(p.id));

  // Score: featured + serendipity noise
  // Low featured bonus (0.6) — trending strip handles featured items.
  // Serendipity noise (1.8) is the dominant driver for grid variety.
  const scored = fetched.map((p) => ({
    product: p,
    score:
      (p.is_featured ? 0.6 : 0) +
      Math.min((p.click_count ?? 0) * 0.12, 1.5) +
      Math.random() * 1.8,
  }));
  scored.sort((a, b) => b.score - a.score);

  // Category + brand diversity
  const catCount: Record<string, number> = {};
  const brandCount: Record<string, number> = {};
  const diverse: Product[] = [];
  const needed = limit + offset;

  for (const { product } of scored) {
    const cat = product.category || 'unknown';
    const brand = product.source_brand_name || 'unknown';
    catCount[cat] = (catCount[cat] || 0) + 1;
    brandCount[brand] = (brandCount[brand] || 0) + 1;
    if (catCount[cat] <= 4 && brandCount[brand] <= 3) {
      diverse.push(product);
    }
    if (diverse.length >= needed) break;
  }

  return diverse.slice(offset, offset + limit);
}

export const exploreService = {
  /**
   * Fetch a diverse explore feed.
   * Tries the Python /explore-feed endpoint first; falls back to local scoring.
   */
  async getExploreFeed(options: ExploreFeedOptions = {}): Promise<Product[]> {
    const { limit = 30, offset = 0, excludeIds = [], gender, vibe } = options;

    if (PYTHON_SERVICE_URL) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXPLORE_TIMEOUT_MS);

        const response = await fetch(`${PYTHON_SERVICE_URL}/explore-feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit,
            offset,
            exclude_ids: excludeIds.slice(0, 200),
            gender: gender ?? null,
            vibe: vibe ?? null,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.map(mapPythonProduct);
          }
        }
      } catch {
        if (__DEV__) console.log('[exploreService] Python service unavailable, using local fallback');
      }
    }

    return getLocalExploreFeed(options);
  },

  /**
   * Fetch trending products for the trending strip.
   * Tries Python /trending; falls back to Supabase featured + click_count query.
   */
  async getTrendingProducts(gender?: string | null, limit = 12): Promise<Product[]> {
    if (PYTHON_SERVICE_URL) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXPLORE_TIMEOUT_MS);

        const response = await fetch(`${PYTHON_SERVICE_URL}/trending`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit, gender: gender ?? null }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.map(mapPythonProduct);
          }
        }
      } catch {
        if (__DEV__) console.log('[exploreService] Trending fallback to local');
      }
    }

    // Local fallback: featured first, then by click_count
    const fetched = await getProducts({
      limit: 80,
      gender: gender ?? undefined,
      orderBy: ['is_featured', 'created_at'],
      orderAsc: [false, false],
    });

    // Brand diversity: max 2 per brand
    const brandCount: Record<string, number> = {};
    const result: Product[] = [];
    for (const p of fetched) {
      const brand = p.source_brand_name || 'unknown';
      brandCount[brand] = (brandCount[brand] || 0) + 1;
      if (brandCount[brand] <= 2) result.push(p);
      if (result.length >= limit) break;
    }
    return result;
  },
};

// ── Main feed service ─────────────────────────────────────────────────────────

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

    // Shuffle non-featured products so cold-start users don't see the same
    // "newest" items on every session. Featured products still surface first.
    const featured = products.filter((p) => p.is_featured);
    const rest = products.filter((p) => !p.is_featured);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    products = [...featured, ...rest];

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
      // Noise up to 4.0 — wide enough to reorder within the relevant tier each session
      score: scoreByPreferences(p, prefs) + Math.random() * 4.0,
    }));

    scored.sort((a, b) => b.score - a.score);

    // Shuffle top 60% so relevant products surface in a different order each session
    let result = shuffleTopTier(scored.map((s) => s.product), 0.6);
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

      // Noise at 3.0: meaningful randomness relative to behavioral score range
      const totalScore = 0.7 * behavioralScore + 0.3 * prefScore + Math.random() * 3.0;
      return { product: candidate, score: totalScore };
    });

    scored.sort((a, b) => b.score - a.score);

    // Shuffle top 60% for session variety
    let result = shuffleTopTier(scored.map((s) => s.product), 0.6);
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

    // Parallel fetch: gender, feed type determination, and preferences all at once.
    // This saves 1-2 sequential Supabase round trips on every feed load.
    const [gender, feedType, prefs] = await Promise.all([
      userId ? this.getUserGender(userId) : Promise.resolve(null),
      this.determineFeedType(userId),
      userId ? this.getUserPreferences(userId) : Promise.resolve(null),
    ]);

    // When logged in but gender unknown, use safe default so we never show wrong gender
    const effectiveGender = feedOptions.gender || gender || (userId ? 'unisex_only' : null);

    const mergedOptions: FeedOptions = {
      ...feedOptions,
      excludeIds: allExcludeIds,
      gender: effectiveGender,
    };

    if (__DEV__) console.log('[Feed] Loading feed from API, type:', feedType);

    let products: Product[];

    switch (feedType) {
      case 'behavioral': {
        products = await this.getBehavioralFeed(userId!, prefs, mergedOptions);
        break;
      }
      case 'preference': {
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
