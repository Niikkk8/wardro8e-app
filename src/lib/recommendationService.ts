import { Product } from '../types';
import { clientStorage } from './clientStorage';
import { getProducts } from './productsApi';

const PYTHON_SERVICE_URL = process.env.EXPO_PUBLIC_PYTHON_SERVICE_URL || '';
const SIMILAR_PRODUCTS_TIMEOUT_MS = 8000;

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
 */
async function callPythonSimilarProducts(
  productId: string,
  limit: number,
  excludeIds: string[]
): Promise<Product[] | null> {
  if (!PYTHON_SERVICE_URL) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SIMILAR_PRODUCTS_TIMEOUT_MS);

    const response = await fetch(`${PYTHON_SERVICE_URL}/similar-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, limit, exclude_ids: excludeIds }),
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
   * 2. Try Python /similar-products (uses CLIP embeddings + metadata re-ranking).
   * 3. Fall back to local attribute-based scoring.
   */
  async getSimilarProducts(
    product: Product,
    limit: number = 12,
    excludeIds: string[] = []
  ): Promise<Product[]> {
    // Check cache first
    const cached = await clientStorage.getSimilarCache(product.id);
    if (cached) {
      return cached.filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
    }

    // Try Python service (CLIP-powered)
    const pythonResults = await callPythonSimilarProducts(product.id, limit + 20, excludeIds);
    if (pythonResults && pythonResults.length >= 3) {
      const filtered = pythonResults.filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
      // Cache the full result set (up to 20) for 30 min
      await clientStorage.setSimilarCache(product.id, pythonResults.slice(0, 20));
      if (__DEV__) console.log('[recommendationService] Using Python CLIP results:', filtered.length);
      return filtered;
    }

    // Local fallback: attribute-based scoring
    if (__DEV__) console.log('[recommendationService] Falling back to local attribute scoring');
    const excludeSet = new Set([product.id, ...excludeIds]);
    const allFetched = await getProducts({ limit: 150 });
    const allProducts = allFetched.filter((p) => !excludeSet.has(p.id));

    const scored = allProducts
      .map((candidate) => ({
        product: candidate,
        score: computeSimilarity(product, candidate),
      }))
      .sort((a, b) => b.score - a.score);

    const cacheSet = scored.slice(0, 20).map((s) => s.product);
    await clientStorage.setSimilarCache(product.id, cacheSet);

    return scored.slice(0, limit).map((s) => s.product);
  },
};
