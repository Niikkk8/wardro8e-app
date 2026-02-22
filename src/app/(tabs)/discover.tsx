import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Animated,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';
import { getProducts } from '../../lib/productsApi';
import {
  getCollections,
  Collection,
  getTrendingProducts,
  getCategories,
  getFilterOptions,
} from '../../data/collections';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - CARD_GAP) / 2;

// ─── Types ──────────────────────────────────────────────────────────────────
interface ActiveFilters {
  category: string | null;
  gender: string | null;
  styles: string[];
  occasions: string[];
  priceRange: [number, number] | null;
  sortBy: 'relevance' | 'price_low' | 'price_high' | 'newest';
}

const DEFAULT_FILTERS: ActiveFilters = {
  category: null,
  gender: null,
  styles: [],
  occasions: [],
  priceRange: null,
  sortBy: 'relevance',
};

// ─── Main Discover Page ─────────────────────────────────────────────────────
export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    getProducts({ limit: 300 }).then(setAllProducts);
  }, []);

  const collections = useMemo(() => getCollections(allProducts), [allProducts]);
  const trendingProducts = useMemo(() => getTrendingProducts(allProducts, 15), [allProducts]);
  const categories = useMemo(() => getCategories(allProducts), [allProducts]);
  const filterOptions = useMemo(() => getFilterOptions(allProducts), [allProducts]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.category !== null ||
      filters.gender !== null ||
      filters.styles.length > 0 ||
      filters.occasions.length > 0 ||
      filters.priceRange !== null ||
      filters.sortBy !== 'relevance'
    );
  }, [filters]);

  const isSearchActive = searchQuery.trim().length > 0 || hasActiveFilters;

  // Filter & search products
  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];

    let results = [...allProducts];
    const query = searchQuery.toLowerCase().trim();

    // Text search
    if (query) {
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.source_brand_name?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.subcategory?.toLowerCase().includes(query) ||
          p.colors.some((c) => c.toLowerCase().includes(query)) ||
          p.style?.some((s) => s.toLowerCase().includes(query)) ||
          p.occasion?.some((o) => o.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.category) {
      results = results.filter((p) => p.category === filters.category);
    }

    // Gender filter
    if (filters.gender) {
      results = results.filter(
        (p) => p.gender === filters.gender || p.gender === 'unisex'
      );
    }

    // Style filter
    if (filters.styles.length > 0) {
      results = results.filter((p) =>
        p.style?.some((s) => filters.styles.includes(s))
      );
    }

    // Occasion filter
    if (filters.occasions.length > 0) {
      results = results.filter((p) =>
        p.occasion?.some((o) => filters.occasions.includes(o))
      );
    }

    // Price range filter
    if (filters.priceRange) {
      results = results.filter((p) => {
        const price = p.sale_price && p.sale_price < p.price ? p.sale_price : p.price;
        return price >= filters.priceRange![0] && price <= filters.priceRange![1];
      });
    }

    // Sort
    switch (filters.sortBy) {
      case 'price_low':
        results.sort((a, b) => {
          const priceA = a.sale_price && a.sale_price < a.price ? a.sale_price : a.price;
          const priceB = b.sale_price && b.sale_price < b.price ? b.sale_price : b.price;
          return priceA - priceB;
        });
        break;
      case 'price_high':
        results.sort((a, b) => {
          const priceA = a.sale_price && a.sale_price < a.price ? a.sale_price : a.price;
          const priceB = b.sale_price && b.sale_price < b.price ? b.sale_price : b.price;
          return priceB - priceA;
        });
        break;
      case 'newest':
        results.sort(
          (a, b) =>
            new Date(b.created_at || '').getTime() -
            new Date(a.created_at || '').getTime()
        );
        break;
    }

    return results;
  }, [allProducts, searchQuery, filters, isSearchActive]);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.gender) count++;
    count += filters.styles.length;
    count += filters.occasions.length;
    if (filters.priceRange) count++;
    if (filters.sortBy !== 'relevance') count++;
    return count;
  }, [filters]);

  // Handlers
  const handleProductPress = useCallback((productId: string) => {
    router.push(`/product/${productId}`);
  }, []);

  const handleCategoryPress = useCallback((category: string) => {
    setFilters((prev) => ({ ...prev, category }));
    setSearchQuery('');
    setIsSearchFocused(false);
  }, []);

  const openFilterModal = useCallback(() => {
    setTempFilters({ ...filters });
    setShowFilterModal(true);
  }, [filters]);

  const applyFilters = useCallback(() => {
    setFilters({ ...tempFilters });
    setShowFilterModal(false);
  }, [tempFilters]);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters(DEFAULT_FILTERS);
    setIsSearchFocused(false);
    searchInputRef.current?.blur();
  }, []);

  const removeFilter = useCallback((type: string, value?: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      switch (type) {
        case 'category':
          next.category = null;
          break;
        case 'gender':
          next.gender = null;
          break;
        case 'style':
          next.styles = prev.styles.filter((s) => s !== value);
          break;
        case 'occasion':
          next.occasions = prev.occasions.filter((o) => o !== value);
          break;
        case 'price':
          next.priceRange = null;
          break;
        case 'sort':
          next.sortBy = 'relevance';
          break;
      }
      return next;
    });
  }, []);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* ── Search Header ─────────────────────────────────── */}
      <View
        className="px-4 pt-3 pb-2 border-b"
        style={{ borderBottomColor: theme.colors.neutral[100], backgroundColor: '#FFF' }}
      >
        <View className="flex-row items-center gap-3">
          {/* Search Input */}
          <View
            className="flex-1 flex-row items-center rounded-xl px-4"
            style={{
              height: 44,
              backgroundColor: theme.colors.neutral[100],
              borderWidth: isSearchFocused ? 1.5 : 0,
              borderColor: isSearchFocused ? theme.colors.primary[400] : 'transparent',
            }}
          >
            <Ionicons
              name="search"
              size={18}
              color={isSearchFocused ? theme.colors.primary[500] : theme.colors.neutral[400]}
            />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search products, brands, styles..."
              placeholderTextColor={theme.colors.neutral[400]}
              style={{
                flex: 1,
                marginLeft: 10,
                height: 44,
                paddingVertical: 0,
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 15,
                color: theme.colors.neutral[900],
                ...(Platform.OS === 'android' && { textAlignVertical: 'center' }),
              }}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={theme.colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            onPress={openFilterModal}
            className="items-center justify-center rounded-xl"
            style={{
              width: 44,
              height: 44,
              backgroundColor: activeFilterCount > 0 ? theme.colors.primary[500] : theme.colors.neutral[100],
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilterCount > 0 ? '#FFF' : theme.colors.neutral[600]}
            />
            {activeFilterCount > 0 && (
              <View
                className="absolute -top-1 -right-1 items-center justify-center rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  backgroundColor: theme.colors.error,
                }}
              >
                <Text
                  style={{
                    color: '#FFF',
                    fontSize: 10,
                    fontFamily: typography.fontFamily.sans.bold,
                  }}
                >
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-2.5"
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {filters.category && (
              <FilterChip
                label={capitalize(filters.category)}
                onRemove={() => removeFilter('category')}
              />
            )}
            {filters.gender && (
              <FilterChip
                label={capitalize(filters.gender)}
                onRemove={() => removeFilter('gender')}
              />
            )}
            {filters.styles.map((s) => (
              <FilterChip key={s} label={s} onRemove={() => removeFilter('style', s)} />
            ))}
            {filters.occasions.map((o) => (
              <FilterChip key={o} label={o} onRemove={() => removeFilter('occasion', o)} />
            ))}
            {filters.priceRange && (
              <FilterChip
                label={`₹${filters.priceRange[0]} - ₹${filters.priceRange[1]}`}
                onRemove={() => removeFilter('price')}
              />
            )}
            {filters.sortBy !== 'relevance' && (
              <FilterChip
                label={SORT_LABELS[filters.sortBy]}
                onRemove={() => removeFilter('sort')}
              />
            )}
            <TouchableOpacity
              onPress={clearAllFilters}
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: theme.colors.neutral[50] }}
            >
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.medium,
                  fontSize: 12,
                  color: theme.colors.error,
                }}
              >
                Clear all
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ── Content ───────────────────────────────────────── */}
      {isSearchActive ? (
        <SearchResultsView
          results={searchResults}
          query={searchQuery}
          onProductPress={handleProductPress}
        />
      ) : (
        <DefaultDiscoverView
          allProducts={allProducts}
          trendingProducts={trendingProducts}
          categories={categories}
          collections={collections}
          onProductPress={handleProductPress}
          onCategoryPress={handleCategoryPress}
        />
      )}

      {/* ── Filter Modal ──────────────────────────────────── */}
      <FilterModal
        visible={showFilterModal}
        filters={tempFilters}
        filterOptions={filterOptions}
        onClose={() => setShowFilterModal(false)}
        onApply={applyFilters}
        onReset={() => setTempFilters(DEFAULT_FILTERS)}
        onChange={setTempFilters}
      />
    </SafeAreaView>
  );
}

