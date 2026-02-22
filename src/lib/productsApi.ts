import { supabase } from './supabase';
import { Product } from '../types';

/** Supabase products row shape (snake_case) */
interface ProductRow {
  id: string;
  brand_id?: string | null;
  title: string;
  description?: string | null;
  price: number;
  sale_price?: number | null;
  category: string;
  subcategory?: string | null;
  attributes?: Record<string, unknown> | null;
  image_urls?: string[] | null;
  embedding?: number[] | null;
  stock_quantity?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  source_platform?: string | null;
  source_brand_name?: string | null;
  affiliate_url?: string | null;
  images_are_external?: boolean | null;
  is_featured?: boolean | null;
  click_count?: number | null;
  gender?: string | null;
  colors?: string[] | null;
  size_range?: string[] | null;
  fit_type?: string | null;
  style?: string[] | null;
  occasion?: string[] | null;
  season?: string[] | null;
}

function mapRow(row: ProductRow): Product {
  const attrs = (row.attributes as Product['attributes']) || {};
  return {
    id: row.id,
    brand_id: row.brand_id ?? null,
    title: row.title,
    description: row.description ?? '',
    price: Number(row.price),
    sale_price: row.sale_price != null ? Number(row.sale_price) : null,
    category: row.category ?? '',
    subcategory: row.subcategory ?? null,
    gender: (row.gender as Product['gender']) ?? 'unisex',
    colors: Array.isArray(row.colors) ? row.colors : [],
    size_range: Array.isArray(row.size_range) ? row.size_range : [],
    fit_type: row.fit_type ?? undefined,
    style: Array.isArray(row.style) ? row.style : undefined,
    occasion: Array.isArray(row.occasion) ? row.occasion : undefined,
    season: Array.isArray(row.season) ? row.season : undefined,
    attributes: {
      pattern: attrs.pattern ?? undefined,
      materials: attrs.materials ?? undefined,
      sleeve_type: attrs.sleeve_type ?? undefined,
      neck_type: attrs.neck_type ?? undefined,
      length: attrs.length ?? undefined,
      waist_type: attrs.waist_type ?? undefined,
      closure_type: attrs.closure_type ?? undefined,
      care_instructions: attrs.care_instructions ?? undefined,
    },
    image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
    embedding: row.embedding ?? null,
    stock_quantity: row.stock_quantity ?? undefined,
    is_active: row.is_active ?? true,
    source_platform: row.source_platform ?? undefined,
    source_brand_name: row.source_brand_name ?? undefined,
    affiliate_url: row.affiliate_url ?? undefined,
    images_are_external: row.images_are_external ?? undefined,
    is_featured: row.is_featured ?? undefined,
    click_count: row.click_count ?? undefined,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

export interface GetProductsOptions {
  limit?: number;
  offset?: number;
  /** Exclude these product IDs */
  excludeIds?: string[];
  /** Filter by gender (applied in DB: women -> women+unisex, men -> men+unisex) */
  gender?: string | null;
  /** Only active products */
  is_active?: boolean;
  /** Fetch specific IDs (ignores other filters except is_active) */
  ids?: string[];
  /** Category filter */
  category?: string;
  /** Order by (first wins; use array for multiple, e.g. ['is_featured', 'created_at']) */
  orderBy?: 'created_at' | 'price' | 'title' | 'is_featured' | string | string[];
  orderAsc?: boolean | boolean[];
}

/**
 * Fetch products from Supabase `products` table.
 */
export async function getProducts(options: GetProductsOptions = {}): Promise<Product[]> {
  const {
    limit = 50,
    offset = 0,
    excludeIds = [],
    gender,
    is_active = true,
    ids,
    category,
    orderBy = 'created_at',
    orderAsc = false,
  } = options;

  if (__DEV__) {
    console.log('[productsApi] getProducts called', { limit, offset, gender: gender ?? null, is_active });
  }

  let query = supabase.from('products').select('*');

  if (is_active === true) {
    // Include rows where is_active is true or null (e.g. legacy rows)
    query = query.or('is_active.eq.true,is_active.is.null');
  } else if (is_active === false) {
    query = query.eq('is_active', false);
  }

  if (ids && ids.length > 0) {
    query = query.in('id', ids);
  } else {
    if (category) query = query.eq('category', category);
    if (gender && gender !== 'both') {
      const g = gender.toLowerCase();
      if (g === 'women' || g === 'woman') {
        query = query.or('gender.eq.women,gender.eq.unisex');
      } else if (g === 'men' || g === 'man') {
        query = query.or('gender.eq.men,gender.eq.unisex');
      }
    }
  }

  const orderByArr = Array.isArray(orderBy) ? orderBy : [orderBy];
  const orderAscArr = Array.isArray(orderAsc)
    ? orderAsc
    : orderByArr.map(() => orderAsc);
  for (let i = 0; i < orderByArr.length; i++) {
    query = query.order(orderByArr[i], { ascending: orderAscArr[i] });
  }
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error(
      '[productsApi.getProducts] ERROR',
      error.code || 'error',
      error.message,
      error.details ? JSON.stringify(error.details) : ''
    );
    return [];
  }

  let products = (data || []).map((row) => mapRow(row as ProductRow));
  if (__DEV__) {
    console.log('[productsApi] getProducts success:', products.length, 'rows');
  }

  if (excludeIds.length > 0 && !ids) {
    const excludeSet = new Set(excludeIds);
    products = products.filter((p) => !excludeSet.has(p.id));
  }

  return products;
}

/**
 * Fetch a single product by ID.
 */
export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapRow(data as ProductRow);
}

/**
 * Fetch products by IDs, preserving order of ids where possible.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const products = await getProducts({ ids, is_active: undefined });
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
}
