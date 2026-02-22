import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Text,
  Animated,
} from 'react-native';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / COLUMN_COUNT;

interface MasonryLayoutProps {
  products?: Product[];
  onProductPress?: (productId: string) => void;
  onDismiss?: (productId: string) => void;
  excludeProductId?: string;
  showSkeleton?: boolean;
  skeletonCount?: number;
  /** Shown below "No products found" when products list is empty */
  emptyStateSubtext?: string;
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
  excludeProductId,
  showSkeleton = false,
  skeletonCount = 6,
  emptyStateSubtext,
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
        <Text className="text-neutral-600 text-base">No products found</Text>
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
}

function MasonryItem({ product, width, onPress, onLongPress }: MasonryItemProps) {
  const [imageHeight, setImageHeight] = useState<number>(width * 1.5);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback((event: any) => {
    const { width: imgWidth, height: imgHeight } = event.nativeEvent.source;
    if (imgWidth && imgHeight) {
      const aspectRatio = imgHeight / imgWidth;
      setImageHeight(width * aspectRatio);
    }
  }, [width]);

  const imageUrl = product.image_urls?.[0];

  if (!imageUrl || imageError) {
    return null;
  }

  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price : product.price;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
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
        style={{
          width: '100%',
          height: imageHeight,
          resizeMode: 'cover',
        }}
        onLoad={handleImageLoad}
        onError={() => setImageError(true)}
      />

      {(product.title || product.price) && (
        <View
          className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
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
              className="text-white text-xs font-sans-medium mb-0.5"
              numberOfLines={1}
            >
              {product.title}
            </Text>
          )}
          {displayPrice != null && (
            <View className="flex-row items-center gap-1.5">
              <Text className="text-white text-xs font-sans-semibold">
                ₹{displayPrice.toLocaleString('en-IN')}
              </Text>
              {hasDiscount && (
                <Text
                  className="text-white/50 line-through"
                  style={{ fontSize: 10 }}
                >
                  ₹{product.price.toLocaleString('en-IN')}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

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
            return (
              <SkeletonCard key={idx} width={COLUMN_WIDTH} height={height} />
            );
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
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
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
