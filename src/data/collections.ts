import { Product } from '../types';

export interface Collection {
  id: string;
  name: string;
  description: string;
  curator: string;
  saves: number;
  coverImages: string[];
  productIds: string[];
  tags: string[];
}

// Collection definitions (productIds/coverImages filled from products at runtime)
const COLLECTION_DEFS: Omit<Collection, 'coverImages' | 'productIds'> & {
  getProductIds: (products: Product[]) => string[];
}[] = [
  {
    id: 'col-1',
    name: 'Boho Summer',
    description: 'Free-spirited looks for sunny days. Flowy fabrics, earthy tones, and effortless layering.',
    curator: '@bohochic',
    saves: 234,
    tags: ['Bohemian', 'Summer', 'Vacation'],
    getProductIds: (products) =>
      products
        .filter(
          (p) =>
            (p.style?.some((s) => ['Bohemian', 'Vacation'].includes(s)) || p.season?.includes('Summer')) ?? false
        )
        .slice(0, 20)
        .map((p) => p.id),
  },
  {
    id: 'col-2',
    name: 'Minimal Wardrobe',
    description: 'Less is more. Clean lines, neutral palettes, and timeless silhouettes.',
    curator: '@minimalist',
    saves: 567,
    tags: ['Minimal', 'Classic', 'Essentials'],
    getProductIds: (products) =>
      products
        .filter((p) => p.style?.some((s) => ['Minimal', 'Classic'].includes(s)) ?? false)
        .slice(0, 20)
        .map((p) => p.id),
  },
  {
    id: 'col-3',
    name: 'Date Night Glam',
    description: 'Turn heads with statement pieces. Bold, elegant, and unforgettable.',
    curator: '@glamqueen',
    saves: 412,
    tags: ['Party', 'Date Night', 'Glam'],
    getProductIds: (products) =>
      products
        .filter(
          (p) =>
            p.occasion?.some((o) => ['Date Night', 'Party', 'Club'].includes(o)) ?? false
        )
        .slice(0, 20)
        .map((p) => p.id),
  },
  {
    id: 'col-4',
    name: 'Office Power',
    description: 'Command the room. Polished pieces that mean business.',
    curator: '@workstyle',
    saves: 389,
    tags: ['Office', 'Formal', 'Professional'],
    getProductIds: (products) =>
      products
        .filter(
          (p) => p.occasion?.some((o) => ['Office', 'Formal'].includes(o)) ?? false
        )
        .slice(0, 20)
        .map((p) => p.id),
  },
  {
    id: 'col-5',
    name: 'Street Style Edit',
    description: 'Urban edge meets everyday cool. Oversized fits, graphic tees, and bold statements.',
    curator: '@streetvibes',
    saves: 298,
    tags: ['Street', 'Urban', 'Edgy'],
    getProductIds: (products) =>
      products
        .filter(
          (p) =>
            p.style?.some((s) => ['Street', 'Y2K', 'Edgy', 'Vintage'].includes(s)) ?? false
        )
        .slice(0, 20)
        .map((p) => p.id),
  },
  {
    id: 'col-6',
    name: 'Weekend Brunch',
    description: 'Effortlessly chic for lazy weekends. Comfortable yet put-together.',
    curator: '@weekendmood',
    saves: 176,
    tags: ['Casual', 'Brunch', 'Weekend'],
    getProductIds: (products) =>
      products
        .filter(
          (p) =>
            p.occasion?.some((o) => ['Brunch', 'Casual', 'Beach'].includes(o)) &&
            (p.style?.some((s) => ['Casual', 'Feminine', 'Trendy'].includes(s)) ?? false)
        )
        .slice(0, 20)
        .map((p) => p.id),
  },
];

/** Build COLLECTIONS with productIds and coverImages from the given products. */
export function getCollections(products: Product[]): Collection[] {
  return COLLECTION_DEFS.map((def) => {
    const productIds = def.getProductIds(products);
    const coverImages = productIds
      .map((id) => products.find((p) => p.id === id)?.image_urls?.[0])
      .filter(Boolean) as string[];
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      curator: def.curator,
      saves: def.saves,
      tags: def.tags,
      productIds,
      coverImages: coverImages.slice(0, 4),
    };
  });
}

export function getCollectionProducts(collectionId: string, products: Product[]): Product[] {
  const collection = getCollections(products).find((c) => c.id === collectionId);
  if (!collection) return [];
  return products.filter((p) => collection.productIds.includes(p.id));
}

export function getTrendingProducts(products: Product[], limit: number = 15): Product[] {
  return [...products]
    .filter((p) => p.is_active)
    .sort((a, b) => {
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

export function getCategories(products: Product[]): { name: string; count: number; icon: string }[] {
  const categoryMap = new Map<string, number>();
  products.forEach((p) => {
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

export function getFilterOptions(products: Product[]) {
  const styles = new Set<string>();
  const occasions = new Set<string>();
  const colors = new Set<string>();
  const brands = new Set<string>();

  products.forEach((p) => {
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
