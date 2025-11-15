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

