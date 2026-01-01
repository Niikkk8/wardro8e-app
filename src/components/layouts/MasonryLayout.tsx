import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Dimensions, Text, ActivityIndicator } from 'react-native';
import { theme } from '../../styles/theme';
import { Product } from '../../types';
import { STATIC_PRODUCTS } from '../../data/staticProducts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / COLUMN_COUNT;

interface MasonryLayoutProps {
  onProductPress?: (productId: string) => void;
  excludeProductId?: string;
}

// TODO: Replace static products with Supabase fetch when database is ready
// Using STATIC_PRODUCTS from data/staticProducts.ts
export default function MasonryLayout({ onProductPress, excludeProductId }: MasonryLayoutProps = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use static products for now
    // TODO: Replace with Supabase fetch when database is ready
    const filteredProducts = excludeProductId
      ? STATIC_PRODUCTS.filter((p) => p.id !== excludeProductId)
      : STATIC_PRODUCTS;
    
    setProducts(filteredProducts);
    setLoading(false);
  }, [excludeProductId]);

  // Distribute items into columns for masonry effect
  const distributeIntoColumns = (items: Product[]) => {
    const columns: Product[][] = [[], []];
    const heights = [0, 0];
    
    items.forEach((item) => {
      // Estimate height based on image aspect ratio (assuming ~3:4 ratio for clothing)
      const estimatedHeight = COLUMN_WIDTH * (Math.random() * 0.8 + 1.2); // Random height between 1.2x and 2x width
      
      // Add to shorter column
      const shorterColumnIndex = heights[0] <= heights[1] ? 0 : 1;
      columns[shorterColumnIndex].push(item);
      heights[shorterColumnIndex] += estimatedHeight + GAP;
    });
    
    return columns;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-neutral-600 text-base">No products found</Text>
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
}

function MasonryItem({ product, width, onPress }: MasonryItemProps) {
  const [imageHeight, setImageHeight] = useState<number>(width * 1.5); // Default aspect ratio
  const [imageError, setImageError] = useState(false);

  // Calculate dynamic height based on image
  const handleImageLoad = (event: any) => {
    const { width: imgWidth, height: imgHeight } = event.nativeEvent.source;
    if (imgWidth && imgHeight) {
      const aspectRatio = imgHeight / imgWidth;
      setImageHeight(width * aspectRatio);
    }
  };

  const imageUrl = product.image_urls?.[0];

  if (!imageUrl || imageError) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
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
      
      {/* Minimal product info overlay */}
      {(product.title || product.price) && (
        <View 
          className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          {product.title && (
            <Text 
              className="text-white text-xs font-sans-medium mb-0.5"
              numberOfLines={1}
            >
              {product.title}
            </Text>
          )}
          {product.price && (
            <Text className="text-white text-xs font-sans-semibold">
              ₹{product.price}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
