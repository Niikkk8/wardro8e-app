/**
 * /collection/[id] — Collection detail page.
 *
 * Fetches from Supabase. Owners can edit name/description, toggle visibility,
 * add/remove products. Visitors can save the collection.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Switch,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';
import { getProductsByIds, getProducts } from '../../lib/productsApi';
import { useAuth } from '../../contexts/AuthContext';
import {
  CollectionRecord,
  fetchCollectionById,
  updateCollection,
  deleteCollection,
  toggleSaveCollection,
  isSavedByUser,
  removeProductFromCollection,
  addProductToCollection,
} from '../../lib/collectionsService';

let LinearGradient: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / 2;

export default function CollectionDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [collection, setCollection] = useState<CollectionRecord | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showAddProducts, setShowAddProducts] = useState(false);

  const isOwner = user && collection?.user_id === user.id;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const col = await fetchCollectionById(id);
      setCollection(col);
      if (col && col.product_ids.length > 0) {
        const prods = await getProductsByIds(col.product_ids);
        const byId = new Map(prods.map((p) => [p.id, p]));
        setProducts(col.product_ids.map((pid) => byId.get(pid)).filter(Boolean) as Product[]);
      } else {
        setProducts([]);
      }
      if (user && col) {
        const saved = await isSavedByUser(user.id, col.id);
        setIsSaved(saved);
      }
    } catch {}
    finally { setLoading(false); }
  }, [id, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveToggle = useCallback(async () => {
    if (!user || !collection) return;
    setSavingToggle(true);
    try {
      const nowSaved = await toggleSaveCollection(user.id, collection.id);
      setIsSaved(nowSaved);
      setCollection((prev) =>
        prev
          ? { ...prev, saves_count: prev.saves_count + (nowSaved ? 1 : -1) }
          : prev
      );
    } catch {}
    finally { setSavingToggle(false); }
  }, [user?.id, collection?.id]);

  const handleRemoveProduct = useCallback(async (productId: string) => {
    if (!collection) return;
    await removeProductFromCollection(collection.id, productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCollection((prev) =>
      prev ? { ...prev, product_ids: prev.product_ids.filter((id) => id !== productId) } : prev
    );
  }, [collection?.id]);

  const handleProductAdded = useCallback(async (product: Product) => {
    if (!collection) return;
    if (collection.product_ids.includes(product.id)) return;
    await addProductToCollection(collection.id, product.id);
    setProducts((prev) => [...prev, product]);
    setCollection((prev) =>
      prev ? { ...prev, product_ids: [...prev.product_ids, product.id] } : prev
    );
  }, [collection?.id, collection?.product_ids]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Collection',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!collection) return;
            await deleteCollection(collection.id);
            router.back();
          },
        },
      ]
    );
  }, [collection?.id]);

  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (!collection) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 20, color: theme.colors.neutral[800], textAlign: 'center' }}>
            Collection not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.colors.primary[500], borderRadius: 14 }}
          >
            <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 14, color: '#fff' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Cover images for the hero
  const coverImages = collection.cover_image_url
    ? [collection.cover_image_url]
    : products.slice(0, 4).map((p) => p.image_urls?.[0]).filter(Boolean) as string[];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
        {/* ── Full-bleed hero with gradient overlay ── */}
        <DetailHero
          coverImages={coverImages}
          collection={collection}
          insetTop={insets.top}
          isOwner={!!isOwner}
          isSaved={isSaved}
          savingToggle={savingToggle}
          userLoggedIn={!!user}
          onBack={() => router.back()}
          onEdit={() => setShowEditSheet(true)}
          onDelete={handleDelete}
          onSaveToggle={handleSaveToggle}
        />

        {/* ── White content below hero ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          {/* Stats row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
            <StatChip icon="layers-outline" value={collection.product_ids.length} label="items" />
            <View style={{ width: 1, height: 28, backgroundColor: theme.colors.neutral[200], marginHorizontal: 14 }} />
            <StatChip icon="bookmark-outline" value={collection.saves_count} label="saves" />
            <View style={{ flex: 1 }} />
            {/* Owner badge */}
            {isOwner && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: collection.is_public ? theme.colors.primary[50] : theme.colors.neutral[100], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                <Ionicons name={collection.is_public ? 'globe-outline' : 'lock-closed-outline'} size={11} color={collection.is_public ? theme.colors.primary[600] : theme.colors.neutral[500]} />
                <Text style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 11, color: collection.is_public ? theme.colors.primary[600] : theme.colors.neutral[500] }}>
                  {collection.is_public ? 'Public' : 'Private'}
                </Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {collection.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 }}>
              {collection.tags.map((tag) => (
                <View key={tag} style={{ paddingHorizontal: 12, paddingVertical: 5, backgroundColor: theme.colors.primary[50], borderRadius: 20, borderWidth: 1, borderColor: theme.colors.primary[100] }}>
                  <Text style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 12, color: theme.colors.primary[700] }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Products section header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.neutral[100] }}>
            <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 18, color: theme.colors.neutral[900] }}>
              {products.length} {products.length === 1 ? 'piece' : 'pieces'}
            </Text>
            {isOwner && (
              <TouchableOpacity
                onPress={() => setShowAddProducts(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primary[500], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={15} color="#fff" />
                <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 12, color: '#fff' }}>Add Products</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Product grid */}
        {products.length > 0 ? (
          <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: 14 }}>
            <MasonryGrid
              products={products}
              isOwner={!!isOwner}
              onProductPress={(pid) => router.push(`/product/${pid}`)}
              onRemove={isOwner ? handleRemoveProduct : undefined}
            />
          </View>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <Ionicons name="images-outline" size={48} color={theme.colors.neutral[200]} />
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 14,
                color: theme.colors.neutral[400],
                marginTop: 12,
              }}
            >
              {isOwner ? 'Add products to get started' : 'No products yet'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit sheet */}
      {isOwner && (
        <EditCollectionSheet
          visible={showEditSheet}
          collection={collection}
          onClose={() => setShowEditSheet(false)}
          onSaved={(updated) => {
            setCollection(updated);
            setShowEditSheet(false);
          }}
        />
      )}

      {/* Add products sheet */}
      {isOwner && (
        <AddProductsSheet
          visible={showAddProducts}
          existingIds={collection.product_ids}
          onClose={() => setShowAddProducts(false)}
          onAdd={handleProductAdded}
        />
      )}
    </View>
  );
}

