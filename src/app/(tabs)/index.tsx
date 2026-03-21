import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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

  // Use refs to avoid stale closures in callbacks
  const lastBackgroundTime = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const productsRef = useRef<Product[]>([]);

  const userId = user?.id || null;

  // Keep ref in sync with state
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Initial load
  useEffect(() => {
    loadInitialFeed();
  }, [userId]);

  // Refresh when returning from background after 5+ min
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

      if (result.fromCache) {
        silentRefresh();
      }
    } catch (e) {
      console.error('[Home] Feed load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Use ref to compare against current products without stale closure
  const silentRefresh = useCallback(async () => {
    try {
      const result = await feedService.loadFeed(userId, {
        limit: PAGE_SIZE,
        offset: 0,
        forceRefresh: true,
      });
      // Compare against the ref (always current) to avoid stale closure
      const currentIds = productsRef.current.map((p) => p.id).join(',');
      const newIds = result.products.map((p) => p.id).join(',');
      if (newIds !== currentIds) {
        setProducts(result.products);
        setFeedType(result.feedType);
        setOffset(result.products.length);
        setHasMore(result.products.length >= PAGE_SIZE);
      }
    } catch {}
  }, [userId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await clientStorage.clearFeedCache(userId || 'guest');
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
      const currentProducts = productsRef.current;
      const result = await feedService.loadFeed(userId, {
        limit: PAGE_SIZE,
        offset: currentProducts.length,
        forceRefresh: true,
      });
      if (result.products.length === 0) {
        setHasMore(false);
      } else {
        const existingIds = new Set(currentProducts.map((p) => p.id));
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
  }, [userId, loadingMore, hasMore]);

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
    setProducts((prev) => prev.filter((p) => p.id !== productId));
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      {/* Top Navbar */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{
          borderBottomColor: theme.colors.neutral[200],
          backgroundColor: '#f8f8f8',
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

        {loadingMore && (
          <View className="py-6 items-center">
            <MasonryLayout showSkeleton skeletonCount={2} />
          </View>
        )}

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
