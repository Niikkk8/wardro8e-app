import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';
import { getCollections, getCollectionProducts } from '../../data/collections';
import { getProducts } from '../../lib/productsApi';
import { useWardrobe } from '../../contexts/WardrobeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / 2;

export default function CollectionDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wardrobe = useWardrobe();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const isSaved = id ? wardrobe.isCollectionSaved(id) : false;

  useEffect(() => {
    getProducts({ limit: 300 }).then((products) => {
      setAllProducts(products);
      setLoading(false);
    });
  }, []);

  const collection = useMemo(
    () => getCollections(allProducts).find((c) => c.id === id),
    [id, allProducts]
  );

  const products = useMemo(
    () => (id ? getCollectionProducts(id, allProducts) : []),
    [id, allProducts]
  );

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!collection) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text
            style={{
              fontFamily: typography.fontFamily.serif.medium,
              fontSize: 20,
              color: theme.colors.neutral[800],
            }}
          >
            Collection not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 px-6 py-3 rounded-xl"
            style={{ backgroundColor: theme.colors.primary[500] }}
          >
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.semibold,
                fontSize: 14,
                color: '#FFF',
              }}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const coverImages = collection.coverImages.slice(0, 4);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
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
            ...typography.styles.logo,
            color: theme.colors.primary[500],
          }}
        >
          Wardro8e
        </Text>
        <TouchableOpacity
          onPress={() => id && wardrobe.toggleSaveCollection(id)}
          className="w-10 h-10 items-center justify-center -mr-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isSaved ? theme.colors.primary[500] : theme.colors.neutral[700]}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Cover Image Grid */}
        <View
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_WIDTH * 0.6,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {coverImages.map((url, idx) => {
            // If only 1 image, full width. If 2, half each. If 3+, first is tall left, rest stack right. If 4, 2x2.
            const isFour = coverImages.length >= 4;
            const imgW = isFour ? (SCREEN_WIDTH - 2) / 2 : idx === 0 && coverImages.length === 3 ? SCREEN_WIDTH * 0.55 : (SCREEN_WIDTH - 2) / 2;
            const imgH = isFour ? (SCREEN_WIDTH * 0.6 - 2) / 2 : SCREEN_WIDTH * 0.6;

            return (
              <CoverImage
                key={idx}
                uri={url}
                width={imgW}
                height={imgH}
              />
            );
          })}
        </View>

        {/* Collection Info */}
        <View className="px-5 pt-5">
          {/* Title */}
          <Text
            style={{
              fontFamily: typography.fontFamily.serif.bold,
              fontSize: 26,
              color: theme.colors.neutral[900],
              lineHeight: 32,
            }}
          >
            {collection.name}
          </Text>

          {/* Description */}
          <Text
            className="mt-2"
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 14,
              color: theme.colors.neutral[600],
              lineHeight: 22,
            }}
          >
            {collection.description}
          </Text>

          {/* Curator Row */}
          <View
            className="flex-row items-center mt-4 p-3.5 rounded-xl"
            style={{ backgroundColor: theme.colors.neutral[50] }}
          >
            {/* Avatar placeholder */}
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                backgroundColor: theme.colors.primary[100],
              }}
            >
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.bold,
                  fontSize: 14,
                  color: theme.colors.primary[600],
                }}
              >
                {collection.curator.replace('@', '').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.semibold,
                  fontSize: 13,
                  color: theme.colors.neutral[900],
                }}
              >
                {collection.curator}
              </Text>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 12,
                  color: theme.colors.neutral[500],
                }}
              >
                Curator
              </Text>
            </View>
            <View className="items-end">
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.bold,
                  fontSize: 16,
                  color: theme.colors.neutral[900],
                }}
              >
                {collection.saves}
              </Text>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 11,
                  color: theme.colors.neutral[500],
                }}
              >
                saves
              </Text>
            </View>
          </View>

          {/* Tags */}
          {collection.tags.length > 0 && (
            <View className="flex-row flex-wrap mt-4" style={{ gap: 8 }}>
              {collection.tags.map((tag) => (
                <View
                  key={tag}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: theme.colors.primary[50],
                    borderWidth: 1,
                    borderColor: theme.colors.primary[100],
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.fontFamily.sans.medium,
                      fontSize: 12,
                      color: theme.colors.primary[700],
                    }}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Products Count */}
          <View
            className="mt-5 pt-5 border-t"
            style={{ borderTopColor: theme.colors.neutral[200] }}
          >
            <Text
              style={{
                fontFamily: typography.fontFamily.serif.medium,
                fontSize: 18,
                color: theme.colors.neutral[900],
              }}
            >
              {products.length} pieces in this collection
            </Text>
          </View>
        </View>

        {/* Masonry Product Grid */}
        <View className="px-4 mt-4">
          <MasonryGrid
            products={products}
            onProductPress={(productId) => router.push(`/product/${productId}`)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Cover Image ────────────────────────────────────────────────────────────
function CoverImage({
  uri,
  width,
  height,
}: {
  uri: string;
  width: number;
  height: number;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={{ width, height, backgroundColor: theme.colors.neutral[200] }} />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width, height, resizeMode: 'cover' }}
      onError={() => setError(true)}
    />
  );
}

// ─── Masonry Grid ───────────────────────────────────────────────────────────
function MasonryGrid({
  products,
  onProductPress,
}: {
  products: Product[];
  onProductPress: (id: string) => void;
}) {
  const columns = useMemo(() => {
    const cols: Product[][] = [[], []];
    const heights = [0, 0];

    products.forEach((item) => {
      const estimatedHeight = COLUMN_WIDTH * (1.2 + Math.random() * 0.5);
      const shorter = heights[0] <= heights[1] ? 0 : 1;
      cols[shorter].push(item);
      heights[shorter] += estimatedHeight + GAP;
    });

    return cols;
  }, [products]);

  return (
    <View className="flex-row" style={{ gap: GAP }}>
      {columns.map((column, colIdx) => (
        <View key={colIdx} style={{ width: COLUMN_WIDTH, gap: GAP }}>
          {column.map((product) => (
            <MasonryItem
              key={product.id}
              product={product}
              width={COLUMN_WIDTH}
              onPress={() => onProductPress(product.id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Masonry Item ───────────────────────────────────────────────────────────
function MasonryItem({
  product,
  width,
  onPress,
}: {
  product: Product;
  width: number;
  onPress: () => void;
}) {
  const [imageHeight, setImageHeight] = useState(width * 1.5);
  const [imageError, setImageError] = useState(false);
  const imageUrl = product.image_urls?.[0];
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  const handleImageLoad = (event: any) => {
    const { width: imgW, height: imgH } = event.nativeEvent.source;
    if (imgW && imgH) {
      setImageHeight(width * (imgH / imgW));
    }
  };

  if (!imageUrl || imageError) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
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
      {hasDiscount && (
        <View
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full"
          style={{ backgroundColor: theme.colors.error }}
        >
          <Text
            style={{
              color: '#FFF',
              fontSize: 9,
              fontFamily: typography.fontFamily.sans.bold,
            }}
          >
            -{discountPercent}%
          </Text>
        </View>
      )}
      {/* Overlay info */}
      <View
        className="absolute bottom-0 left-0 right-0 px-3 py-2"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      >
        {product.source_brand_name && (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: typography.fontFamily.sans.semibold,
              fontSize: 9,
              color: 'rgba(255,255,255,0.8)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {product.source_brand_name}
          </Text>
        )}
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.fontFamily.sans.medium,
            fontSize: 12,
            color: '#FFF',
          }}
        >
          {product.title}
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.bold,
            fontSize: 12,
            color: '#FFF',
            marginTop: 1,
          }}
        >
          ₹{displayPrice.toLocaleString('en-IN')}
          {hasDiscount && (
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 10,
                color: 'rgba(255,255,255,0.6)',
                textDecorationLine: 'line-through',
              }}
            >
              {'  '}₹{product.price.toLocaleString('en-IN')}
            </Text>
          )}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
