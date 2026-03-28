/**
 * Discover / Explore screen
 *
 * Search covers: title, brand, category, subcategory, description,
 *   style, occasion, season, colors, pattern, materials, fit_type, gender
 * Filters: Sort, Category, Price, Colors, Sizes
 */
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router as expoRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';
import { getProducts } from '../../lib/productsApi';
import { exploreService, feedService } from '../../lib/feedService';
import { fetchPublicCollections, CollectionRecord } from '../../lib/collectionsService';
import { interactionService } from '../../lib/interactionService';
import { useAuth } from '../../contexts/AuthContext';
import { useWardrobe } from '../../contexts/WardrobeContext';
import { ProductSheet } from '../../components/ui/ProductSheet';
import MasonryLayout from '../../components/layouts/MasonryLayout';
import ProductCard from '../../components/ui/ProductCard';

let LinearGradient: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}
let Haptics: typeof import('expo-haptics') | null = null;
try { Haptics = require('expo-haptics'); } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 24;

// ── Types ──────────────────────────────────────────────────────────────────────
type SortOption = 'featured' | 'newest' | 'price_asc' | 'price_desc';

// ── Constants ──────────────────────────────────────────────────────────────────
const VIBES = [
  { label: 'All' },
  { label: 'Casual' },
  { label: 'Minimal' },
  { label: 'Bohemian' },
  { label: 'Formal' },
  { label: 'Street' },
  { label: 'Date Night' },
  { label: 'Sporty' },
  { label: 'Party' },
] as const;

const CATEGORY_OPTIONS = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Footwear',
  'Accessories', 'Activewear', 'Swimwear', 'Bags',
];

const COLOR_OPTIONS = [
  { name: 'Black',      hex: '#1a1a1a' },
  { name: 'White',      hex: '#f0f0f0' },
  { name: 'Grey',       hex: '#9e9e9e' },
  { name: 'Brown',      hex: '#8d6e63' },
  { name: 'Beige',      hex: '#d4b896' },
  { name: 'Navy',       hex: '#1e3a5f' },
  { name: 'Blue',       hex: '#2196f3' },
  { name: 'Red',        hex: '#e53935' },
  { name: 'Pink',       hex: '#e91e8c' },
  { name: 'Green',      hex: '#43a047' },
  { name: 'Yellow',     hex: '#fdd835' },
  { name: 'Orange',     hex: '#fb8c00' },
  { name: 'Purple',     hex: '#8e24aa' },
];

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '6', '8', '10', '12', '14', '16'];

const PRICE_RANGES = [
  { label: 'Under $50',   max: 50   },
  { label: '$50 – $100',  max: 100  },
  { label: '$100 – $200', max: 200  },
  { label: 'Over $200',   max: 9999 },
];

