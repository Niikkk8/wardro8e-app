export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  gender?: 'woman' | 'man' | 'non-binary' | 'prefer_not_to_say';
  birthday?: string;
  onboarding_completed: boolean;
  style_quiz_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  gender?: 'men' | 'women' | 'both' | null;
  style_tags: string[];
  favorite_colors: string[];
  pattern_preferences: string[];
  size_preferences: {
    tops?: string;
    bottoms?: string;
    footwear?: string;
  };
  price_range: {
    min: number;
    max: number;
  };
  quiz_skipped?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StyleQuizData {
  styles: string[];
  colors: string[];
  patterns: string[];
  sizes?: {
    tops?: string;
    bottoms?: string;
    footwear?: string;
  };
  brands?: string[];
}

export interface Product {
  id: string;
  brand_id?: string | null;
  title: string;
  description: string;
  price: number;
  sale_price?: number | null;
  category: string;
  subcategory?: string | null;
  gender: 'men' | 'women' | 'unisex' | 'kids';
  colors: string[];
  size_range: string[];
  fit_type?: string;
  style?: string[];
  occasion?: string[];
  season?: string[];
  attributes: {
    pattern?: string;
    materials?: string[];
    sleeve_type?: string;
    neck_type?: string;
    length?: string;
    waist_type?: string;
    closure_type?: string;
    care_instructions?: string[];
  };
  image_urls: string[];
  embedding?: number[] | null;
  stock_quantity?: number;
  is_active: boolean;
  source_platform?: string;
  source_brand_name?: string;
  affiliate_url?: string;
  images_are_external?: boolean;
  is_featured?: boolean;
  click_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type InteractionType = 'view' | 'like' | 'save' | 'purchase' | 'dismiss';

export type FeedType = 'cold_start' | 'preference' | 'behavioral';

export interface StyleCounter {
  style_scores: Record<string, number>;
  color_scores: Record<string, number>;
  pattern_scores: Record<string, number>;
  last_synced_at: string;
}

export interface FeedCache {
  data: Product[];
  cached_at: string;
  feed_type: FeedType;
}

export interface FeedOptions {
  limit?: number;
  offset?: number;
  excludeIds?: string[];
  gender?: string | null;
}

export const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  purchase: 1.0,
  save: 0.7,
  like: 0.5,
  view: 0.2,
  dismiss: -0.3,
};

