/**
 * Discover / Explore screen
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │  Header: logo + search bar              │
 *   │  Vibe pills (style mood filter)         │
 *   │  ─ Trending strip (horizontal)          │
 *   │  ─ Masonry explore feed (infinite)      │
 *   └─────────────────────────────────────────┘
 *
 * Tapping any product opens a ProductSheet (no page navigation from grid).
 * Search mode replaces the feed with instant search results.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';
import { getProducts } from '../../lib/productsApi';
import { exploreService, feedService } from '../../lib/feedService';
import { getCollections, Collection } from '../../data/collections';
import { interactionService } from '../../lib/interactionService';
import { useAuth } from '../../contexts/AuthContext';
import { useWardrobe } from '../../contexts/WardrobeContext';
import { ProductSheet } from '../../components/ui/ProductSheet';
import MasonryLayout from '../../components/layouts/MasonryLayout';

let LinearGradient: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}
let Haptics: typeof import('expo-haptics') | null = null;
try { Haptics = require('expo-haptics'); } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Vibe / style moods ────────────────────────────────────────────────────────
const VIBES = [
  { label: 'All',        icon: 'apps-outline' },
  { label: 'Casual',     icon: 'sunny-outline' },
  { label: 'Minimal',    icon: 'square-outline' },
  { label: 'Bohemian',   icon: 'leaf-outline' },
  { label: 'Formal',     icon: 'briefcase-outline' },
  { label: 'Street',     icon: 'flash-outline' },
  { label: 'Date Night', icon: 'heart-outline' },
  { label: 'Sporty',     icon: 'barbell-outline' },
  { label: 'Party',      icon: 'sparkles-outline' },
] as const;

const PAGE_SIZE = 24;

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const { user } = useAuth();
  const { favouriteIds, toggleFavourite } = useWardrobe();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedVibe, setSelectedVibe] = useState<string>('All');
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [feedProducts, setFeedProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allProductsCache, setAllProductsCache] = useState<Product[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  // ProductSheet
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Collections strip
  const [collections, setCollections] = useState<Collection[]>([]);

  // Gender for recommendations
  const [userGender, setUserGender] = useState<string | null>(null);

  // Scroll-based header shrink
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Collections ────────────────────────────────────────────────────────────
  useEffect(() => {
    getProducts({ limit: 300 })
      .then((products) => setCollections(getCollections(products).slice(0, 6)))
      .catch(() => {});
  }, []);

  // ── User gender ────────────────────────────────────────────────────────────
  // Gate: don't load feed until gender is resolved to avoid wrong-gender flash.
  // For guests: immediately ready (null gender = show all).
  const [genderReady, setGenderReady] = useState(!user);

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

  // ── Initial load: trending + first page of explore feed ───────────────────
  const loadInitial = useCallback(async (vibe = 'All') => {
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
  }, [userGender]);

  // Only load once gender is resolved; re-load when vibe changes after that.
  useEffect(() => {
    if (!genderReady) return;
    loadInitial(selectedVibe);
  }, [genderReady, selectedVibe]);

  // ── Load more (infinite scroll) ────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || isSearchActive) return;
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
        // Deduplicate
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
  }, [loadingMore, hasMore, isSearchActive, feedProducts.length, seenIds, userGender, selectedVibe]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate local cache for instant search
  useEffect(() => {
    if (allProductsCache.length === 0) {
      getProducts({ limit: 400, orderBy: ['is_featured', 'created_at'], orderAsc: [false, false] })
        .then((products) => setAllProductsCache(products))
        .catch(() => {});
    }
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
        const results = allProductsCache.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.source_brand_name?.toLowerCase().includes(q) ?? false) ||
            p.category.toLowerCase().includes(q) ||
            (p.subcategory?.toLowerCase().includes(q) ?? false) ||
            (p.style?.some((s) => s.toLowerCase().includes(q)) ?? false)
        );
        setSearchResults(results.slice(0, 60));
        setSearchLoading(false);
      }, 280);
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

  // ── Product interactions ───────────────────────────────────────────────────
  const openSheet = useCallback((product: Product) => {
    Haptics?.selectionAsync().catch(() => {});
    interactionService.logInteraction(user?.id ?? null, product.id, 'view').catch(() => {});
    setSheetProduct(product);
    setSheetVisible(true);
  }, [user?.id]);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    // Keep product for exit animation
    setTimeout(() => setSheetProduct(null), 350);
  }, []);

  const handleLike = useCallback(
    (productId: string) => {
      // toggleFavourite logs the interaction internally when userId is provided
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

  // ── Vibe selection ─────────────────────────────────────────────────────────
  const handleVibeSelect = useCallback((vibe: string) => {
    Haptics?.selectionAsync().catch(() => {});
    setSelectedVibe(vibe);
  }, []);

  // ── Liked set for MasonryLayout ───────────────────────────────────────────
  const likedIds = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  // ── Scroll handler for load-more ──────────────────────────────────────────
  const handleScroll = useCallback(
    (e: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < 800 && !loadingMore && hasMore && !isSearchActive) {
        loadMore();
      }
    },
    [loadMore, loadingMore, hasMore, isSearchActive]
  );

  // ── Determine products to show in grid ───────────────────────────────────
  const gridProducts = isSearchActive ? searchResults : feedProducts;
  const gridSkeleton = loadingInitial && !isSearchActive;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <DiscoverHeader
        isSearchActive={isSearchActive}
        searchQuery={searchQuery}
        searchInputRef={searchInputRef}
        onSearchChange={handleSearchChange}
        onActivateSearch={activateSearch}
        onDeactivateSearch={deactivateSearch}
        searchLoading={searchLoading}
      />

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Vibe pills — always visible */}
        {!isSearchActive && (
          <VibePills
            vibes={VIBES}
            selectedVibe={selectedVibe}
            onSelect={handleVibeSelect}
          />
        )}

        {/* ── Search state ───────────────────────────────────────────────── */}
        {isSearchActive && (
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: 8 }}>
            {searchLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={theme.colors.primary[500]} />
              </View>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="search-outline" size={36} color={theme.colors.neutral[300]} />
                <Text
                  style={{
                    marginTop: 10,
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 14,
                    color: theme.colors.neutral[500],
                  }}
                >
                  No results for "{searchQuery}"
                </Text>
              </View>
            ) : (
              <MasonryLayout
                products={searchResults}
                onProductPress={(id) => {
                  const p = searchResults.find((x) => x.id === id);
                  if (p) openSheet(p);
                }}
                onLike={handleLike}
                likedIds={likedIds}
                showSkeleton={false}
              />
            )}
          </View>
        )}

        {/* ── Normal explore state ───────────────────────────────────────── */}
        {!isSearchActive && (
          <>
            {/* Trending strip */}
            {(trendingProducts.length > 0 || loadingInitial) && (
              <TrendingStrip
                products={trendingProducts}
                loading={loadingInitial}
                onProductPress={openSheet}
              />
            )}

            {/* Collections strip */}
            {collections.length > 0 && (
              <CollectionsStrip collections={collections} />
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
                {selectedVibe === 'All' ? 'Explore' : selectedVibe}
              </Text>
              {selectedVibe !== 'All' && (
                <Text
                  style={{
                    fontFamily: typography.fontFamily.sans.regular,
                    fontSize: 13,
                    color: theme.colors.neutral[400],
                  }}
                >
                  · curated for you
                </Text>
              )}
            </View>

            {/* Masonry grid */}
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <MasonryLayout
                products={gridProducts}
                onProductPress={(id) => {
                  const p = feedProducts.find((x) => x.id === id);
                  if (p) openSheet(p);
                }}
                onLike={handleLike}
                likedIds={likedIds}
                showSkeleton={gridSkeleton}
                skeletonCount={8}
                emptyStateSubtext={
                  !loadingInitial
                    ? 'Pull to refresh or try a different vibe'
                    : undefined
                }
              />
            </View>

            {/* Load-more indicator */}
            {loadingMore && (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={theme.colors.primary[400]} />
              </View>
            )}

            {/* End of feed */}
            {!hasMore && feedProducts.length > 0 && (
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

      {/* ── ProductSheet ───────────────────────────────────────────────────── */}
      <ProductSheet
        product={sheetProduct}
        visible={sheetVisible}
        onClose={closeSheet}
        onLike={handleLike}
        onSave={handleSave}
        isLiked={sheetProduct ? likedIds.has(sheetProduct.id) : false}
      />
    </SafeAreaView>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function DiscoverHeader({
  isSearchActive,
  searchQuery,
  searchInputRef,
  onSearchChange,
  onActivateSearch,
  onDeactivateSearch,
  searchLoading,
}: {
  isSearchActive: boolean;
  searchQuery: string;
  searchInputRef: React.RefObject<TextInput>;
  onSearchChange: (q: string) => void;
  onActivateSearch: () => void;
  onDeactivateSearch: () => void;
  searchLoading: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: '#fff',
      }}
    >
      {/* Title row */}
      {!isSearchActive && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
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

      {/* Search bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.neutral[100],
          borderRadius: theme.borderRadius.lg,
          paddingHorizontal: 12,
          height: 44,
          gap: 8,
          borderWidth: 1,
          borderColor: isSearchActive ? theme.colors.primary[300] : 'transparent',
        }}
      >
        <Ionicons
          name={searchLoading ? 'sync' : 'search-outline'}
          size={18}
          color={isSearchActive ? theme.colors.primary[500] : theme.colors.neutral[400]}
        />
        <TextInput
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={onActivateSearch}
          placeholder="Search styles, brands, occasions…"
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
          <TouchableOpacity onPress={onDeactivateSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
    </View>
  );
}

// ── Vibe Pills ─────────────────────────────────────────────────────────────────
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
              backgroundColor: active ? theme.colors.primary[600] : theme.colors.neutral[100],
              borderWidth: 1,
              borderColor: active ? theme.colors.primary[600] : theme.colors.neutral[200],
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

// ── Trending Strip ─────────────────────────────────────────────────────────────
const TRENDING_CARD_WIDTH = SCREEN_WIDTH * 0.52;
const TRENDING_CARD_HEIGHT = TRENDING_CARD_WIDTH * 1.38;

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
      {/* Strip header */}
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

      {/* Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={TRENDING_CARD_WIDTH + 12}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 12 }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <TrendingSkeletonCard key={i} />
            ))
          : products.map((product) => (
              <TrendingCard
                key={product.id}
                product={product}
                onPress={() => onProductPress(product)}
              />
            ))}
      </ScrollView>
    </View>
  );
}

function TrendingCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.image_urls?.[0];
  const hasDiscount = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: TRENDING_CARD_WIDTH,
        height: TRENDING_CARD_HEIGHT,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[100],
        ...theme.shadows.md,
      }}
    >
      {imageUrl && !imgError ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.neutral[100],
          }}
        >
          <Ionicons name="image-outline" size={32} color={theme.colors.neutral[300]} />
        </View>
      )}

      {/* Gradient overlay */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {LinearGradient ? (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.92)']}
            style={{ padding: 12, paddingTop: 32 }}
          >
            <TrendingCardContent
              product={product}
              displayPrice={displayPrice}
              hasDiscount={hasDiscount}
              discountPct={discountPct}
            />
          </LinearGradient>
        ) : (
          <View
            style={{
              padding: 12,
              paddingTop: 32,
              backgroundColor: 'rgba(0,0,0,0.75)',
            }}
          >
            <TrendingCardContent
              product={product}
              displayPrice={displayPrice}
              hasDiscount={hasDiscount}
              discountPct={discountPct}
            />
          </View>
        )}
      </View>

      {/* Discount badge */}
      {hasDiscount && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: theme.colors.error,
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.bold,
              fontSize: 10,
              color: '#fff',
            }}
          >
            -{discountPct}%
          </Text>
        </View>
      )}

      {/* Trending badge */}
      <View
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 8,
          paddingHorizontal: 7,
          paddingVertical: 3,
        }}
      >
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.semibold,
            fontSize: 9,
            color: '#fff',
            letterSpacing: 0.5,
          }}
        >
          TRENDING
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function TrendingCardContent({
  product,
  displayPrice,
  hasDiscount,
  discountPct,
}: {
  product: Product;
  displayPrice: number;
  hasDiscount: boolean;
  discountPct: number;
}) {
  return (
    <>
      {product.source_brand_name ? (
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.medium,
            fontSize: 9,
            color: 'rgba(255,255,255,0.65)',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {product.source_brand_name}
        </Text>
      ) : null}
      <Text
        style={{
          fontFamily: typography.fontFamily.sans.semibold,
          fontSize: 13,
          color: '#fff',
          lineHeight: 18,
          marginBottom: 5,
        }}
        numberOfLines={2}
      >
        {product.title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.bold,
            fontSize: 14,
            color: '#fff',
          }}
        >
          ₹{displayPrice.toLocaleString('en-IN')}
        </Text>
        {hasDiscount && (
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 10,
              color: 'rgba(255,255,255,0.5)',
              textDecorationLine: 'line-through',
            }}
          >
            ₹{product.price.toLocaleString('en-IN')}
          </Text>
        )}
      </View>
    </>
  );
}

function TrendingSkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View
      style={{
        width: TRENDING_CARD_WIDTH,
        height: TRENDING_CARD_HEIGHT,
        borderRadius: 18,
        backgroundColor: theme.colors.neutral[200],
        opacity,
      }}
    />
  );
}

// ── Collections Strip ──────────────────────────────────────────────────────────
import { router as expoRouter } from 'expo-router';

const COLL_CARD_W = SCREEN_WIDTH * 0.42;
const COLL_IMG_SIZE = (COLL_CARD_W - 2) / 2; // 2x2 mosaic cell

function CollectionsStrip({ collections }: { collections: Collection[] }) {
  return (
    <View style={{ marginTop: 20 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
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
          Collections
        </Text>
        <TouchableOpacity
          onPress={() => expoRouter.push('/collection')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={COLL_CARD_W + 12}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingVertical: 6, gap: 12 }}
      >
        {collections.map((col) => (
          <CollectionCard
            key={col.id}
            collection={col}
            onPress={() => expoRouter.push(`/collection/${col.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CollectionCard({
  collection,
  onPress,
}: {
  collection: Collection;
  onPress: () => void;
}) {
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const images = collection.coverImages.slice(0, 4);

  // Shadow lives on outer wrapper (no overflow:hidden so shadow isn't clipped).
  // Border radius + overflow:hidden are on the inner content view.
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        width: COLL_CARD_W,
        borderRadius: 14,
        backgroundColor: theme.colors.neutral[50],
        ...theme.shadows.sm,
      }}
    >
      <View style={{ borderRadius: 14, overflow: 'hidden' }}>
        {/* 2×2 mosaic */}
        <View
          style={{
            width: COLL_CARD_W,
            height: COLL_CARD_W,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {Array.from({ length: 4 }).map((_, idx) => {
            const url = images[idx];
            if (!url || imgErrors.has(idx)) {
              return (
                <View
                  key={idx}
                  style={{
                    width: COLL_IMG_SIZE,
                    height: COLL_IMG_SIZE,
                    backgroundColor: theme.colors.neutral[200],
                  }}
                />
              );
            }
            return (
              <Image
                key={idx}
                source={{ uri: url }}
                style={{ width: COLL_IMG_SIZE, height: COLL_IMG_SIZE, resizeMode: 'cover' }}
                onError={() => setImgErrors((prev) => new Set(prev).add(idx))}
              />
            );
          })}
        </View>

        {/* Info */}
        <View style={{ padding: 10 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: typography.fontFamily.serif.medium,
              fontSize: 13,
              color: theme.colors.neutral[900],
            }}
          >
            {collection.name}
          </Text>
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 10,
              color: theme.colors.neutral[400],
              marginTop: 2,
            }}
          >
            {collection.saves} saves
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