const SORT_OPTIONS: { label: string; value: SortOption; icon: string }[] = [
  { label: 'Featured',         value: 'featured',    icon: 'star-outline'         },
  { label: 'Newest',           value: 'newest',      icon: 'time-outline'         },
  { label: 'Price: Low → High',value: 'price_asc',   icon: 'trending-up-outline'  },
  { label: 'Price: High → Low',value: 'price_desc',  icon: 'trending-down-outline'},
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const { user } = useAuth();
  const { favouriteIds, toggleFavourite } = useWardrobe();

  // ── Feed state ──────────────────────────────────────────────────────────────
  const [selectedVibe, setSelectedVibe] = useState<string>('All');
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [feedProducts, setFeedProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allProductsCache, setAllProductsCache] = useState<Product[]>([]);
  const allProductsCacheTimeRef = useRef<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterColors, setFilterColors] = useState<string[]>([]);
  const [filterSizes, setFilterSizes] = useState<string[]>([]);
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);
  const [filterSortBy, setFilterSortBy] = useState<SortOption>('featured');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // ── ProductSheet state ──────────────────────────────────────────────────────
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // ── Collections strip ───────────────────────────────────────────────────────
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [collectionCovers, setCollectionCovers] = useState<Record<string, string[]>>({});

  // ── Gender ──────────────────────────────────────────────────────────────────
  const [userGender, setUserGender] = useState<string | null>(null);
  const [genderReady, setGenderReady] = useState(!user);

  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Derived filter values ───────────────────────────────────────────────────
  const hasActiveFilters = useMemo(
    () =>
      filterCategory !== null ||
      filterColors.length > 0 ||
      filterSizes.length > 0 ||
      filterPriceMax !== null ||
      filterSortBy !== 'featured',
    [filterCategory, filterColors, filterSizes, filterPriceMax, filterSortBy]
  );

  const activeFilterCount = useMemo(
    () =>
      [
        filterCategory !== null,
        filterColors.length > 0,
        filterSizes.length > 0,
        filterPriceMax !== null,
        filterSortBy !== 'featured',
      ].filter(Boolean).length,
    [filterCategory, filterColors, filterSizes, filterPriceMax, filterSortBy]
  );

  const clearFilters = useCallback(() => {
    setFilterCategory(null);
    setFilterColors([]);
    setFilterSizes([]);
    setFilterPriceMax(null);
    setFilterSortBy('featured');
  }, []);

  // ── applyFilters ────────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (products: Product[]): Product[] => {
      let result = [...products];

      if (filterCategory) {
        result = result.filter(
          (p) => p.category?.toLowerCase() === filterCategory.toLowerCase()
        );
      }
      if (filterColors.length > 0) {
        result = result.filter((p) =>
          p.colors?.some((c) =>
            filterColors.some(
              (fc) =>
                c.toLowerCase().includes(fc.toLowerCase()) ||
                fc.toLowerCase().includes(c.toLowerCase())
            )
          )
        );
      }
      if (filterSizes.length > 0) {
        result = result.filter((p) =>
          p.size_range?.some((s) => filterSizes.includes(s))
        );
      }
      if (filterPriceMax !== null && filterPriceMax < 9999) {
        result = result.filter(
          (p) => (p.sale_price ?? p.price) <= filterPriceMax
        );
      }

      switch (filterSortBy) {
        case 'price_asc':
          result.sort(
            (a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price)
          );
          break;
        case 'price_desc':
          result.sort(
            (a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price)
          );
          break;
        case 'newest':
          result.sort((a, b) =>
            (b.created_at ?? '') > (a.created_at ?? '') ? 1 : -1
          );
          break;
      }

      return result;
    },
    [filterCategory, filterColors, filterSizes, filterPriceMax, filterSortBy]
  );

  // ── Collections load ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPublicCollections()
      .then(async (cols) => {
        const top = cols.slice(0, 6);
        setCollections(top);
        const needCovers = top.filter(
          (c) => !c.cover_image_url && c.product_ids.length > 0
        );
        if (needCovers.length > 0) {
          const allIds = Array.from(
            new Set(needCovers.flatMap((c) => c.product_ids.slice(0, 4)))
          );
          const prods = await getProducts({ limit: allIds.length + 10 });
          const byId = new Map(prods.map((p) => [p.id, p]));
          const covers: Record<string, string[]> = {};
          needCovers.forEach((col) => {
            covers[col.id] = col.product_ids
              .slice(0, 4)
              .map((id) => byId.get(id)?.image_urls?.[0])
              .filter(Boolean) as string[];
          });
          setCollectionCovers(covers);
        }
      })
      .catch(() => {});
  }, []);

  // ── User gender ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setUserGender(null);
      setGenderReady(true);
      return;
    }
    setGenderReady(false);
    feedService.getUserGender(user.id).then((g) => {
      setUserGender(g);
      setGenderReady(true);
    });
  }, [user?.id]);

  // ── Initial load ────────────────────────────────────────────────────────────
  const loadInitial = useCallback(
    async (vibe = 'All') => {
      setLoadingInitial(true);
      setFeedProducts([]);
      setSeenIds(new Set());
      setHasMore(true);
      try {
        const [trending, explorePage] = await Promise.all([
          exploreService.getTrendingProducts(userGender, 10),
          exploreService.getExploreFeed({
            limit: PAGE_SIZE,
            offset: 0,
            excludeIds: [],
            gender: userGender,
            vibe: vibe === 'All' ? null : vibe,
          }),
        ]);
        setTrendingProducts(trending);
        setFeedProducts(explorePage);
        setSeenIds(new Set(explorePage.map((p) => p.id)));
        setHasMore(explorePage.length >= PAGE_SIZE);
      } catch (e) {
        if (__DEV__) console.warn('[Discover] Load error:', e);
      } finally {
        setLoadingInitial(false);
      }
    },
    [userGender]
  );

  useEffect(() => {
    if (!genderReady) return;
    loadInitial(selectedVibe);
  }, [genderReady, selectedVibe]);

  // ── Load more ───────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isSearchActive || hasActiveFilters) return;
    setLoadingMore(true);
    try {
      const next = await exploreService.getExploreFeed({
        limit: PAGE_SIZE,
        offset: feedProducts.length,
        excludeIds: Array.from(seenIds).slice(0, 200),
        gender: userGender,
        vibe: selectedVibe === 'All' ? null : selectedVibe,
      });
      if (next.length === 0) {
        setHasMore(false);
      } else {
        const incoming = next.filter((p) => !seenIds.has(p.id));
        if (incoming.length === 0) {
          setHasMore(false);
        } else {
          setFeedProducts((prev) => [...prev, ...incoming]);
          setSeenIds((prev) => {
            const s = new Set(prev);
            incoming.forEach((p) => s.add(p.id));
            return s;
          });
          setHasMore(next.length >= PAGE_SIZE);
        }
      }
    } catch {}
    finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, isSearchActive, hasActiveFilters, feedProducts.length, seenIds, userGender, selectedVibe]);

  // ── Product cache for search + filter ──────────────────────────────────────
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  const refreshAllProductsCache = useCallback(() => {
    getProducts({
      limit: 400,
      orderBy: ['is_featured', 'created_at'],
      orderAsc: [false, false],
    })
      .then((products) => {
        setAllProductsCache(products);
        allProductsCacheTimeRef.current = Date.now();
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const stale = Date.now() - allProductsCacheTimeRef.current > CACHE_TTL_MS;
    if (allProductsCache.length === 0 || stale) {
      refreshAllProductsCache();
    }
  }, []);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshAllProductsCache();
    await loadInitial(selectedVibe).catch(() => {});
    setRefreshing(false);
  }, [refreshAllProductsCache, loadInitial, selectedVibe]);

  // ── Search (extended fields + token scoring) ────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

      if (!query.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      searchTimerRef.current = setTimeout(() => {
        const q = query.trim().toLowerCase();
        const tokens = q.split(/\s+/).filter(Boolean);

        const scored = allProductsCache
          .map((p) => {
            const fields = [
              p.title,
              p.source_brand_name,
              p.category,
              p.subcategory,
              p.description,
              p.fit_type,
              p.gender,
              ...(p.style ?? []),
              ...(p.occasion ?? []),
              ...(p.season ?? []),
              ...(p.colors ?? []),
              p.attributes?.pattern,
              ...(p.attributes?.materials ?? []),
            ]
              .filter(Boolean)
              .map((f) => (f as string).toLowerCase());

            // Full phrase match scores higher than all-tokens match
            const fullMatch = fields.some((f) => f.includes(q));
            const allTokensMatch =
              tokens.length > 1 &&
              tokens.every((t) => fields.some((f) => f.includes(t)));
            const score = fullMatch ? 2 : allTokensMatch ? 1 : 0;
            return { product: p, score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score);

        setSearchResults(scored.slice(0, 80).map((x) => x.product));
        setSearchLoading(false);
      }, 220);
    },
    [allProductsCache]
  );

  const activateSearch = useCallback(() => {
    setIsSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const deactivateSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.blur();
  }, []);

  // ── Product interactions ────────────────────────────────────────────────────
  const openSheet = useCallback(
    (product: Product) => {
      Haptics?.selectionAsync().catch(() => {});
      interactionService
        .logInteraction(user?.id ?? null, product.id, 'view')
        .catch(() => {});
      setSheetProduct(product);
      setSheetVisible(true);
    },
    [user?.id]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setSheetProduct(null), 350);
  }, []);

  const handleLike = useCallback(
    (productId: string) => {
      toggleFavourite(productId, user?.id ?? null);
    },
    [user?.id, toggleFavourite]
  );

  const handleSave = useCallback(
    (productId: string) => {
      interactionService
        .logInteraction(user?.id ?? null, productId, 'save')
        .catch(() => {});
    },
    [user?.id]
  );

  // ── Vibe selection ──────────────────────────────────────────────────────────
  const handleVibeSelect = useCallback((vibe: string) => {
    Haptics?.selectionAsync().catch(() => {});
    setSelectedVibe(vibe);
  }, []);

  const likedIds = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  // ── Scroll handler ──────────────────────────────────────────────────────────
  const handleScroll = useCallback(
    (e: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (
        distanceFromBottom < 800 &&
        !loadingMore &&
        hasMore &&
        !isSearchActive &&
        !hasActiveFilters
      ) {
        loadMore();
      }
    },
    [loadMore, loadingMore, hasMore, isSearchActive, hasActiveFilters]
  );

  // ── Computed display products ───────────────────────────────────────────────
  const filteredSearchResults = useMemo(() => {
    if (!isSearchActive) return searchResults;
    return hasActiveFilters ? applyFilters(searchResults) : searchResults;
  }, [isSearchActive, searchResults, hasActiveFilters, applyFilters]);

  const filteredBrowseProducts = useMemo(() => {
    if (!hasActiveFilters) return feedProducts;
    const base = allProductsCache.length > 0 ? allProductsCache : feedProducts;
    return applyFilters(base);
  }, [hasActiveFilters, allProductsCache, feedProducts, applyFilters]);

  const gridProducts = isSearchActive ? filteredSearchResults : filteredBrowseProducts;
  const gridSkeleton = loadingInitial && !isSearchActive && !hasActiveFilters;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f8' }} edges={['top']}>
      <DiscoverHeader
        isSearchActive={isSearchActive}
        searchQuery={searchQuery}
        searchInputRef={searchInputRef}
        onSearchChange={handleSearchChange}
        onActivateSearch={activateSearch}
        onDeactivateSearch={deactivateSearch}
        searchLoading={searchLoading}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => setFilterSheetVisible(true)}
      />

      {/* Active filter chips row */}
      {hasActiveFilters && (
        <ActiveFilterChips
          filterCategory={filterCategory}
          filterColors={filterColors}
          filterSizes={filterSizes}
          filterPriceMax={filterPriceMax}
          filterSortBy={filterSortBy}
          onClearCategory={() => setFilterCategory(null)}
          onClearColor={(c) =>
            setFilterColors((prev) => prev.filter((x) => x !== c))
          }
          onClearSize={(s) =>
            setFilterSizes((prev) => prev.filter((x) => x !== s))
          }
          onClearPrice={() => setFilterPriceMax(null)}
          onClearSort={() => setFilterSortBy('featured')}
          onClearAll={clearFilters}
        />
      )}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Vibe pills */}
        {!isSearchActive && (
          <VibePills
            vibes={VIBES}
            selectedVibe={selectedVibe}
            onSelect={handleVibeSelect}
          />
        )}

        {/* ── Search mode ──────────────────────────────────────────────────── */}
        {isSearchActive && (
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: 8 }}>
            {/* Result count */}
            {!searchLoading && searchQuery.trim() && filteredSearchResults.length > 0 && (
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 12,
                  color: theme.colors.neutral[400],
                  marginBottom: 12,
                }}
              >
                {filteredSearchResults.length} result
                {filteredSearchResults.length !== 1 ? 's' : ''} for &ldquo;
                {searchQuery}&rdquo;
                {hasActiveFilters ? ' · filtered' : ''}
              </Text>
            )}

            {searchLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={theme.colors.primary[500]} />
              </View>
            ) : searchQuery.trim() && filteredSearchResults.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons
                  name="search-outline"
                  size={36}
                  color={theme.colors.neutral[300]}
                />
                <Text
                  style={{
                    marginTop: 10,
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 14,
                    color: theme.colors.neutral[500],
                  }}
                >
                  No results for &ldquo;{searchQuery}&rdquo;
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    onPress={clearFilters}
                    style={{ marginTop: 8 }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.sans.medium,
                        fontSize: 13,
                        color: theme.colors.primary[600],
                      }}
                    >
                      Clear filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : !searchQuery.trim() ? null : (
              <MasonryLayout
                products={filteredSearchResults}
                onProductPress={(id) => {
                  const p = filteredSearchResults.find((x) => x.id === id);
                  if (p) openSheet(p);
                }}
                onLike={handleLike}
                likedIds={likedIds}
                showSkeleton={false}
              />
            )}
          </View>
        )}

        {/* ── Browse mode ──────────────────────────────────────────────────── */}
        {!isSearchActive && (
          <>
            {/* Trending strip — hidden when filters active */}
            {!hasActiveFilters &&
              (trendingProducts.length > 0 || loadingInitial) && (
                <TrendingStrip
                  products={trendingProducts}
                  loading={loadingInitial}
                  onProductPress={openSheet}
                />
              )}

            {/* Collections strip — hidden when filters active */}
            {!hasActiveFilters && collections.length > 0 && (
              <CollectionsStrip
                collections={collections}
                coverImages={collectionCovers}
              />
            )}

            {/* Section header */}
            <View
              style={{
                paddingHorizontal: theme.spacing.lg,
                paddingTop: 22,
                paddingBottom: 14,
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.fontFamily.serif.regular,
                  fontSize: 20,
                  color: theme.colors.neutral[900],
                }}
              >
                {hasActiveFilters
                  ? 'Filtered'
                  : selectedVibe === 'All'
                  ? 'Explore'
                  : selectedVibe}
              </Text>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 13,
                  color: theme.colors.neutral[400],
                }}
              >
                {hasActiveFilters
                  ? `· ${gridProducts.length} items`
                  : selectedVibe !== 'All'
                  ? '· curated for you'
                  : ''}
              </Text>
            </View>

            {/* Masonry grid */}
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <MasonryLayout
                products={gridProducts}
                onProductPress={(id) => {
                  const p = gridProducts.find((x) => x.id === id);
                  if (p) openSheet(p);
                }}
                onLike={handleLike}
                likedIds={likedIds}
                showSkeleton={gridSkeleton}
                skeletonCount={8}
                emptyStateSubtext={
                  !loadingInitial
                    ? hasActiveFilters
                      ? 'No products match your filters'
                      : 'Pull to refresh or try a different vibe'
                    : undefined
                }
              />
            </View>

            {loadingMore && !hasActiveFilters && (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={theme.colors.primary[400]} />
              </View>
            )}

            {!hasMore && feedProducts.length > 0 && !hasActiveFilters && (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <View
                  style={{
                    width: 32,
                    height: 1,
                    backgroundColor: theme.colors.neutral[200],
                    marginBottom: 10,
                  }}
                />
                <Text
                  style={{
                    fontFamily: typography.fontFamily.sans.regular,
                    fontSize: 12,
                    color: theme.colors.neutral[400],
                    letterSpacing: 0.5,
                  }}
                >
                  You've seen it all · refresh for more
                </Text>
              </View>
            )}
          </>
        )}
      </Animated.ScrollView>

      <ProductSheet
        product={sheetProduct}
        visible={sheetVisible}
        onClose={closeSheet}
        onLike={handleLike}
        onSave={handleSave}
        isLiked={sheetProduct ? likedIds.has(sheetProduct.id) : false}
      />

      <FilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        filterCategory={filterCategory}
        filterColors={filterColors}
        filterSizes={filterSizes}
        filterPriceMax={filterPriceMax}
        filterSortBy={filterSortBy}
        onSetCategory={setFilterCategory}
        onToggleColor={(color) =>
          setFilterColors((prev) =>
            prev.includes(color)
              ? prev.filter((c) => c !== color)
              : [...prev, color]
          )
        }
        onToggleSize={(size) =>
          setFilterSizes((prev) =>
            prev.includes(size)
              ? prev.filter((s) => s !== size)
              : [...prev, size]
          )
        }
        onSetPriceMax={setFilterPriceMax}
        onSetSortBy={setFilterSortBy}
        onClearAll={clearFilters}
      />
    </SafeAreaView>
  );
}