// ── Detail Hero — full-bleed with floating nav + overlaid info ────────────────

function DetailHero({
  coverImages,
  collection,
  insetTop,
  isOwner,
  isSaved,
  savingToggle,
  userLoggedIn,
  onBack,
  onEdit,
  onDelete,
  onSaveToggle,
}: {
  coverImages: string[];
  collection: CollectionRecord;
  insetTop: number;
  isOwner: boolean;
  isSaved: boolean;
  savingToggle: boolean;
  userLoggedIn: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveToggle: () => void;
}) {
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const heroH = SCREEN_WIDTH * 1.08; // tall portrait
  const hasSingle = coverImages.length === 1;
  const cellW = (SCREEN_WIDTH - 2) / 2;
  const cellH = heroH / 2 - 1;

  return (
    <View style={{ width: SCREEN_WIDTH, height: heroH }}>
      {/* Background image / mosaic */}
      {hasSingle && coverImages[0] ? (
        <Image
          source={{ uri: coverImages[0] }}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          onError={() => setErrors((prev) => new Set(prev).add(0))}
        />
      ) : coverImages.length > 1 ? (
        <View style={{ width: SCREEN_WIDTH, height: heroH, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
          {Array.from({ length: 4 }).map((_, idx) => {
            const url = coverImages[idx];
            if (!url || errors.has(idx)) {
              return <View key={idx} style={{ width: cellW, height: cellH, backgroundColor: theme.colors.neutral[200] }} />;
            }
            return (
              <Image
                key={idx}
                source={{ uri: url }}
                style={{ width: cellW, height: cellH, resizeMode: 'cover' }}
                onError={() => setErrors((prev) => new Set(prev).add(idx))}
              />
            );
          })}
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.neutral[200], alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="images-outline" size={56} color={theme.colors.neutral[400]} />
        </View>
      )}

      {/* Top gradient for nav legibility */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        {LinearGradient ? (
          <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={{ height: insetTop + 64 }} />
        ) : (
          <View style={{ height: insetTop + 64, backgroundColor: 'rgba(0,0,0,0.3)' }} />
        )}
      </View>

      {/* Bottom gradient with title + description */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {LinearGradient ? (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
            style={{ paddingHorizontal: 20, paddingTop: 80, paddingBottom: 24 }}
          >
            <HeroInfo collection={collection} />
          </LinearGradient>
        ) : (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 }}>
            <HeroInfo collection={collection} />
          </View>
        )}
      </View>

      {/* Floating nav bar */}
      <View
        style={{
          position: 'absolute',
          top: insetTop + 8,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={onBack}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Logo */}
        <Text style={{ fontFamily: typography.fontFamily.serif.regular, fontSize: 15, color: 'rgba(255,255,255,0.9)', letterSpacing: 1 }}>
          wardro8e
        </Text>

        {/* Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isOwner ? (
            <>
              <FloatBtn icon="pencil-outline" onPress={onEdit} />
              <FloatBtn icon="trash-outline" onPress={onDelete} danger />
            </>
          ) : (
            userLoggedIn && (
              <TouchableOpacity
                onPress={onSaveToggle}
                disabled={savingToggle}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: isSaved ? 'rgba(255,255,255,0.95)' : theme.colors.primary[500],
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 22,
                }}
                activeOpacity={0.85}
              >
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={14} color={isSaved ? theme.colors.primary[600] : '#fff'} />
                <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 12, color: isSaved ? theme.colors.primary[600] : '#fff' }}>
                  {isSaved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </View>
  );
}

function FloatBtn({ icon, onPress, danger }: { icon: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: danger ? 'rgba(239,68,68,0.75)' : 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name={icon as any} size={17} color="#fff" />
    </TouchableOpacity>
  );
}

function HeroInfo({ collection }: { collection: CollectionRecord }) {
  return (
    <>
      <Text
        numberOfLines={2}
        style={{
          fontFamily: typography.fontFamily.serif.bold,
          fontSize: 28,
          color: '#fff',
          lineHeight: 34,
          letterSpacing: -0.3,
        }}
      >
        {collection.name}
      </Text>
      {collection.description ? (
        <Text
          numberOfLines={2}
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 13,
            color: 'rgba(255,255,255,0.72)',
            marginTop: 6,
            lineHeight: 19,
          }}
        >
          {collection.description}
        </Text>
      ) : null}
    </>
  );
}

// ── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon as any} size={15} color={theme.colors.neutral[500]} />
      <Text style={{ fontFamily: typography.fontFamily.sans.bold, fontSize: 16, color: theme.colors.neutral[900] }}>
        {value}
      </Text>
      <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 13, color: theme.colors.neutral[400] }}>
        {label}
      </Text>
    </View>
  );
}

// ── Masonry Grid ─────────────────────────────────────────────────────────────

function MasonryGrid({
  products,
  isOwner,
  onProductPress,
  onRemove,
}: {
  products: Product[];
  isOwner: boolean;
  onProductPress: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const columns = useMemo(() => {
    const cols: Product[][] = [[], []];
    const heights = [0, 0];
    products.forEach((item) => {
      const est = COLUMN_WIDTH * (1.2 + Math.random() * 0.5);
      const shorter = heights[0] <= heights[1] ? 0 : 1;
      cols[shorter].push(item);
      heights[shorter] += est + GAP;
    });
    return cols;
  }, [products]);

  return (
    <View style={{ flexDirection: 'row', gap: GAP }}>
      {columns.map((col, colIdx) => (
        <View key={colIdx} style={{ width: COLUMN_WIDTH, gap: GAP }}>
          {col.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              width={COLUMN_WIDTH}
              isOwner={isOwner}
              onPress={() => onProductPress(product.id)}
              onRemove={onRemove ? () => onRemove(product.id) : undefined}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Product Tile ─────────────────────────────────────────────────────────────

function ProductTile({
  product,
  width,
  isOwner,
  onPress,
  onRemove,
}: {
  product: Product;
  width: number;
  isOwner: boolean;
  onPress: () => void;
  onRemove?: () => void;
}) {
  const [imageHeight, setImageHeight] = useState(width * 1.4);
  const [imageError, setImageError] = useState(false);
  const imageUrl = product.image_urls?.[0];
  const hasDiscount = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;

  const handleLoad = (event: any) => {
    const { width: w, height: h } = event.nativeEvent.source;
    if (w && h) setImageHeight(width * (h / w));
  };

  if (!imageUrl || imageError) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[100],
        ...theme.shadows.sm,
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ width: '100%', height: imageHeight, resizeMode: 'cover' }}
        onLoad={handleLoad}
        onError={() => setImageError(true)}
      />

      {/* Owner: remove button */}
      {isOwner && onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          style={{
            position: 'absolute',
            top: 7,
            right: 7,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="close" size={13} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Overlay */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 7 }}>
        {product.source_brand_name && (
          <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {product.source_brand_name}
          </Text>
        )}
        <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 12, color: '#fff' }}>
          {product.title}
        </Text>
        <Text style={{ fontFamily: typography.fontFamily.sans.bold, fontSize: 12, color: '#fff', marginTop: 1 }}>
          ₹{displayPrice.toLocaleString('en-IN')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Edit Collection Sheet ────────────────────────────────────────────────────

function EditCollectionSheet({
  visible,
  collection,
  onClose,
  onSaved,
}: {
  visible: boolean;
  collection: CollectionRecord;
  onClose: () => void;
  onSaved: (updated: CollectionRecord) => void;
}) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? '');
  const [isPublic, setIsPublic] = useState(collection.is_public);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(collection.name);
      setDescription(collection.description ?? '');
      setIsPublic(collection.is_public);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateCollection(collection.id, {
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      });
      onSaved({
        ...collection,
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      });
    } catch {
      Alert.alert('Error', 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
            <View style={{ alignItems: 'center', paddingTop: 12 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.neutral[200] }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[100] }}>
              <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 20, color: theme.colors.neutral[900] }}>Edit Collection</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.colors.neutral[500]} /></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
              <View>
                <Text style={label}>Name</Text>
                <TextInput value={name} onChangeText={setName} style={input} placeholderTextColor={theme.colors.neutral[400]} maxLength={60} />
              </View>
              <View>
                <Text style={label}>Description</Text>
                <TextInput value={description} onChangeText={setDescription} multiline style={[input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]} placeholderTextColor={theme.colors.neutral[400]} maxLength={200} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.neutral[50], padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.neutral[100] }}>
                <Ionicons name={isPublic ? 'globe-outline' : 'lock-closed-outline'} size={18} color={isPublic ? theme.colors.primary[500] : theme.colors.neutral[500]} />
                <Text style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 14, color: theme.colors.neutral[800], flex: 1, marginLeft: 10 }}>
                  {isPublic ? 'Public' : 'Private'}
                </Text>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[400] }}
                  thumbColor={isPublic ? theme.colors.primary[600] : theme.colors.neutral[400]}
                />
              </View>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!name.trim() || saving}
                style={{ height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: name.trim() ? theme.colors.primary[500] : theme.colors.neutral[200], marginTop: 4 }}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 15, color: name.trim() ? '#fff' : theme.colors.neutral[400] }}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Add Products Sheet ───────────────────────────────────────────────────────

