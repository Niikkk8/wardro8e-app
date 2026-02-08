import { Product } from '../types';
import { STATIC_PRODUCTS } from './staticProducts';

export interface Collection {
  id: string;
  name: string;
  description: string;
  curator: string;
  saves: number;
  coverImages: string[]; // Up to 4 images for the grid preview
  productIds: string[];
  tags: string[];
}

// Helper to get products matching a filter
function getProductsByFilter(
  filterFn: (p: Product) => boolean,
  limit?: number
): Product[] {
  const filtered = STATIC_PRODUCTS.filter(filterFn);
  return limit ? filtered.slice(0, limit) : filtered;
}

// Curated collections built from static product data
export const COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    name: 'Boho Summer',
    description: 'Free-spirited looks for sunny days. Flowy fabrics, earthy tones, and effortless layering.',
    curator: '@bohochic',
    saves: 234,
    ...(() => {
      const products = getProductsByFilter(
        (p) =>
          (p.style?.some((s) => ['Bohemian', 'Vacation'].includes(s)) ||
            p.season?.includes('Summer')) ??
          false,
        20
      );
      return {
        coverImages: products.slice(0, 4).map((p) => p.image_urls[0]).filter(Boolean),
        productIds: products.map((p) => p.id),
        tags: ['Bohemian', 'Summer', 'Vacation'],
      };
    })(),
  },
  {
    id: 'col-2',
    name: 'Minimal Wardrobe',
    description: 'Less is more. Clean lines, neutral palettes, and timeless silhouettes.',
    curator: '@minimalist',
    saves: 567,
    ...(() => {
      const products = getProductsByFilter(
        (p) => p.style?.some((s) => ['Minimal', 'Classic'].includes(s)) ?? false,
        20
      );
      return {
        coverImages: products.slice(0, 4).map((p) => p.image_urls[0]).filter(Boolean),
        productIds: products.map((p) => p.id),
        tags: ['Minimal', 'Classic', 'Essentials'],
      };
    })(),
  },
  {
    id: 'col-3',
    name: 'Date Night Glam',
    description: 'Turn heads with statement pieces. Bold, elegant, and unforgettable.',
    curator: '@glamqueen',
    saves: 412,
    ...(() => {
      const products = getProductsByFilter(
        (p) =>
          p.occasion?.some((o) => ['Date Night', 'Party', 'Club'].includes(o)) ?? false,
        20
      );
      return {
        coverImages: products.slice(0, 4).map((p) => p.image_urls[0]).filter(Boolean),
        productIds: products.map((p) => p.id),
        tags: ['Party', 'Date Night', 'Glam'],
      };
    })(),
  },
  {
    id: 'col-4',
    name: 'Office Power',
    description: 'Command the room. Polished pieces that mean business.',
    curator: '@workstyle',
    saves: 389,
    ...(() => {
      const products = getProductsByFilter(
        (p) =>
          p.occasion?.some((o) => ['Office', 'Formal'].includes(o)) ?? false,
        20
      );
      return {
        coverImages: products.slice(0, 4).map((p) => p.image_urls[0]).filter(Boolean),
        productIds: products.map((p) => p.id),
        tags: ['Office', 'Formal', 'Professional'],
      };
    })(),
  },
  {
    id: 'col-5',
    name: 'Street Style Edit',
    description: 'Urban edge meets everyday cool. Oversized fits, graphic tees, and bold statements.',
    curator: '@streetvibes',
    saves: 298,
    ...(() => {
      const products = getProductsByFilter(
        (p) =>
          p.style?.some((s) => ['Street', 'Y2K', 'Edgy', 'Vintage'].includes(s)) ?? false,
        20
      );
      return {
        coverImages: products.slice(0, 4).map((p) => p.image_urls[0]).filter(Boolean),
        productIds: products.map((p) => p.id),
        tags: ['Street', 'Urban', 'Edgy'],
      };
    })(),
  },
  {
    id: 'col-6',
    name: 'Weekend Brunch',
    description: 'Effortlessly chic for lazy weekends. Comfortable yet put-together.',
    curator: '@weekendmood',
    saves: 176,
    ...(() => {
      const products = getProductsByFilter(
        (p) =>
          p.occasion?.some((o) => ['Brunch', 'Casual', 'Beach'].includes(o)) &&
          (p.style?.some((s) => ['Casual', 'Feminine', 'Trendy'].includes(s)) ?? false),
        20
      );
      return {
        coverImages: products.slice(0, 4).map((p) => p.image_urls[0]).filter(Boolean),
        productIds: products.map((p) => p.id),
        tags: ['Casual', 'Brunch', 'Weekend'],
      };
    })(),
  },
];

// Get products for a collection
export function getCollectionProducts(collectionId: string): Product[] {
  const collection = COLLECTIONS.find((c) => c.id === collectionId);
  if (!collection) return [];
  return STATIC_PRODUCTS.filter((p) => collection.productIds.includes(p.id));
}

// Get trending products (featured, has sale, or high click count)
export function getTrendingProducts(limit: number = 15): Product[] {
  return [...STATIC_PRODUCTS]
    .filter((p) => p.is_active)
    .sort((a, b) => {
      // Prioritize: featured > has sale > click count
      const aScore =
        (a.is_featured ? 100 : 0) +
        (a.sale_price && a.sale_price < a.price ? 50 : 0) +
        (a.click_count || 0);
      const bScore =
        (b.is_featured ? 100 : 0) +
        (b.sale_price && b.sale_price < b.price ? 50 : 0) +
        (b.click_count || 0);
      return bScore - aScore;
    })
    .slice(0, limit);
}

// Get unique categories from products
export function getCategories(): { name: string; count: number; icon: string }[] {
  const categoryMap = new Map<string, number>();
  STATIC_PRODUCTS.forEach((p) => {
    categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
  });

  const iconMap: Record<string, string> = {
    tops: 'shirt-outline',
    dresses: 'flower-outline',
    bottoms: 'resize-outline',
    outerwear: 'snow-outline',
  };

  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    name,
    count,
    icon: iconMap[name] || 'pricetag-outline',
  }));
}

// Get all unique filter values
export function getFilterOptions() {
  const styles = new Set<string>();
  const occasions = new Set<string>();
  const colors = new Set<string>();
  const brands = new Set<string>();

  STATIC_PRODUCTS.forEach((p) => {
    p.style?.forEach((s) => styles.add(s));
    p.occasion?.forEach((o) => occasions.add(o));
    p.colors?.forEach((c) => colors.add(c));
    if (p.source_brand_name) brands.add(p.source_brand_name);
  });

  return {
    styles: Array.from(styles).sort(),
    occasions: Array.from(occasions).sort(),
    colors: Array.from(colors).sort(),
    brands: Array.from(brands).sort(),
    categories: ['tops', 'dresses', 'bottoms', 'outerwear'],
    genders: ['women', 'men', 'unisex'] as const,
  };
}