// ── DiscoverHeader ─────────────────────────────────────────────────────────────
function DiscoverHeader({
  isSearchActive,
  searchQuery,
  searchInputRef,
  onSearchChange,
  onActivateSearch,
  onDeactivateSearch,
  searchLoading,
  activeFilterCount,
  onOpenFilters,
}: {
  isSearchActive: boolean;
  searchQuery: string;
  searchInputRef: React.RefObject<TextInput>;
  onSearchChange: (q: string) => void;
  onActivateSearch: () => void;
  onDeactivateSearch: () => void;
  searchLoading: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
}) {
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: '#f8f8f8',
      }}
    >
      {!isSearchActive && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontFamily: typography.fontFamily.serif.regular,
              fontSize: 26,
              color: theme.colors.neutral[900],
              letterSpacing: -0.5,
            }}
          >
            Discover
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* Search bar */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.neutral[100],
            borderRadius: theme.borderRadius.lg,
            paddingHorizontal: 12,
            height: 44,
            gap: 8,
            borderWidth: 1,
            borderColor: isSearchActive
              ? theme.colors.primary[300]
              : 'transparent',
          }}
        >
          <Ionicons
            name={searchLoading ? 'sync' : 'search-outline'}
            size={18}
            color={
              isSearchActive
                ? theme.colors.primary[500]
                : theme.colors.neutral[400]
            }
          />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={onActivateSearch}
            placeholder="Search styles, brands, colours, occasions…"
            placeholderTextColor={theme.colors.neutral[400]}
            style={{
              flex: 1,
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 14,
              color: theme.colors.neutral[900],
              paddingVertical: 0,
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {isSearchActive && (
            <TouchableOpacity
              onPress={onDeactivateSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.medium,
                  fontSize: 13,
                  color: theme.colors.primary[600],
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          onPress={onOpenFilters}
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.borderRadius.lg,
            backgroundColor:
              activeFilterCount > 0
                ? theme.colors.primary[600]
                : theme.colors.neutral[100],
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor:
              activeFilterCount > 0
                ? theme.colors.primary[600]
                : theme.colors.neutral[200],
          }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? '#fff' : theme.colors.neutral[600]}
          />
          {activeFilterCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.semibold,
                  fontSize: 9,
                  color: theme.colors.primary[600],
                }}
              >
                {activeFilterCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── ActiveFilterChips ──────────────────────────────────────────────────────────
function ActiveFilterChips({
  filterCategory,
  filterColors,
  filterSizes,
  filterPriceMax,
  filterSortBy,
  onClearCategory,
  onClearColor,
  onClearSize,
  onClearPrice,
  onClearSort,
  onClearAll,
}: {
  filterCategory: string | null;
  filterColors: string[];
  filterSizes: string[];
  filterPriceMax: number | null;
  filterSortBy: SortOption;
  onClearCategory: () => void;
  onClearColor: (c: string) => void;
  onClearSize: (s: string) => void;
  onClearPrice: () => void;
  onClearSort: () => void;
  onClearAll: () => void;
}) {
  const priceLabel = PRICE_RANGES.find((r) => r.max === filterPriceMax)?.label;
  const sortLabel = SORT_OPTIONS.find((s) => s.value === filterSortBy)?.label;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 8,
        paddingTop: 2,
        gap: 6,
      }}
    >
      {/* Clear all */}
      <TouchableOpacity
        onPress={onClearAll}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 20,
          backgroundColor: theme.colors.neutral[800],
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Ionicons name="close" size={12} color="#fff" />
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.medium,
            fontSize: 12,
            color: '#fff',
          }}
        >
          Clear all
        </Text>
      </TouchableOpacity>

      {filterSortBy !== 'featured' && (
        <RemovableChip label={sortLabel ?? filterSortBy} onRemove={onClearSort} />
      )}
      {filterCategory && (
        <RemovableChip label={filterCategory} onRemove={onClearCategory} />
      )}
      {filterColors.map((c) => (
        <RemovableChip key={c} label={c} onRemove={() => onClearColor(c)} />
      ))}
      {filterSizes.map((s) => (
        <RemovableChip key={s} label={s} onRemove={() => onClearSize(s)} />
      ))}
      {filterPriceMax !== null && priceLabel && (
        <RemovableChip label={priceLabel} onRemove={onClearPrice} />
      )}
    </ScrollView>
  );
}

function RemovableChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onRemove}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#ede9fe',
        borderWidth: 1,
        borderColor: '#c4b5fd',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily.sans.medium,
          fontSize: 12,
          color: '#5b21b6',
        }}
      >
        {label}
      </Text>
      <Ionicons name="close" size={11} color="#7c3aed" />
    </TouchableOpacity>
  );
}

// ── FilterSheet ────────────────────────────────────────────────────────────────
interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filterCategory: string | null;
  filterColors: string[];
  filterSizes: string[];
  filterPriceMax: number | null;
  filterSortBy: SortOption;
  onSetCategory: (cat: string | null) => void;
  onToggleColor: (color: string) => void;
  onToggleSize: (size: string) => void;
  onSetPriceMax: (max: number | null) => void;
  onSetSortBy: (sort: SortOption) => void;
  onClearAll: () => void;
}

function FilterSheet({
  visible,
  onClose,
  filterCategory,
  filterColors,
  filterSizes,
  filterPriceMax,
  filterSortBy,
  onSetCategory,
  onToggleColor,
  onToggleSize,
  onSetPriceMax,
  onSetSortBy,
  onClearAll,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 700,
        duration: 230,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' }}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet panel */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY }],
          backgroundColor: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 12,
          maxHeight: '88%',
        }}
      >
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.neutral[200],
            }}
          />
        </View>

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontFamily: typography.fontFamily.serif.regular,
              fontSize: 20,
              color: theme.colors.neutral[900],
            }}
          >
            Filter & Sort
          </Text>
          <TouchableOpacity onPress={onClearAll}>
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.medium,
                fontSize: 13,
                color: theme.colors.primary[600],
              }}
            >
              Clear all
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={{ marginLeft: 16, padding: 4 }}
          >
            <Ionicons
              name="close"
              size={20}
              color={theme.colors.neutral[600]}
            />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Sort */}
          <FilterSection title="Sort by">
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                paddingHorizontal: 20,
              }}
            >
              {SORT_OPTIONS.map((opt) => {
                const active = filterSortBy === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => onSetSortBy(opt.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 22,
                      backgroundColor: active
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[100],
                      borderWidth: 1,
                      borderColor: active
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[200],
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={13}
                      color={active ? '#fff' : theme.colors.neutral[500]}
                    />
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.sans.medium,
                        fontSize: 13,
                        color: active ? '#fff' : theme.colors.neutral[700],
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Category */}
          <FilterSection title="Category">
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                paddingHorizontal: 20,
              }}
            >
              {CATEGORY_OPTIONS.map((cat) => {
                const active = filterCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => onSetCategory(active ? null : cat)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 22,
                      backgroundColor: active
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[100],
                      borderWidth: 1,
                      borderColor: active
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[200],
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.sans.medium,
                        fontSize: 13,
                        color: active ? '#fff' : theme.colors.neutral[700],
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Price range */}
          <FilterSection title="Price range">
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                paddingHorizontal: 20,
              }}
            >
              {PRICE_RANGES.map((range) => {
                const active = filterPriceMax === range.max;
                return (
                  <TouchableOpacity
                    key={range.label}
                    onPress={() => onSetPriceMax(active ? null : range.max)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 22,
                      backgroundColor: active
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[100],
                      borderWidth: 1,
                      borderColor: active
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[200],
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.sans.medium,
                        fontSize: 13,
                        color: active ? '#fff' : theme.colors.neutral[700],
                      }}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Colours */}
          <FilterSection title="Colour">
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
                paddingHorizontal: 20,
              }}
            >
              {COLOR_OPTIONS.map((color) => {
                const selected = filterColors.includes(color.name);
                return (
                  <TouchableOpacity
                    key={color.name}
                    onPress={() => onToggleColor(color.name)}
                    style={{ alignItems: 'center', gap: 4 }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: color.hex,
                        borderWidth: selected ? 3 : 1.5,
                        borderColor: selected
                          ? theme.colors.primary[600]
                          : theme.colors.neutral[200],
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.sans.regular,
                        fontSize: 10,
                        color: theme.colors.neutral[600],
                      }}
                    >
                      {color.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Size */}
          <FilterSection title="Size">
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                paddingHorizontal: 20,
              }}
            >
              {SIZE_OPTIONS.map((size) => {
                const selected = filterSizes.includes(size);
                return (
                  <TouchableOpacity
                    key={size}
                    onPress={() => onToggleSize(size)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[100],
                      borderWidth: 1,
                      borderColor: selected
                        ? theme.colors.primary[600]
                        : theme.colors.neutral[200],
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.sans.medium,
                        fontSize: 13,
                        color: selected ? '#fff' : theme.colors.neutral[700],
                      }}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Done button */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: theme.colors.primary[600],
              borderRadius: 14,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.semibold,
                fontSize: 16,
                color: '#fff',
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontFamily: typography.fontFamily.sans.semibold,
          fontSize: 12,
          color: theme.colors.neutral[500],
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

// ── VibePills ──────────────────────────────────────────────────────────────────
function VibePills({
  vibes,
  selectedVibe,
  onSelect,
}: {
  vibes: typeof VIBES;
  selectedVibe: string;
  onSelect: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 4,
        paddingTop: 2,
        gap: 8,
      }}
    >
      {vibes.map(({ label }) => {
        const active = selectedVibe === label;
        return (
          <TouchableOpacity
            key={label}
            onPress={() => onSelect(label)}
            activeOpacity={0.75}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 24,
              backgroundColor: active
                ? theme.colors.primary[600]
                : theme.colors.neutral[100],
              borderWidth: 1,
              borderColor: active
                ? theme.colors.primary[600]
                : theme.colors.neutral[200],
            }}
          >
            <Text
              style={{
                fontFamily: active
                  ? typography.fontFamily.sans.semibold
                  : typography.fontFamily.sans.medium,
                fontSize: 13,
                color: active ? '#fff' : theme.colors.neutral[600],
                letterSpacing: 0.1,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── TrendingStrip ──────────────────────────────────────────────────────────────
const TRENDING_CARD_WIDTH = SCREEN_WIDTH * 0.52;
const TRENDING_CARD_SKELETON_HEIGHT = TRENDING_CARD_WIDTH * 1.1;

function TrendingStrip({
  products,
  loading,
  onProductPress,
}: {
  products: Product[];
  loading: boolean;
  onProductPress: (product: Product) => void;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.semibold,
            fontSize: 13,
            color: theme.colors.neutral[700],
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          Trending Now
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={TRENDING_CARD_WIDTH + 12}
        snapToAlignment="start"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          gap: 12,
        }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <TrendingSkeletonCard key={i} />
            ))
          : products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                width={TRENDING_CARD_WIDTH}
                fixedImageHeight={TRENDING_CARD_SKELETON_HEIGHT}
                onPress={() => onProductPress(product)}
              />
            ))}
      </ScrollView>
    </View>
  );
}

function TrendingSkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
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
        width: TRENDING_CARD_WIDTH,
        height: TRENDING_CARD_SKELETON_HEIGHT,
        borderRadius: 18,
        backgroundColor: theme.colors.neutral[200],
        opacity,
      }}
    />
  );
}

