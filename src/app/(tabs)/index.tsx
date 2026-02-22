import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import MasonryLayout from '../../components/layouts/MasonryLayout';
import { useAuth } from '../../contexts/AuthContext';
import { feedService } from '../../lib/feedService';
import { interactionService } from '../../lib/interactionService';
import { clientStorage } from '../../lib/clientStorage';
import { Product, FeedType } from '../../types';

const PAGE_SIZE = 20;

export default function HomePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [feedType, setFeedType] = useState<FeedType>('cold_start');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const lastBackgroundTime = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const userId = user?.id || null;

  // Initial load
  useEffect(() => {
    loadInitialFeed();
  }, [userId]);

  // App state listener: refresh when returning from background after 5+ min
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [userId]);

  const handleAppStateChange = useCallback((nextState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
      const elapsed = Date.now() - lastBackgroundTime.current;
      if (elapsed > 5 * 60 * 1000) {
        silentRefresh();
      }
    }
    if (nextState.match(/inactive|background/)) {
      lastBackgroundTime.current = Date.now();
    }
    appStateRef.current = nextState;
  }, [userId]);

  const loadInitialFeed = async () => {
    setLoading(true);
    if (__DEV__) console.log('[Home] loadInitialFeed started, userId:', userId ?? 'guest');
    try {
      const result = await feedService.loadFeed(userId, { limit: PAGE_SIZE, offset: 0 });
      if (__DEV__) console.log('[Home] loadInitialFeed done:', result.products.length, 'products', result.fromCache ? '(from cache)' : '(from API)');
      setProducts(result.products);
      setFeedType(result.feedType);
      setOffset(result.products.length);
      setHasMore(result.products.length >= PAGE_SIZE);

      // If served from cache, do a silent background refresh
      if (result.fromCache) {
        silentRefresh();
      }
    } catch (e) {
      console.error('[Home] Feed load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    try {
      const result = await feedService.loadFeed(userId, {
        limit: PAGE_SIZE,
        offset: 0,
        forceRefresh: true,
      });
      // Only update if data actually differs
      if (JSON.stringify(result.products.map((p) => p.id)) !==
          JSON.stringify(products.map((p) => p.id))) {
        setProducts(result.products);
        setFeedType(result.feedType);
        setOffset(result.products.length);
        setHasMore(result.products.length >= PAGE_SIZE);
      }
    } catch {}
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (userId) {
        await clientStorage.clearFeedCache(userId);
      } else {
        await clientStorage.clearFeedCache('guest');
      }
      const result = await feedService.loadFeed(userId, {
        limit: PAGE_SIZE,
        offset: 0,
        forceRefresh: true,
      });
      setProducts(result.products);
      setFeedType(result.feedType);
      setOffset(result.products.length);
      setHasMore(result.products.length >= PAGE_SIZE);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await feedService.loadFeed(userId, {
        limit: PAGE_SIZE,
        offset,
        forceRefresh: true,
      });
      if (result.products.length === 0) {
        setHasMore(false);
      } else {
        // Dedup against existing products
        const existingIds = new Set(products.map((p) => p.id));
        const newProducts = result.products.filter((p) => !existingIds.has(p.id));
        setProducts((prev) => [...prev, ...newProducts]);
        setOffset((prev) => prev + newProducts.length);
        if (result.products.length < PAGE_SIZE) setHasMore(false);
      }
    } catch (e) {
      console.error('Load more error:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, offset, loadingMore, hasMore, products]);

  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const scrollProgress = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
      if (scrollProgress > 0.8 && !loadingMore && hasMore) {
        handleLoadMore();
      }
    },
    [handleLoadMore, loadingMore, hasMore]
  );

  const handleProductPress = useCallback((productId: string) => {
    router.push(`/product/${productId}`);
  }, []);

  const handleDismiss = useCallback(async (productId: string) => {
    // Optimistic UI: remove immediately
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    // Log dismiss interaction
    if (userId) {
      await interactionService.logInteraction(userId, productId, 'dismiss');
      await clientStorage.addSeenProductId(userId, productId);
    }
  }, [userId]);

  const feedTypeLabel: Record<FeedType, string> = {
    cold_start: 'Trending',
    preference: 'For You',
    behavioral: 'Personalized',
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Top Navbar */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{
          borderBottomColor: theme.colors.neutral[200],
          backgroundColor: '#FFFFFF',
        }}
      >
        <Text
          style={{
            ...typography.styles.logo,
            color: theme.colors.primary[500],
          }}
        >
          Wardro8e
        </Text>

        <View className="flex-row items-center gap-4">
          {!loading && (
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: theme.colors.primary[50] }}>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.medium,
                  fontSize: 10,
                  color: theme.colors.primary[600],
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {feedTypeLabel[feedType]}
              </Text>
            </View>
          )}
          <TouchableOpacity className="p-2" activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.neutral[700]} />
          </TouchableOpacity>
          <TouchableOpacity className="p-2" activeOpacity={0.7}>
            <Ionicons name="bag-outline" size={24} color={theme.colors.neutral[700]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Guest CTA */}
      {!user && !loading && (
        <TouchableOpacity
          onPress={() => router.push('/(auth)/welcome')}
          className="mx-4 mt-3 px-4 py-3 rounded-xl flex-row items-center justify-between"
          style={{ backgroundColor: theme.colors.primary[50] }}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.medium,
              fontSize: 13,
              color: theme.colors.primary[700],
            }}
          >
            Sign up to personalize your feed
          </Text>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.primary[600]} />
        </TouchableOpacity>
      )}

      {/* Feed Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        <MasonryLayout
          products={loading ? undefined : products}
          onProductPress={handleProductPress}
          onDismiss={handleDismiss}
          showSkeleton={loading}
          skeletonCount={6}
          emptyStateSubtext="Pull down to refresh"
        />

        {/* Loading more indicator */}
        {loadingMore && (
          <View className="py-6 items-center">
            <MasonryLayout showSkeleton skeletonCount={2} />
          </View>
        )}

        {/* End of feed */}
        {!hasMore && products.length > 0 && !loading && (
          <View className="py-8 items-center">
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 13,
                color: theme.colors.neutral[400],
              }}
            >
              You've seen everything for now
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
