import { Product } from '../types';
import { clientStorage } from './clientStorage';
import { getProducts } from './productsApi';

const PYTHON_SERVICE_URL = process.env.EXPO_PUBLIC_PYTHON_SERVICE_URL || '';
const PYTHON_API_KEY = PYTHON_SERVICE_URL;
const SIMILAR_PRODUCTS_TIMEOUT_MS = 8000;

function normalizeProductGender(g: string | undefined | null): 'men' | 'women' | 'unisex' {
  if (g == null || !String(g).trim()) return 'unisex';
  const s = String(g).trim().toLowerCase();
  if (s === 'woman' || s === 'women' || s === 'female') return 'women';
  if (s === 'man' || s === 'men' || s === 'male') return 'men';
  return 'unisex';
}

/** Never show wrong gender: filter to men+unisex, women+unisex, or unisex-only. */
function filterByPreferredGender(products: Product[], preferredGender?: string | null): Product[] {
  if (!preferredGender || preferredGender === 'both') return products;
  const g = String(preferredGender).trim().toLowerCase();
  return products.filter((p) => {
    const pg = normalizeProductGender(p.gender);
    if (g === 'unisex_only') return pg === 'unisex';
    if (g === 'women' || g === 'woman') return pg === 'women' || pg === 'unisex';
    if (g === 'men' || g === 'man') return pg === 'men' || pg === 'unisex';
    return true;
  });
}

/**
 * Compute an attribute-based similarity score between two products.
 * Used as a fallback when the Python service is unavailable.
 */
function computeSimilarity(source: Product, candidate: Product): number {
  let score = 0;

  if (source.category === candidate.category) score += 3;
  if (source.subcategory && source.subcategory === candidate.subcategory) score += 2;

  if (source.style && candidate.style) {
    const shared = source.style.filter((s) =>
      candidate.style!.some((cs) => cs.toLowerCase() === s.toLowerCase())
    );
    score += shared.length * 2;
  }

  if (source.colors && candidate.colors) {
    const shared = source.colors.filter((c) =>
      candidate.colors.some((cc) => cc.toLowerCase() === c.toLowerCase())
    );
    score += shared.length * 1.5;
  }

  if (
    source.attributes?.pattern &&
    candidate.attributes?.pattern &&
    source.attributes.pattern.toLowerCase() === candidate.attributes.pattern.toLowerCase()
  ) {
    score += 1.5;
  }

  if (source.gender === candidate.gender || candidate.gender === 'unisex') {
    score += 1;
  }

  if (source.occasion && candidate.occasion) {
    const shared = source.occasion.filter((o) =>
      candidate.occasion!.some((co) => co.toLowerCase() === o.toLowerCase())
    );
    score += shared.length * 0.5;
  }

  const priceRatio = Math.min(source.price, candidate.price) / Math.max(source.price, candidate.price);
  if (priceRatio > 0.5) score += priceRatio;

  return score;
}

/**
 * Call the Python recommendation service /similar-products endpoint.
 * Returns null on failure so callers can fall back gracefully.
 * preferredGender: viewer's gender (men/women/both) so "More Like This" matches the user.
 */
async function callPythonSimilarProducts(
  productId: string,
  limit: number,
  excludeIds: string[],
  preferredGender?: string | null
): Promise<Product[] | null> {
  if (!PYTHON_SERVICE_URL) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SIMILAR_PRODUCTS_TIMEOUT_MS);

    const body: Record<string, unknown> = {
      product_id: productId,
      limit,
      exclude_ids: excludeIds,
    };
    if (preferredGender && preferredGender !== 'both') {
      body.preferred_gender = preferredGender; // men | women | unisex_only
    }

    const response = await fetch(`${PYTHON_SERVICE_URL}/similar-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(PYTHON_API_KEY ? { 'X-API-Key': PYTHON_API_KEY } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data)) return null;

    // Map the Python service response to the Product type
    return data.map((item: any): Product => ({
      id: item.id,
      brand_id: null,
      title: item.title || '',
      description: '',
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
      },
      image_urls: Array.isArray(item.image_urls) ? item.image_urls : [],
      embedding: null,
      is_active: true,
      source_platform: item.source_platform || undefined,
      source_brand_name: item.source_brand_name || undefined,
      affiliate_url: item.affiliate_url || undefined,
      is_featured: item.is_featured || undefined,
      created_at: item.created_at || undefined,
    }));
  } catch (e) {
    if (__DEV__) console.log('[recommendationService] Python service unavailable, using fallback');
    return null;
  }
}

export const recommendationService = {
  /**
   * Get similar products.
   * 1. Check cache.
   * 2. Try Python /similar-products (uses CLIP embeddings + metadata re-ranking, respects preferredGender).
   * 3. Fall back to local attribute-based scoring.
   */
  async getSimilarProducts(
    product: Product,
    limit: number = 12,
    excludeIds: string[] = [],
    preferredGender?: string | null
  ): Promise<Product[]> {
    const applyGender = (list: Product[]) => filterByPreferredGender(list, preferredGender);

    // Check cache first (keyed by product + gender so we don't serve wrong-gender cache)
    const cached = await clientStorage.getSimilarCache(product.id, preferredGender);
    if (cached) {
      const filtered = applyGender(cached).filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
      if (filtered.length > 0) return filtered;
    }

    // Try Python service (CLIP-powered, gender-aware)
    const pythonResults = await callPythonSimilarProducts(
      product.id,
      limit + 20,
      excludeIds,
      preferredGender
    );
    if (pythonResults && pythonResults.length >= 1) {
      const byGender = applyGender(pythonResults);
      const filtered = byGender.filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
      await clientStorage.setSimilarCache(product.id, byGender.slice(0, 20), preferredGender);
      if (__DEV__) console.log('[recommendationService] Using Python CLIP results:', filtered.length);
      return filtered;
    }

    // Local fallback: attribute-based scoring (respect gender when provided)
    if (__DEV__) console.log('[recommendationService] Falling back to local attribute scoring');
    const excludeSet = new Set([product.id, ...excludeIds]);
    const allFetched = await getProducts({
      limit: 150,
      gender: preferredGender && preferredGender !== 'both' ? preferredGender : undefined,
    });
    const allProducts = allFetched.filter((p) => !excludeSet.has(p.id));

    const scored = allProducts
      .map((candidate) => ({
        product: candidate,
        score: computeSimilarity(product, candidate),
      }))
      .sort((a, b) => b.score - a.score);

    let result = applyGender(scored.map((s) => s.product)).slice(0, limit);
    if (result.length > 0) {
      await clientStorage.setSimilarCache(product.id, result.slice(0, 20), preferredGender);
      return result;
    }

    // Nothing similar found — show something anyway: featured/newest (respect gender)
    if (__DEV__) console.log('[recommendationService] No similar products, showing featured/newest');
    const anyProducts = await getProducts({
      limit,
      excludeIds: [product.id],
      gender: preferredGender && preferredGender !== 'both' ? preferredGender : undefined,
      orderBy: ['is_featured', 'created_at'],
      orderAsc: [false, false],
    });
    return applyGender(anyProducts);
  },
};
