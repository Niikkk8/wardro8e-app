/**
 * /collection — All public collections, editorial layout, fetched from Supabase.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { fetchPublicCollections, CollectionRecord } from '../../lib/collectionsService';
import { getProductsByIds } from '../../lib/productsApi';
import { Product } from '../../types';

let LinearGradient: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 10;
const COL_W = (SCREEN_WIDTH - 32 - GAP) / 2;

// ── Main Component ──────────────────────────────────────────────────────────

export default function CollectionsListPage() {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [coverImages, setCoverImages] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const data = await fetchPublicCollections(query);
      setCollections(data);

      // Fetch product images for collections without a cover photo
      const missing = data.filter((c) => !c.cover_image_url && c.product_ids.length > 0);
      if (missing.length > 0) {
        const allIds = Array.from(new Set(missing.flatMap((c) => c.product_ids.slice(0, 4))));
        const products = await getProductsByIds(allIds);
        const byId = new Map<string, Product>(products.map((p) => [p.id, p]));
        const covers: Record<string, string[]> = {};
        missing.forEach((col) => {
          covers[col.id] = col.product_ids
            .slice(0, 4)
            .map((id) => byId.get(id)?.image_urls?.[0])
            .filter(Boolean) as string[];
        });
        setCoverImages(covers);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      await load(q.trim() || undefined);
      setSearching(false);
    }, 300);
  };

  const getImages = (col: CollectionRecord) =>
    col.cover_image_url ? [col.cover_image_url] : (coverImages[col.id] ?? []);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 10, padding: 4 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={23} color={theme.colors.neutral[900]} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: typography.fontFamily.serif.regular, fontSize: 26, color: theme.colors.neutral[900], letterSpacing: -0.5 }}>
              Collections
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/create')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary[500], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 13, color: '#fff' }}>
              Create
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.neutral[100], borderRadius: 14, paddingHorizontal: 13, height: 44, gap: 8, borderWidth: 1, borderColor: theme.colors.neutral[200] }}>
          <Ionicons name={searching ? 'sync-outline' : 'search-outline'} size={17} color={theme.colors.neutral[400]} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search collections…"
            placeholderTextColor={theme.colors.neutral[400]}
            style={{ flex: 1, fontFamily: typography.fontFamily.sans.regular, fontSize: 14, color: theme.colors.neutral[900], paddingVertical: 0 }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={theme.colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading && collections.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : collections.length === 0 ? (
        <EmptyState searchQuery={searchQuery} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 52 }}>
          <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 12, color: theme.colors.neutral[400], paddingHorizontal: 16, marginBottom: 14 }}>
            {collections.length} collection{collections.length !== 1 ? 's' : ''}
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </Text>

          {/* Hero — first collection full width */}
          {collections[0] && (
            <HeroCard
              collection={collections[0]}
              images={getImages(collections[0])}
              onPress={() => router.push(`/collection/${collections[0].id}`)}
            />
          )}

          {/* Rest — editorial 2-col grid */}
          {collections.length > 1 && (
            <EditorialGrid
              collections={collections.slice(1)}
              getImages={getImages}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Ionicons name="albums-outline" size={52} color={theme.colors.neutral[200]} />
      <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 20, color: theme.colors.neutral[700], marginTop: 18, textAlign: 'center' }}>
        {searchQuery ? `No results for "${searchQuery}"` : 'No collections yet'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/create')}
          style={{ marginTop: 20, backgroundColor: theme.colors.primary[500], paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
          activeOpacity={0.85}
        >
          <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 14, color: '#fff' }}>
            Create the first one
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Hero Card — full width, tall ────────────────────────────────────────────

function HeroCard({
  collection,
  images,
  onPress,
}: {
  collection: CollectionRecord;
  images: string[];
  onPress: () => void;
}) {
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const heroH = SCREEN_WIDTH * 0.72;
  const hasSingle = images.length === 1;
  const miniW = (SCREEN_WIDTH - 32 - 2) / 2;
  const miniH = heroH / 2 - 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{ marginHorizontal: 16, marginBottom: 10, borderRadius: 22, ...theme.shadows.md }}
    >
      <View style={{ width: '100%', height: heroH, borderRadius: 22, overflow: 'hidden', backgroundColor: theme.colors.neutral[200] }}>
        {/* Image(s) */}
        {hasSingle ? (
          <Image source={{ uri: images[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
        ) : images.length > 1 ? (
          <View style={{ width: '100%', height: heroH, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const url = images[idx];
              if (!url || imgErrors.has(idx)) {
                return <View key={idx} style={{ width: miniW, height: miniH, backgroundColor: theme.colors.neutral[300] }} />;
              }
              return (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={{ width: miniW, height: miniH, resizeMode: 'cover' }}
                  onError={() => setImgErrors((prev) => new Set(prev).add(idx))}
                />
              );
            })}
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="images-outline" size={48} color={theme.colors.neutral[400]} />
          </View>
        )}

        {/* Gradient overlay */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {LinearGradient ? (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.85)']}
              style={{ paddingHorizontal: 18, paddingTop: 60, paddingBottom: 18 }}
            >
              <HeroText collection={collection} large />
            </LinearGradient>
          ) : (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 18, paddingTop: 28, paddingBottom: 18 }}>
              <HeroText collection={collection} large />
            </View>
          )}
        </View>

        {/* Featured label */}
        <View style={{ position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
          <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 10, color: '#fff', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Featured
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HeroText({ collection, large }: { collection: CollectionRecord; large?: boolean }) {
  return (
    <>
      <Text
        numberOfLines={2}
        style={{
          fontFamily: typography.fontFamily.serif.bold,
          fontSize: large ? 22 : 15,
          color: '#fff',
          lineHeight: large ? 28 : 20,
          letterSpacing: large ? -0.3 : 0,
        }}
      >
        {collection.name}
      </Text>
      {collection.description ? (
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: large ? 13 : 11,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 4,
          }}
        >
          {collection.description}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Pill icon="bookmark-outline" text={`${collection.saves_count} saves`} />
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <Pill icon="layers-outline" text={`${collection.product_ids.length} items`} />
      </View>
    </>
  );
}

function Pill({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon as any} size={11} color="rgba(255,255,255,0.6)" />
      <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
        {text}
      </Text>
    </View>
  );
}

// ── Editorial Grid — alternating big/small ──────────────────────────────────

function EditorialGrid({
  collections,
  getImages,
}: {
  collections: CollectionRecord[];
  getImages: (col: CollectionRecord) => string[];
}) {
  return (
    <View style={{ paddingHorizontal: 16, gap: GAP }}>
      {collections.map((col) => (
        <GridCard
          key={col.id}
          collection={col}
          images={getImages(col)}
          onPress={() => router.push(`/collection/${col.id}`)}
        />
      ))}
    </View>
  );
}

// ── Grid Card — 2-col with gradient overlay ──────────────────────────────────

function GridCard({
  collection,
  images,
  onPress,
}: {
  collection: CollectionRecord;
  images: string[];
  onPress: () => void;
}) {
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const cardH = COL_W * 1.32;
  const hasCover = images.length === 1;
  const miniW = (COL_W - 1) / 2;
  const miniH = cardH / 2 - 0.5;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: '100%',
        height: cardH,
        borderRadius: 18,
        ...theme.shadows.sm,
      }}
    >
      <View style={{ width: '100%', height: cardH, borderRadius: 18, overflow: 'hidden', backgroundColor: theme.colors.neutral[200] }}>
        {hasCover ? (
          <Image source={{ uri: images[0] }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
        ) : images.length > 1 ? (
          <View style={{ width: '100%', height: cardH, flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const url = images[idx];
              if (!url || imgErrors.has(idx)) {
                return <View key={idx} style={{ width: miniW, height: miniH, backgroundColor: theme.colors.neutral[200] }} />;
              }
              return (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={{ width: miniW, height: miniH, resizeMode: 'cover' }}
                  onError={() => setImgErrors((prev) => new Set(prev).add(idx))}
                />
              );
            })}
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="images-outline" size={32} color={theme.colors.neutral[400]} />
          </View>
        )}

        {/* Gradient overlay */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {LinearGradient ? (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.82)']}
              style={{ paddingHorizontal: 13, paddingTop: 36, paddingBottom: 13 }}
            >
              <HeroText collection={collection} />
            </LinearGradient>
          ) : (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 13, paddingTop: 16, paddingBottom: 13 }}>
              <HeroText collection={collection} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
