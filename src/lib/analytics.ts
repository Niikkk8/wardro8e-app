import PostHog from 'posthog-react-native';
import { FeedType } from '../types';

const client = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '', {
  host: 'https://us.i.posthog.com',
});

export const analytics = {
  /** Call once when the user is identified (after auth resolves). */
  identify(userId: string): void {
    client.identify(userId);
  },

  /** Fired once per app launch. feed_type comes from feedService.determineFeedType. */
  appOpened(feedType: FeedType): void {
    client.capture('app_opened', { feed_type: feedType });
  },

  /** Fired in product/[id].tsx after product data resolves. */
  productViewed(props: {
    product_id: string;
    category: string;
    gender: string;
    price: number;
    source_platform: string;
  }): void {
    client.capture('product_viewed', props);
  },

  /** Fired in WardrobeContext.toggleFavourite when adding a favourite. */
  productLiked(props: {
    product_id: string;
    category: string;
    style_tags: string[];
  }): void {
    client.capture('product_liked', props);
  },

  /** Fired when addProductToCollection succeeds. */
  productSaved(props: {
    product_id: string;
    collection_id: string;
  }): void {
    client.capture('product_saved', props);
  },

  /** Fired when the Buy button opens an affiliate URL. */
  affiliateTapped(props: {
    product_id: string;
    affiliate_url: string;
    price: number;
  }): void {
    client.capture('affiliate_tapped', props);
  },

  /** Fired at the end of style-quiz.tsx, whether completed or skipped. */
  quizCompleted(props: {
    styles_selected: string[];
    skipped: boolean;
  }): void {
    client.capture('quiz_completed', props);
  },

  /** Fired once per session when the user first lands on the tabs. */
  sessionStarted(userId: string): void {
    client.capture('session_started', { user_id: userId });
  },
};
