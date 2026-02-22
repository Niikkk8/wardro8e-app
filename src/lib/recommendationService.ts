import { Product } from '../types';
import { clientStorage } from './clientStorage';
import { getProducts } from './productsApi';

/**
 * Compute an attribute-based similarity score between two products.
 * Used as a fallback when CLIP embeddings aren't available.
 */
function computeSimilarity(source: Product, candidate: Product): number {
  let score = 0;

  // Same category
  if (source.category === candidate.category) score += 3;
  if (source.subcategory && source.subcategory === candidate.subcategory) score += 2;

  // Shared styles
  if (source.style && candidate.style) {
    const shared = source.style.filter((s) =>
      candidate.style!.some((cs) => cs.toLowerCase() === s.toLowerCase())
    );
    score += shared.length * 2;
  }

  // Shared colors
  if (source.colors && candidate.colors) {
    const shared = source.colors.filter((c) =>
      candidate.colors.some((cc) => cc.toLowerCase() === c.toLowerCase())
    );
    score += shared.length * 1.5;
  }

  // Same pattern
  if (
    source.attributes?.pattern &&
    candidate.attributes?.pattern &&
    source.attributes.pattern.toLowerCase() === candidate.attributes.pattern.toLowerCase()
  ) {
    score += 1.5;
  }

  // Gender compatibility
  if (source.gender === candidate.gender || candidate.gender === 'unisex') {
    score += 1;
  }

  // Shared occasions
  if (source.occasion && candidate.occasion) {
    const shared = source.occasion.filter((o) =>
      candidate.occasion!.some((co) => co.toLowerCase() === o.toLowerCase())
    );
    score += shared.length * 0.5;
  }

  // Price proximity bonus (products in similar price range)
  const priceRatio = Math.min(source.price, candidate.price) / Math.max(source.price, candidate.price);
  if (priceRatio > 0.5) score += priceRatio;

  return score;
}

export const recommendationService = {
  /**
   * Get similar products based on attribute matching.
   * Checks cache first, computes if not cached.
   */
  async getSimilarProducts(
    product: Product,
    limit: number = 12,
    excludeIds: string[] = []
  ): Promise<Product[]> {
    // Check cache
    const cached = await clientStorage.getSimilarCache(product.id);
    if (cached) {
      return cached.filter((p) => !excludeIds.includes(p.id)).slice(0, limit);
    }

    const excludeSet = new Set([product.id, ...excludeIds]);
    const allFetched = await getProducts({ limit: 150 });
    const allProducts = allFetched.filter((p) => !excludeSet.has(p.id));

    const scored = allProducts
      .map((candidate) => ({
        product: candidate,
        score: computeSimilarity(product, candidate),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.product);

    const allScored = allProducts
      .map((candidate) => ({
        product: candidate,
        score: computeSimilarity(product, candidate),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((s) => s.product);

    await clientStorage.setSimilarCache(product.id, allScored);

    return scored;
  },
};