// ── CollectionsStrip ───────────────────────────────────────────────────────────
const COLL_CARD_W = SCREEN_WIDTH * 0.56;
const COLL_CARD_H = COLL_CARD_W * 1.46;
const COLL_MINI = (COLL_CARD_W - 2) / 2;

function CollectionsStrip({
  collections,
  coverImages,
}: {
  collections: CollectionRecord[];
  coverImages: Record<string, string[]>;
}) {
  return (
    <View style={{ marginTop: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            fontFamily: typography.fontFamily.serif.regular,
            fontSize: 20,
            color: theme.colors.neutral[900],
            letterSpacing: -0.3,
          }}
        >
          Collections
        </Text>
        <TouchableOpacity
          onPress={() => expoRouter.push('/collection')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.medium,
              fontSize: 13,
              color: theme.colors.primary[600],
            }}
          >
            See all
          </Text>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={theme.colors.primary[600]}
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={COLL_CARD_W + 14}
        snapToAlignment="start"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 12,
          gap: 14,
        }}
      >
        {collections.map((col) => (
          <CollectionCard
            key={col.id}
            collection={col}
            previewImages={
              col.cover_image_url
                ? [col.cover_image_url]
                : (coverImages[col.id] ?? [])
            }
            onPress={() => expoRouter.push(`/collection/${col.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CollectionCard({
  collection,
  previewImages,
  onPress,
}: {
  collection: CollectionRecord;
  previewImages: string[];
  onPress: () => void;
}) {
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const hasCover =
    !!collection.cover_image_url && previewImages.length > 0;
  const mosaicImages = previewImages.slice(0, 4);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: COLL_CARD_W,
        height: COLL_CARD_H,
        borderRadius: 22,
        ...theme.shadows.md,
      }}
    >
      <View
        style={{
          width: COLL_CARD_W,
          height: COLL_CARD_H,
          borderRadius: 22,
          overflow: 'hidden',
          backgroundColor: theme.colors.neutral[200],
        }}
      >
        {hasCover ? (
          <Image
            source={{ uri: previewImages[0] }}
            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          />
        ) : mosaicImages.length > 0 ? (
          <View
            style={{
              width: COLL_CARD_W,
              height: COLL_CARD_H,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            {Array.from({ length: 4 }).map((_, idx) => {
              const url = mosaicImages[idx];
              if (!url || imgErrors.has(idx)) {
                return (
                  <View
                    key={idx}
                    style={{
                      width: COLL_MINI,
                      height: COLL_CARD_H / 2 - 0.75,
                      backgroundColor: theme.colors.neutral[200],
                    }}
                  />
                );
              }
              return (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={{
                    width: COLL_MINI,
                    height: COLL_CARD_H / 2 - 0.75,
                    resizeMode: 'cover',
                  }}
                  onError={() =>
                    setImgErrors((prev) => new Set(prev).add(idx))
                  }
                />
              );
            })}
          </View>
        ) : (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons
              name="images-outline"
              size={36}
              color={theme.colors.neutral[400]}
            />
          </View>
        )}

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {LinearGradient ? (
            <LinearGradient
              colors={[
                'transparent',
                'rgba(0,0,0,0.55)',
                'rgba(0,0,0,0.88)',
              ]}
              style={{
                paddingHorizontal: 14,
                paddingTop: 40,
                paddingBottom: 14,
              }}
            >
              <CollCardText collection={collection} />
            </LinearGradient>
          ) : (
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                paddingHorizontal: 14,
                paddingTop: 20,
                paddingBottom: 14,
              }}
            >
              <CollCardText collection={collection} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CollCardText({ collection }: { collection: CollectionRecord }) {
  return (
    <>
      <Text
        numberOfLines={2}
        style={{
          fontFamily: typography.fontFamily.serif.medium,
          fontSize: 16,
          color: '#fff',
          lineHeight: 21,
          letterSpacing: 0.1,
        }}
      >
        {collection.name}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 5,
        }}
      >
        <Ionicons
          name="bookmark-outline"
          size={10}
          color="rgba(255,255,255,0.6)"
        />
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 11,
            color: 'rgba(255,255,255,0.65)',
          }}
        >
          {collection.saves_count} saves
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>·</Text>
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 11,
            color: 'rgba(255,255,255,0.65)',
          }}
        >
          {collection.product_ids.length} items
        </Text>
      </View>
    </>
  );
}
