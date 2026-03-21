import React from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Product } from '../../types';
import ProductCard from '../ui/ProductCard';

const { width: SCREEN_WIDTH } = require('react-native').Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / COLUMN_COUNT;

interface MasonryLayoutProps {
  products?: Product[];
  onProductPress?: (productId: string) => void;
  onDismiss?: (productId: string) => void;
  onLike?: (productId: string) => void;
  excludeProductId?: string;
  showSkeleton?: boolean;
  skeletonCount?: number;
  emptyStateSubtext?: string;
  likedIds?: Set<string>;
}

function distributeIntoColumns(items: Product[]): Product[][] {
  const columns: Product[][] = [[], []];
  const heights = [0, 0];

  items.forEach((item) => {
    const estimatedHeight = COLUMN_WIDTH * (1.2 + ((parseInt(item.id, 36) || 0) % 8) * 0.1);
    const shorterColumnIndex = heights[0] <= heights[1] ? 0 : 1;
    columns[shorterColumnIndex].push(item);
    heights[shorterColumnIndex] += estimatedHeight + GAP;
  });

  return columns;
}

export default function MasonryLayout({
  products: externalProducts,
  onProductPress,
  onDismiss,
  onLike,
  excludeProductId,
  showSkeleton = false,
  skeletonCount = 6,
  emptyStateSubtext,
  likedIds,
}: MasonryLayoutProps) {
  const products = externalProducts
    ? (excludeProductId ? externalProducts.filter((p) => p.id !== excludeProductId) : externalProducts)
    : [];

  if (showSkeleton) {
    return <SkeletonGrid count={skeletonCount} />;
  }

  if (products.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-6">
        <Ionicons name="search-outline" size={40} color={theme.colors.neutral[300]} />
        <Text className="text-neutral-600 text-base mt-3">No products found</Text>
        {emptyStateSubtext ? (
          <Text className="text-neutral-400 text-sm mt-2 text-center">{emptyStateSubtext}</Text>
        ) : null}
      </View>
    );
  }

  const columns = distributeIntoColumns(products);

  return (
    <View className="flex-row" style={{ gap: GAP }}>
      {columns.map((column, columnIndex) => (
        <View key={columnIndex} style={{ width: COLUMN_WIDTH, gap: GAP }}>
          {column.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              width={COLUMN_WIDTH}
              onPress={() => onProductPress?.(product.id)}
              onLongPress={onDismiss ? () => onDismiss(product.id) : undefined}
              onLike={onLike ? () => onLike(product.id) : undefined}
              isLiked={likedIds?.has(product.id) ?? false}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid({ count }: { count: number }) {
  const columns: number[][] = [[], []];
  for (let i = 0; i < count; i++) {
    const shorter = columns[0].length <= columns[1].length ? 0 : 1;
    columns[shorter].push(i);
  }

  return (
    <View className="flex-row" style={{ gap: GAP }}>
      {columns.map((col, colIdx) => (
        <View key={colIdx} style={{ width: COLUMN_WIDTH, gap: GAP }}>
          {col.map((idx) => {
            const height = COLUMN_WIDTH * (1.2 + (idx % 4) * 0.15);
            return <SkeletonCard key={idx} width={COLUMN_WIDTH} height={height} />;
          })}
        </View>
      ))}
    </View>
  );
}

function SkeletonCard({ width, height }: { width: number; height: number }) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.neutral[200],
        opacity,
      }}
    />
  );
}
