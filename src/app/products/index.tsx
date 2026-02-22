import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';
import { getProducts } from '../../lib/productsApi';
import MasonryLayout from '../../components/layouts/MasonryLayout';

const PAGE_SIZE = 30;

export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (pageOffset: number, append: boolean) => {
    const result = await getProducts({
      limit: PAGE_SIZE,
      offset: pageOffset,
      orderBy: 'created_at',
      orderAsc: false,
    });
    if (append) {
      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnes = result.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newOnes];
      });
    } else {
      setProducts(result);
    }
    setOffset(pageOffset + result.length);
    setHasMore(result.length >= PAGE_SIZE);
    return result.length;
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await loadPage(0, false);
    setLoading(false);
  }, [loadPage]);

  useEffect(() => {
    loadInitial();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    await loadPage(0, false);
    setRefreshing(false);
  }, [loadPage]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPage(offset, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, offset, loadPage]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const padding = 200;
      if (contentSize.height - layoutMeasurement.height - contentOffset.y < padding && hasMore && !loadingMore) {
        handleLoadMore();
      }
    },
    [hasMore, loadingMore, handleLoadMore]
  );

  if (loading && products.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-row items-center px-4 py-3 border-b" style={{ borderBottomColor: theme.colors.neutral[200] }}>
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 18, color: theme.colors.neutral[900], marginLeft: 8 }}>
            All Products
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderBottomColor: theme.colors.neutral[200] }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.neutral[900]} />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily: typography.fontFamily.serif.medium,
            fontSize: 18,
            color: theme.colors.neutral[900],
            marginLeft: 8,
          }}
        >
          All Products
        </Text>
      </View>

      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary[500]]} />
        }
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <MasonryLayout
          products={products}
          onProductPress={(id) => router.push(`/product/${id}`)}
          emptyStateSubtext="Pull down to refresh"
        />
        {loadingMore && (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          </View>
        )}
        {!hasMore && products.length > 0 && (
          <View className="py-6 items-center">
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 13,
                color: theme.colors.neutral[500],
              }}
            >
              You've seen all products
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