// ─── Default Discover View (no search) ──────────────────────────────────────
function DefaultDiscoverView({
  allProducts,
  trendingProducts,
  categories,
  collections,
  onProductPress,
  onCategoryPress,
}: {
  allProducts: Product[];
  trendingProducts: Product[];
  categories: { name: string; count: number; icon: string }[];
  collections: Collection[];
  onProductPress: (id: string) => void;
  onCategoryPress: (cat: string) => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* ── View all products ───────────────────────────── */}
      <View className="mt-5 px-4">
        <TouchableOpacity
          onPress={() => router.push('/products')}
          className="flex-row items-center justify-between py-4 px-5 rounded-2xl border"
          style={{ backgroundColor: theme.colors.primary[50], borderColor: theme.colors.primary[200] }}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="items-center justify-center rounded-xl"
              style={{ width: 44, height: 44, backgroundColor: theme.colors.primary[100] }}
            >
              <Ionicons name="grid-outline" size={22} color={theme.colors.primary[600]} />
            </View>
            <View>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.semibold,
                  fontSize: 16,
                  color: theme.colors.neutral[900],
                }}
              >
                View all products
              </Text>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 12,
                  color: theme.colors.neutral[500],
                  marginTop: 2,
                }}
              >
                Browse the full catalog
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.neutral[500]} />
        </TouchableOpacity>
      </View>

      {/* ── Trending Now ────────────────────────────────── */}
      <View className="mt-8">
        <SectionHeader
          title="Trending Now"
        />
        <FlatList
          data={trendingProducts}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: CARD_GAP }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrendingProductCard product={item} onPress={() => onProductPress(item.id)} />
          )}
        />
      </View>

      {/* ── Collections ─────────────────────────────────── */}
      <View className="mt-8">
        <View className="flex-row items-end justify-between px-4 mb-4">
          <View>
            <Text
              style={{
                fontFamily: typography.fontFamily.serif.medium,
                fontSize: 20,
                color: theme.colors.neutral[900],
              }}
            >
              Collections
            </Text>
            <Text
              className="mt-1"
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 13,
                color: theme.colors.neutral[500],
              }}
            >
              Curated style boards from the community
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/collection')}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.medium,
                fontSize: 13,
                color: theme.colors.primary[500],
              }}
            >
              See all
            </Text>
          </TouchableOpacity>
        </View>
        <View
          className="flex-row flex-wrap px-4"
          style={{ gap: CARD_GAP }}
        >
          {collections.slice(0, 4).map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onPress={() => router.push(`/collection/${collection.id}`)}
            />
          ))}
        </View>
      </View>

      {/* ── Shop by Category ────────────────────────────── */}
      <View className="mt-8">
        <SectionHeader
          title="Shop by Category"
        />
        <View
          className="flex-row flex-wrap px-4"
          style={{ gap: CARD_GAP }}
        >
          {categories.map((cat) => (
            <CategoryCard
              key={cat.name}
              allProducts={allProducts}
              name={cat.name}
              count={cat.count}
              icon={cat.icon}
              onPress={() => onCategoryPress(cat.name)}
            />
          ))}
        </View>
      </View>

      {/* ── New Arrivals ────────────────────────────────── */}
      <View className="mt-8">
        <SectionHeader
          title="New Arrivals"
        />
        <FlatList
          data={[...allProducts].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 12)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: CARD_GAP }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NewArrivalCard product={item} onPress={() => onProductPress(item.id)} />
          )}
        />
      </View>
    </ScrollView>
  );
}