function AddProductsSheet({
  visible,
  existingIds,
  onClose,
  onAdd,
}: {
  visible: boolean;
  existingIds: string[];
  onClose: () => void;
  onAdd: (product: Product) => void;
}) {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible && catalog.length === 0) {
      setLoading(true);
      getProducts({ limit: 200, orderBy: ['is_featured', 'created_at'], orderAsc: [false, false] })
        .then(setCatalog)
        .finally(() => setLoading(false));
    }
    if (!visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    if (!query.trim()) return catalog.filter((p) => !existingIds.includes(p.id));
    const q = query.toLowerCase();
    return catalog.filter(
      (p) =>
        !existingIds.includes(p.id) &&
        (p.title.toLowerCase().includes(q) || (p.source_brand_name?.toLowerCase().includes(q) ?? false))
    );
  }, [catalog, query, existingIds.join(',')]);

  const THUMB = 80;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <TouchableOpacity style={{ flex: 0.25 }} onPress={onClose} activeOpacity={1} />
        <View style={{ flex: 0.75, backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
          <View style={{ alignItems: 'center', paddingTop: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.neutral[200] }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[100] }}>
            <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 20, color: theme.colors.neutral[900] }}>Add Products</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.colors.neutral[500]} /></TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.neutral[100], borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 8, borderWidth: 1, borderColor: theme.colors.neutral[200] }}>
              <Ionicons name="search-outline" size={16} color={theme.colors.neutral[400]} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search products…"
                placeholderTextColor={theme.colors.neutral[400]}
                style={{ flex: 1, fontFamily: typography.fontFamily.sans.regular, fontSize: 14, color: theme.colors.neutral[900], paddingVertical: 0 }}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={theme.colors.primary[500]} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            >
              {filtered.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => { onAdd(product); }}
                  activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[100], gap: 12 }}
                >
                  <Image
                    source={{ uri: product.image_urls?.[0] }}
                    style={{ width: THUMB, height: THUMB, borderRadius: 10, resizeMode: 'cover', backgroundColor: theme.colors.neutral[100] }}
                  />
                  <View style={{ flex: 1 }}>
                    {product.source_brand_name && (
                      <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 10, color: theme.colors.neutral[400], textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {product.source_brand_name}
                      </Text>
                    )}
                    <Text numberOfLines={2} style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 13, color: theme.colors.neutral[900], lineHeight: 18 }}>
                      {product.title}
                    </Text>
                    <Text style={{ fontFamily: typography.fontFamily.sans.bold, fontSize: 13, color: theme.colors.primary[600], marginTop: 3 }}>
                      ₹{(product.sale_price ?? product.price).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primary[500], alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 14, color: theme.colors.neutral[400] }}>
                    {query ? 'No results' : 'All products added!'}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────
const label = {
  fontFamily: typography.fontFamily.sans.semibold,
  fontSize: 13,
  color: theme.colors.neutral[700],
  marginBottom: 7,
} as const;

const input = {
  backgroundColor: theme.colors.neutral[100],
  borderRadius: 12,
  paddingHorizontal: 14,
  height: 46,
  fontFamily: typography.fontFamily.sans.regular,
  fontSize: 14,
  color: theme.colors.neutral[900],
  borderWidth: 1,
  borderColor: theme.colors.neutral[200],
} as const;
