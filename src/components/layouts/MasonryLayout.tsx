import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';

let LinearGradient: any = null;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {}

let Haptics: typeof import('expo-haptics') | null = null;
try { Haptics = require('expo-haptics'); } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
            <MasonryItem
              key={product.id}
              product={product}
              width={COLUMN_WIDTH}
              onPress={() => onProductPress?.(product.id)}
              onLongPress={() => onDismiss?.(product.id)}
              onLike={onLike ? () => onLike(product.id) : undefined}
              isLiked={likedIds?.has(product.id) ?? false}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

interface MasonryItemProps {
  product: Product;
  width: number;
  onPress?: () => void;
  onLongPress?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
}

function MasonryItem({ product, width, onPress, onLongPress, onLike, isLiked = false }: MasonryItemProps) {
  const [imageHeight, setImageHeight] = useState<number>(width * 1.5);
  const [imageError, setImageError] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleImageLoad = useCallback((event: any) => {
    const { width: imgWidth, height: imgHeight } = event.nativeEvent.source;
    if (imgWidth && imgHeight) {
      const aspectRatio = imgHeight / imgWidth;
      setImageHeight(width * aspectRatio);
    }
  }, [width]);

  const handleLongPress = useCallback(() => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Quick scale animation for feedback
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onLongPress?.();
  }, [onLongPress]);

  const handleLike = useCallback(() => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onLike?.();
  }, [onLike]);

  const imageUrl = product.image_urls?.[0];

  if (!imageUrl || imageError) return null;

  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price : product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={450}
        style={{
          width,
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden',
          backgroundColor: theme.colors.neutral[100],
          ...theme.shadows.sm,
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: imageHeight, resizeMode: 'cover' }}
          onLoad={handleImageLoad}
          onError={() => setImageError(true)}
        />

        {/* Discount badge */}
        {hasDiscount && (
          <View
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: theme.colors.error }}
          >
            <Text style={{ color: '#FFF', fontSize: 9, fontFamily: typography.fontFamily.sans.bold }}>
              -{discountPercent}%
            </Text>
          </View>
        )}

        {/* Like button (top right) */}
        {onLike && (
          <TouchableOpacity
            onPress={handleLike}
            className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.9)', ...theme.shadows.sm }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={15}
              color={isLiked ? theme.colors.error : theme.colors.neutral[600]}
            />
          </TouchableOpacity>
        )}

        {/* Bottom info overlay with gradient */}
        {(product.title || product.price != null) && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            {LinearGradient ? (
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)']}
                style={{ paddingHorizontal: 10, paddingTop: 24, paddingBottom: 10 }}
              >
                <ProductCardInfo product={product} displayPrice={displayPrice} hasDiscount={hasDiscount} />
              </LinearGradient>
            ) : (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingTop: 20,
                  paddingBottom: 10,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                }}
              >
                <ProductCardInfo product={product} displayPrice={displayPrice} hasDiscount={hasDiscount} />
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function ProductCardInfo({
  product,
  displayPrice,
  hasDiscount,
}: {
  product: Product;
  displayPrice: number | null | undefined;
  hasDiscount: boolean | null;
}) {
  return (
    <>
      {product.source_brand_name && (
        <Text
          className="text-white/70 mb-0.5"
          style={{
            fontFamily: typography.fontFamily.sans.medium,
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
          numberOfLines={1}
        >
          {product.source_brand_name}
        </Text>
      )}
      {product.title && (
        <Text
          className="text-white mb-0.5"
          style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 12, lineHeight: 16 }}
          numberOfLines={1}
        >
          {product.title}
        </Text>
      )}
      {displayPrice != null && (
        <View className="flex-row items-center gap-1.5">
          <Text style={{ color: '#FFF', fontSize: 13, fontFamily: typography.fontFamily.sans.bold }}>
            ₹{displayPrice.toLocaleString('en-IN')}
          </Text>
          {hasDiscount && (
            <Text
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 10,
                fontFamily: typography.fontFamily.sans.regular,
                textDecorationLine: 'line-through',
              }}
            >
              ₹{product.price.toLocaleString('en-IN')}
            </Text>
          )}
        </View>
      )}
    </>
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
