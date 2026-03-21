/**
 * Wardrobe tab — Saved / Favourited products
 *
 * Shows all products the user has hearted, in a masonry grid.
 * Collections are managed separately in the Create tab.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';
import { getProductsByIds } from '../../lib/productsApi';
import { useWardrobe } from '../../contexts/WardrobeContext';
import ProductCard from '../../components/ui/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / 2;

// ── Main Component ──────────────────────────────────────────────────────────

export default function WardrobePage() {
  const wardrobe = useWardrobe();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wardrobe.loading) return;

    if (wardrobe.favouriteIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getProductsByIds(wardrobe.favouriteIds)
      .then((fetched) => {
        const byId = new Map(fetched.map((p) => [p.id, p]));
        setProducts(
          wardrobe.favouriteIds
            .map((id) => byId.get(id))
            .filter(Boolean) as Product[]
        );
      })
      .finally(() => setLoading(false));
  }, [wardrobe.loading, wardrobe.favouriteIds.join(',')]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: 12,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.neutral[100],
          backgroundColor: '#f8f8f8',
        }}
      >
        <Text
          style={{
            fontFamily: typography.fontFamily.serif.regular,
            fontSize: 28,
            color: theme.colors.neutral[900],
            letterSpacing: -0.5,
          }}
        >
          Saved
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 13,
            color: theme.colors.neutral[400],
            marginTop: 2,
          }}
        >
          {wardrobe.favouriteIds.length > 0
            ? `${wardrobe.favouriteIds.length} saved item${wardrobe.favouriteIds.length !== 1 ? 's' : ''}`
            : 'Nothing saved yet'}
        </Text>
      </View>

      {/* Content */}
      {wardrobe.loading || loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <MasonryFeed
          products={products}
          onProductPress={(id) => router.push(`/product/${id}`)}
          onRemove={(id) => wardrobe.toggleFavourite(id)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
      <Text
        style={{
          fontFamily: typography.fontFamily.serif.medium,
          fontSize: 22,
          color: theme.colors.neutral[900],
          textAlign: 'center',
        }}
      >
        Nothing saved yet
      </Text>
      <Text
        style={{
          fontFamily: typography.fontFamily.sans.regular,
          fontSize: 14,
          color: theme.colors.neutral[500],
          marginTop: 10,
          textAlign: 'center',
          lineHeight: 21,
        }}
      >
        Tap the heart on any product while browsing to save it here.
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/discover')}
        style={{
          marginTop: 28,
          backgroundColor: theme.colors.primary[500],
          paddingHorizontal: 32,
          paddingVertical: 14,
          borderRadius: 16,
        }}
        activeOpacity={0.85}
      >
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.semibold,
            fontSize: 15,
            color: '#fff',
          }}
        >
          Start Exploring
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Masonry Feed ────────────────────────────────────────────────────────────

function MasonryFeed({
  products,
  onProductPress,
  onRemove,
}: {
  products: Product[];
  onProductPress: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const columns = distributeMasonry(products);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: 48,
      }}
    >
      <View style={{ flexDirection: 'row', gap: GAP }}>
        {columns.map((col, colIdx) => (
          <View key={colIdx} style={{ width: COLUMN_WIDTH, gap: GAP }}>
            {col.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                width={COLUMN_WIDTH}
                onPress={() => onProductPress(product.id)}
                onRemove={() => onRemove(product.id)}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Helper ───────────────────────────────────────────────────────────────────

function distributeMasonry(products: Product[]): Product[][] {
  const cols: Product[][] = [[], []];
  const heights = [0, 0];
  products.forEach((item) => {
    const est = COLUMN_WIDTH * (1.2 + Math.random() * 0.5);
    const shorter = heights[0] <= heights[1] ? 0 : 1;
    cols[shorter].push(item);
    heights[shorter] += est + GAP;
  });
  return cols;
}