// ─── Search Results View ────────────────────────────────────────────────────
function SearchResultsView({
  results,
  query,
  onProductPress,
}: {
  results: Product[];
  query: string;
  onProductPress: (id: string) => void;
}) {
  if (results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="search-outline" size={56} color={theme.colors.neutral[300]} />
        <Text
          className="mt-4 text-center"
          style={{
            fontFamily: typography.fontFamily.serif.medium,
            fontSize: 20,
            color: theme.colors.neutral[800],
          }}
        >
          No results found
        </Text>
        <Text
          className="mt-2 text-center"
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 14,
            color: theme.colors.neutral[500],
          }}
        >
          {query
            ? `We couldn't find anything for "${query}". Try a different search or adjust your filters.`
            : 'Try adjusting your filters to find what you\'re looking for.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg }}>
      <Text
        className="mb-4"
        style={{
          fontFamily: typography.fontFamily.sans.medium,
          fontSize: 14,
          color: theme.colors.neutral[500],
        }}
      >
        {results.length} result{results.length !== 1 ? 's' : ''}
        {query ? ` for "${query}"` : ''}
      </Text>
      <SearchMasonryGrid products={results} onProductPress={onProductPress} />
    </ScrollView>
  );
}

// ─── Search Masonry Grid ────────────────────────────────────────────────────
function SearchMasonryGrid({
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
      heights[shorter] += estimatedHeight + CARD_GAP;
    });

    return cols;
  }, [products]);

  return (
    <View className="flex-row" style={{ gap: CARD_GAP }}>
      {columns.map((column, colIdx) => (
        <View key={colIdx} style={{ width: COLUMN_WIDTH, gap: CARD_GAP }}>
          {column.map((product) => (
            <SearchResultCard
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

// ─── Components ─────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="px-4 mb-4">
      <Text
        style={{
          fontFamily: typography.fontFamily.serif.medium,
          fontSize: 20,
          color: theme.colors.neutral[900],
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className="mt-1"
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 13,
            color: theme.colors.neutral[500],
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ─── Trending Product Card (horizontal carousel) ───────────────────────────
function TrendingProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = product.image_urls?.[0];
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;

  if (!imageUrl || imageError) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: 150,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[100],
        ...theme.shadows.sm,
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 150, height: 200, resizeMode: 'cover' }}
        onError={() => setImageError(true)}
      />
      <View className="p-2.5">
        {product.source_brand_name && (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: typography.fontFamily.sans.semibold,
              fontSize: 10,
              color: theme.colors.primary[600],
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {product.source_brand_name}
          </Text>
        )}
        <Text
          numberOfLines={1}
          className="mt-0.5"
          style={{
            fontFamily: typography.fontFamily.sans.medium,
            fontSize: 12,
            color: theme.colors.neutral[800],
          }}
        >
          {product.title}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.bold,
              fontSize: 13,
              color: theme.colors.neutral[900],
            }}
          >
            ₹{displayPrice.toLocaleString('en-IN')}
          </Text>
          {hasDiscount && (
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 11,
                color: theme.colors.neutral[400],
                textDecorationLine: 'line-through',
              }}
            >
              ₹{product.price.toLocaleString('en-IN')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Collection Card (Pinterest-style) ──────────────────────────────────────
function CollectionCard({
  collection,
  onPress,
}: {
  collection: Collection;
  onPress: () => void;
}) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const images = collection.coverImages.slice(0, 4);
  const cardWidth = COLUMN_WIDTH;
  const miniGap = 2;
  const miniImgSize = (cardWidth - miniGap) / 2;

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: cardWidth,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[50],
        ...theme.shadows.sm,
      }}
    >
      {/* Image Grid (2x2) */}
      <View
        style={{
          width: cardWidth,
          height: cardWidth,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: miniGap,
        }}
      >
        {images.map((url, idx) =>
          imageErrors.has(idx) ? (
            <View
              key={idx}
              style={{
                width: miniImgSize,
                height: miniImgSize,
                backgroundColor: theme.colors.neutral[200],
              }}
            />
          ) : (
            <Image
              key={idx}
              source={{ uri: url }}
              style={{
                width: miniImgSize,
                height: miniImgSize,
                resizeMode: 'cover',
              }}
              onError={() => handleImageError(idx)}
            />
          )
        )}
      </View>

      {/* Collection Info */}
      <View className="p-3">
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.fontFamily.serif.medium,
            fontSize: 15,
            color: theme.colors.neutral[900],
          }}
        >
          {collection.name}
        </Text>
        <Text
          numberOfLines={2}
          className="mt-1"
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 11,
            color: theme.colors.neutral[500],
            lineHeight: 16,
          }}
        >
          {collection.description}
        </Text>
        <View className="flex-row items-center mt-2.5">
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.medium,
              fontSize: 11,
              color: theme.colors.primary[600],
            }}
          >
            {collection.curator}
          </Text>
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 11,
              color: theme.colors.neutral[300],
              marginHorizontal: 6,
            }}
          >
            ·
          </Text>
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 11,
              color: theme.colors.neutral[400],
            }}
          >
            {collection.saves} saves
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Category Card ──────────────────────────────────────────────────────────
function CategoryCard({
  allProducts,
  name,
  count,
  onPress,
}: {
  allProducts: Product[];
  name: string;
  count: number;
  icon: string;
  onPress: () => void;
}) {
  const cardWidth = (SCREEN_WIDTH - theme.spacing.lg * 2 - CARD_GAP) / 2;

  const coverImage = useMemo(() => {
    const product = allProducts.find((p) => p.category === name && p.image_urls?.[0]);
    return product?.image_urls[0] || null;
  }, [name, allProducts]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: cardWidth,
        height: 100,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
      }}
    >
      {coverImage ? (
        <Image
          source={{ uri: coverImage }}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
      ) : (
        <View style={{ width: '100%', height: '100%', backgroundColor: theme.colors.neutral[200] }} />
      )}
      {/* Dark overlay */}
      <View
        className="absolute inset-0 justify-end p-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      >
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.semibold,
            fontSize: 15,
            color: '#FFF',
            textTransform: 'capitalize',
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 11,
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          {count} items
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── New Arrival Card ───────────────────────────────────────────────────────
function NewArrivalCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = product.image_urls?.[0];

  if (!imageUrl || imageError) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: 130,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[100],
        ...theme.shadows.sm,
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 130, height: 170, resizeMode: 'cover' }}
        onError={() => setImageError(true)}
      />
      <View className="p-2">
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.fontFamily.sans.medium,
            fontSize: 11,
            color: theme.colors.neutral[800],
          }}
        >
          {product.title}
        </Text>
        <Text
          className="mt-0.5"
          style={{
            fontFamily: typography.fontFamily.sans.bold,
            fontSize: 12,
            color: theme.colors.neutral[900],
          }}
        >
          ₹{(product.sale_price || product.price).toLocaleString('en-IN')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Search Result Card (masonry item) ──────────────────────────────────────
function SearchResultCard({
  product,
  width,
  onPress,
}: {
  product: Product;
  width: number;
  onPress: () => void;
}) {
  const [imageHeight, setImageHeight] = useState(width * 1.4);
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
        backgroundColor: '#FFF',
        ...theme.shadows.sm,
      }}
    >
      <View style={{ position: 'relative' }}>
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
      </View>

      <View className="p-2.5">
        {product.source_brand_name && (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: typography.fontFamily.sans.semibold,
              fontSize: 9,
              color: theme.colors.primary[600],
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {product.source_brand_name}
          </Text>
        )}
        <Text
          numberOfLines={2}
          className="mt-0.5"
          style={{
            fontFamily: typography.fontFamily.sans.medium,
            fontSize: 12,
            color: theme.colors.neutral[800],
            lineHeight: 16,
          }}
        >
          {product.title}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.bold,
              fontSize: 13,
              color: theme.colors.neutral[900],
            }}
          >
            ₹{displayPrice.toLocaleString('en-IN')}
          </Text>
          {hasDiscount && (
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 11,
                color: theme.colors.neutral[400],
                textDecorationLine: 'line-through',
              }}
            >
              ₹{product.price.toLocaleString('en-IN')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Chip ────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View
      className="flex-row items-center rounded-full px-3 py-1.5"
      style={{ backgroundColor: theme.colors.primary[50], borderWidth: 1, borderColor: theme.colors.primary[200] }}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily.sans.medium,
          fontSize: 12,
          color: theme.colors.primary[700],
          marginRight: 6,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
        <Ionicons name="close" size={14} color={theme.colors.primary[500]} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Filter Modal ───────────────────────────────────────────────────────────
const SORT_LABELS: Record<string, string> = {
  relevance: 'Relevance',
  price_low: 'Price: Low to High',
  price_high: 'Price: High to Low',
  newest: 'Newest First',
};

const PRICE_RANGES: { label: string; range: [number, number] }[] = [
  { label: 'Under ₹1,000', range: [0, 1000] },
  { label: '₹1,000 - ₹3,000', range: [1000, 3000] },
  { label: '₹3,000 - ₹5,000', range: [3000, 5000] },
  { label: '₹5,000 - ₹10,000', range: [5000, 10000] },
  { label: 'Above ₹10,000', range: [10000, 100000] },
];

function FilterModal({
  visible,
  filters,
  filterOptions,
  onClose,
  onApply,
  onReset,
  onChange,
}: {
  visible: boolean;
  filters: ActiveFilters;
  filterOptions: ReturnType<typeof getFilterOptions>;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  onChange: (filters: ActiveFilters) => void;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const toggleStyle = (style: string) => {
    const next = filters.styles.includes(style)
      ? filters.styles.filter((s) => s !== style)
      : [...filters.styles, style];
    onChange({ ...filters, styles: next });
  };

  const toggleOccasion = (occasion: string) => {
    const next = filters.occasions.includes(occasion)
      ? filters.occasions.filter((o) => o !== occasion)
      : [...filters.occasions, occasion];
    onChange({ ...filters, occasions: next });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <TouchableOpacity className="flex-1" onPress={onClose} activeOpacity={1} />
        <View
          className="bg-white rounded-t-3xl"
          style={{ maxHeight: '85%' }}
        >
          {/* Modal Header */}
          <View
            className="flex-row items-center justify-between px-5 py-4 border-b"
            style={{ borderBottomColor: theme.colors.neutral[200] }}
          >
            <TouchableOpacity onPress={onReset}>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.medium,
                  fontSize: 14,
                  color: theme.colors.error,
                }}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: typography.fontFamily.serif.medium,
                fontSize: 18,
                color: theme.colors.neutral[900],
              }}
            >
              Filters
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 120 }}
          >
            {/* Sort By */}
            <FilterSection title="Sort By">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {Object.entries(SORT_LABELS).map(([key, label]) => (
                  <TogglePill
                    key={key}
                    label={label}
                    active={filters.sortBy === key}
                    onPress={() => onChange({ ...filters, sortBy: key as ActiveFilters['sortBy'] })}
                  />
                ))}
              </View>
            </FilterSection>

            {/* Category */}
            <FilterSection title="Category">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {filterOptions.categories.map((cat) => (
                  <TogglePill
                    key={cat}
                    label={capitalize(cat)}
                    active={filters.category === cat}
                    onPress={() =>
                      onChange({ ...filters, category: filters.category === cat ? null : cat })
                    }
                  />
                ))}
              </View>
            </FilterSection>

            {/* Gender */}
            <FilterSection title="Gender">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {filterOptions.genders.map((g) => (
                  <TogglePill
                    key={g}
                    label={capitalize(g)}
                    active={filters.gender === g}
                    onPress={() =>
                      onChange({ ...filters, gender: filters.gender === g ? null : g })
                    }
                  />
                ))}
              </View>
            </FilterSection>

            {/* Price Range */}
            <FilterSection title="Price Range">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {PRICE_RANGES.map((pr) => {
                  const isActive =
                    filters.priceRange?.[0] === pr.range[0] &&
                    filters.priceRange?.[1] === pr.range[1];
                  return (
                    <TogglePill
                      key={pr.label}
                      label={pr.label}
                      active={isActive}
                      onPress={() =>
                        onChange({ ...filters, priceRange: isActive ? null : pr.range })
                      }
                    />
                  );
                })}
              </View>
            </FilterSection>

            {/* Style */}
            <FilterSection title="Style">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {filterOptions.styles.map((style) => (
                  <TogglePill
                    key={style}
                    label={style}
                    active={filters.styles.includes(style)}
                    onPress={() => toggleStyle(style)}
                  />
                ))}
              </View>
            </FilterSection>

            {/* Occasion */}
            <FilterSection title="Occasion">
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {filterOptions.occasions.map((occ) => (
                  <TogglePill
                    key={occ}
                    label={occ}
                    active={filters.occasions.includes(occ)}
                    onPress={() => toggleOccasion(occ)}
                  />
                ))}
              </View>
            </FilterSection>
          </ScrollView>

          {/* Apply Button */}
          <View
            className="absolute bottom-0 left-0 right-0 px-5 pt-3 bg-white"
            style={{
              paddingBottom: Platform.OS === 'ios' ? 34 : 20,
              ...theme.shadows.lg,
              shadowOffset: { width: 0, height: -2 },
            }}
          >
            <TouchableOpacity
              onPress={onApply}
              className="h-14 rounded-xl items-center justify-center"
              style={{ backgroundColor: theme.colors.primary[500] }}
              activeOpacity={0.9}
            >
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.semibold,
                  fontSize: 16,
                  color: '#FFF',
                }}
              >
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text
        className="mb-3"
        style={{
          fontFamily: typography.fontFamily.sans.semibold,
          fontSize: 14,
          color: theme.colors.neutral[800],
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function TogglePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-full px-4 py-2"
      style={{
        backgroundColor: active ? theme.colors.primary[500] : theme.colors.neutral[50],
        borderWidth: 1,
        borderColor: active ? theme.colors.primary[500] : theme.colors.neutral[200],
      }}
      activeOpacity={0.8}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily.sans.medium,
          fontSize: 13,
          color: active ? '#FFF' : theme.colors.neutral[700],
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
