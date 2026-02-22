import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';
import { getCollections, Collection } from '../../data/collections';
import { getProducts } from '../../lib/productsApi';
import { useWardrobe, UserCollection } from '../../contexts/WardrobeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / 2;

type Tab = 'favourites' | 'collections';

export default function WardrobePage() {
  const wardrobe = useWardrobe();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('favourites');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    getProducts({ limit: 300 }).then((products) => {
      setAllProducts(products);
      setLoading(false);
    });
  }, []);

  const collections = useMemo(() => getCollections(allProducts), [allProducts]);

  const favouriteProducts = useMemo(
    () =>
      wardrobe.favouriteIds
        .map((id) => allProducts.find((p) => p.id === id))
        .filter(Boolean) as Product[],
    [wardrobe.favouriteIds, allProducts]
  );

  const savedCommunityCollections = useMemo(
    () =>
      wardrobe.savedCollectionIds
        .map((id) => collections.find((c) => c.id === id))
        .filter(Boolean) as Collection[],
    [wardrobe.savedCollectionIds, collections]
  );

  const handleCreateCollection = useCallback(() => {
    if (newName.trim()) {
      wardrobe.createCollection(newName.trim(), newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
      setShowCreateModal(false);
    }
  }, [newName, newDesc, wardrobe]);

  const handleDeleteCollection = useCallback(
    (col: UserCollection) => {
      Alert.alert(
        'Delete Collection',
        `Are you sure you want to delete "${col.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => wardrobe.deleteCollection(col.id),
          },
        ]
      );
    },
    [wardrobe]
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

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View
        className="px-4 pt-3 pb-0 border-b"
        style={{ borderBottomColor: theme.colors.neutral[100] }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text
            style={{
              fontFamily: typography.fontFamily.serif.medium,
              fontSize: 24,
              color: theme.colors.neutral[900],
            }}
          >
            My Wardrobe
          </Text>
          {activeTab === 'collections' && (
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              className="flex-row items-center px-3.5 py-2 rounded-full"
              style={{ backgroundColor: theme.colors.primary[500] }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text
                className="ml-1"
                style={{
                  fontFamily: typography.fontFamily.sans.semibold,
                  fontSize: 12,
                  color: '#FFF',
                }}
              >
                New
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View className="flex-row" style={{ gap: 0 }}>
          <TabButton
            title="Favourites"
            count={wardrobe.favouriteIds.length}
            active={activeTab === 'favourites'}
            onPress={() => setActiveTab('favourites')}
          />
          <TabButton
            title="Collections"
            count={
              wardrobe.savedCollectionIds.length +
              wardrobe.userCollections.length
            }
            active={activeTab === 'collections'}
            onPress={() => setActiveTab('collections')}
          />
        </View>
      </View>

      {/* Content */}
      {activeTab === 'favourites' ? (
        <FavouritesTab
          products={favouriteProducts}
          onProductPress={(id) => router.push(`/product/${id}`)}
          onRemove={(id) => wardrobe.toggleFavourite(id)}
        />
      ) : (
        <CollectionsTab
          allProducts={allProducts}
          savedCollections={savedCommunityCollections}
          userCollections={wardrobe.userCollections}
          onCommunityPress={(id) => router.push(`/collection/${id}`)}
          onUserCollectionPress={(col) => {
            if (col.productIds.length > 0) {
              router.push(`/product/${col.productIds[0]}`);
            }
          }}
          onDelete={handleDeleteCollection}
          onUnsaveCommunity={(id) => wardrobe.toggleSaveCollection(id)}
          onCreateNew={() => setShowCreateModal(true)}
          onProductPress={(id) => router.push(`/product/${id}`)}
        />
      )}

      {/* Create Collection Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <TouchableOpacity
              className="flex-1"
              onPress={() => setShowCreateModal(false)}
              activeOpacity={1}
            />
            <View className="bg-white rounded-t-3xl">
              <View
                className="flex-row items-center justify-between px-5 py-4 border-b"
                style={{ borderBottomColor: theme.colors.neutral[200] }}
              >
              <Text
                style={{
                  fontFamily: typography.fontFamily.serif.medium,
                  fontSize: 18,
                  color: theme.colors.neutral[900],
                }}
              >
                New Collection
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <View
              className="px-5 pt-5"
              style={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}
            >
              <Text
                className="mb-2"
                style={{
                  fontFamily: typography.fontFamily.sans.semibold,
                  fontSize: 13,
                  color: theme.colors.neutral[700],
                }}
              >
                Name
              </Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Summer Fits"
                placeholderTextColor={theme.colors.neutral[400]}
                className="rounded-xl px-4 mb-4"
                style={{
                  height: 48,
                  backgroundColor: theme.colors.neutral[100],
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 15,
                  color: theme.colors.neutral[900],
                }}
              />

              <Text
                className="mb-2"
                style={{
                  fontFamily: typography.fontFamily.sans.semibold,
                  fontSize: 13,
                  color: theme.colors.neutral[700],
                }}
              >
                Description (optional)
              </Text>
              <TextInput
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="What's this collection about?"
                placeholderTextColor={theme.colors.neutral[400]}
                multiline
                className="rounded-xl px-4 pt-3 mb-5"
                style={{
                  height: 80,
                  backgroundColor: theme.colors.neutral[100],
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 14,
                  color: theme.colors.neutral[900],
                  textAlignVertical: 'top',
                }}
              />

              <TouchableOpacity
                onPress={handleCreateCollection}
                className="h-14 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: newName.trim()
                    ? theme.colors.primary[500]
                    : theme.colors.neutral[200],
                }}
                activeOpacity={0.9}
                disabled={!newName.trim()}
              >
                <Text
                  style={{
                    fontFamily: typography.fontFamily.sans.semibold,
                    fontSize: 16,
                    color: newName.trim() ? '#FFF' : theme.colors.neutral[400],
                  }}
                >
                  Create Collection
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Tab Button ─────────────────────────────────────────────────────────────
function TabButton({
  title,
  count,
  active,
  onPress,
}: {
  title: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-1 items-center pb-3"
      style={{
        borderBottomWidth: 2,
        borderBottomColor: active
          ? theme.colors.primary[500]
          : 'transparent',
      }}
    >
      <Text
        style={{
          fontFamily: active
            ? typography.fontFamily.sans.semibold
            : typography.fontFamily.sans.medium,
          fontSize: 14,
          color: active
            ? theme.colors.primary[500]
            : theme.colors.neutral[500],
        }}
      >
        {title}
        {count > 0 && (
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 12,
              color: active
                ? theme.colors.primary[400]
                : theme.colors.neutral[400],
            }}
          >
            {' '}
            {count}
          </Text>
        )}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Favourites Tab ─────────────────────────────────────────────────────────
function FavouritesTab({
  products,
  onProductPress,
  onRemove,
}: {
  products: Product[];
  onProductPress: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (products.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="heart-outline" size={52} color={theme.colors.neutral[300]} />
        <Text
          className="mt-4 text-center"
          style={{
            fontFamily: typography.fontFamily.serif.medium,
            fontSize: 18,
            color: theme.colors.neutral[800],
          }}
        >
          No favourites yet
        </Text>
        <Text
          className="mt-2 text-center"
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 14,
            color: theme.colors.neutral[500],
            lineHeight: 20,
          }}
        >
          Tap the heart on any product to save it here for later.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/discover')}
          className="mt-5 px-6 py-3 rounded-xl"
          style={{ backgroundColor: theme.colors.primary[500] }}
          activeOpacity={0.85}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.semibold,
              fontSize: 14,
              color: '#FFF',
            }}
          >
            Start Exploring
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Masonry layout
  const columns = distributeMasonry(products);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
    >
      <View className="flex-row" style={{ gap: GAP }}>
        {columns.map((column, colIdx) => (
          <View key={colIdx} style={{ width: COLUMN_WIDTH, gap: GAP }}>
            {column.map((product) => (
              <FavouriteItem
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

// ─── Favourite Item ─────────────────────────────────────────────────────────
function FavouriteItem({
  product,
  width,
  onPress,
  onRemove,
}: {
  product: Product;
  width: number;
  onPress: () => void;
  onRemove: () => void;
}) {
  const [imageHeight, setImageHeight] = useState(width * 1.5);
  const [imageError, setImageError] = useState(false);
  const imageUrl = product.image_urls?.[0];
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;

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

      {/* Remove button */}
      <TouchableOpacity
        onPress={onRemove}
        className="absolute top-2 right-2 w-7 h-7 rounded-full items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="heart" size={14} color={theme.colors.error} />
      </TouchableOpacity>

      {/* Overlay */}
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

// ─── Collections Tab ────────────────────────────────────────────────────────
function CollectionsTab({
  allProducts,
  savedCollections,
  userCollections,
  onCommunityPress,
  onUserCollectionPress,
  onDelete,
  onUnsaveCommunity,
  onCreateNew,
  onProductPress,
}: {
  allProducts: Product[];
  savedCollections: Collection[];
  userCollections: UserCollection[];
  onCommunityPress: (id: string) => void;
  onUserCollectionPress: (col: UserCollection) => void;
  onDelete: (col: UserCollection) => void;
  onUnsaveCommunity: (id: string) => void;
  onCreateNew: () => void;
  onProductPress: (id: string) => void;
}) {
  const isEmpty = savedCollections.length === 0 && userCollections.length === 0;

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="albums-outline" size={52} color={theme.colors.neutral[300]} />
        <Text
          className="mt-4 text-center"
          style={{
            fontFamily: typography.fontFamily.serif.medium,
            fontSize: 18,
            color: theme.colors.neutral[800],
          }}
        >
          No collections yet
        </Text>
        <Text
          className="mt-2 text-center"
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 14,
            color: theme.colors.neutral[500],
            lineHeight: 20,
          }}
        >
          Create your own collections or save ones you discover.
        </Text>
        <TouchableOpacity
          onPress={onCreateNew}
          className="mt-5 px-6 py-3 rounded-xl"
          style={{ backgroundColor: theme.colors.primary[500] }}
          activeOpacity={0.85}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.semibold,
              fontSize: 14,
              color: '#FFF',
            }}
          >
            Create Collection
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
    >
      {/* User Collections */}
      {userCollections.length > 0 && (
        <View className="mb-6">
          <Text
            className="mb-3"
            style={{
              fontFamily: typography.fontFamily.sans.semibold,
              fontSize: 13,
              color: theme.colors.neutral[500],
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            My Collections
          </Text>
          <View style={{ gap: GAP }}>
            {userCollections.map((col) => (
              <UserCollectionCard
                key={col.id}
                allProducts={allProducts}
                collection={col}
                onPress={() => onUserCollectionPress(col)}
                onDelete={() => onDelete(col)}
                onProductPress={onProductPress}
              />
            ))}
          </View>
        </View>
      )}

      {/* Saved Community Collections */}
      {savedCollections.length > 0 && (
        <View>
          <Text
            className="mb-3"
            style={{
              fontFamily: typography.fontFamily.sans.semibold,
              fontSize: 13,
              color: theme.colors.neutral[500],
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Saved Collections
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: GAP }}>
            {savedCollections.map((col) => (
              <SavedCommunityCard
                key={col.id}
                collection={col}
                onPress={() => onCommunityPress(col.id)}
                onUnsave={() => onUnsaveCommunity(col.id)}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── User Collection Card ───────────────────────────────────────────────────
function UserCollectionCard({
  allProducts,
  collection,
  onPress,
  onDelete,
  onProductPress,
}: {
  allProducts: Product[];
  collection: UserCollection;
  onPress: () => void;
  onDelete: () => void;
  onProductPress: (id: string) => void;
}) {
  const previewProducts = useMemo(
    () =>
      collection.productIds
        .slice(0, 3)
        .map((id) => allProducts.find((p) => p.id === id))
        .filter(Boolean) as Product[],
    [collection.productIds, allProducts]
  );

  return (
    <View
      style={{
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[50],
        ...theme.shadows.sm,
      }}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {/* Preview images or empty state */}
        {previewProducts.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 2 }}
          >
            {previewProducts.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => onProductPress(p.id)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: p.image_urls[0] }}
                  style={{
                    width: 110,
                    height: 130,
                    resizeMode: 'cover',
                  }}
                />
              </TouchableOpacity>
            ))}
            {collection.productIds.length > 3 && (
              <View
                className="items-center justify-center"
                style={{
                  width: 80,
                  height: 130,
                  backgroundColor: theme.colors.neutral[200],
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.fontFamily.sans.semibold,
                    fontSize: 14,
                    color: theme.colors.neutral[600],
                  }}
                >
                  +{collection.productIds.length - 3}
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View
            className="items-center justify-center"
            style={{
              height: 100,
              backgroundColor: theme.colors.neutral[100],
            }}
          >
            <Ionicons
              name="images-outline"
              size={28}
              color={theme.colors.neutral[300]}
            />
            <Text
              className="mt-1"
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 12,
                color: theme.colors.neutral[400],
              }}
            >
              No items yet
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View className="flex-row items-center justify-between p-3.5">
        <View className="flex-1 mr-3">
          <Text
            numberOfLines={1}
            style={{
              fontFamily: typography.fontFamily.sans.semibold,
              fontSize: 15,
              color: theme.colors.neutral[900],
            }}
          >
            {collection.name}
          </Text>
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 12,
              color: theme.colors.neutral[500],
              marginTop: 2,
            }}
          >
            {collection.productIds.length} item
            {collection.productIds.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          className="p-2"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={theme.colors.neutral[400]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Saved Community Collection Card ────────────────────────────────────────
function SavedCommunityCard({
  collection,
  onPress,
  onUnsave,
}: {
  collection: Collection;
  onPress: () => void;
  onUnsave: () => void;
}) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const images = collection.coverImages.slice(0, 4);
  const miniGap = 2;
  const miniImgSize = (COLUMN_WIDTH - miniGap) / 2;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: COLUMN_WIDTH,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[50],
        ...theme.shadows.sm,
      }}
    >
      {/* 2x2 grid */}
      <View
        style={{
          width: COLUMN_WIDTH,
          height: COLUMN_WIDTH,
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
              onError={() =>
                setImageErrors((prev) => new Set(prev).add(idx))
              }
            />
          )
        )}
      </View>

      {/* Unsave button overlay */}
      <TouchableOpacity
        onPress={onUnsave}
        className="absolute top-2 right-2 w-7 h-7 rounded-full items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="bookmark" size={13} color="#FFF" />
      </TouchableOpacity>

      <View className="p-3">
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.fontFamily.serif.medium,
            fontSize: 14,
            color: theme.colors.neutral[900],
          }}
        >
          {collection.name}
        </Text>
        <View className="flex-row items-center mt-1.5">
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

// ─── Helpers ────────────────────────────────────────────────────────────────
function distributeMasonry(products: Product[]): Product[][] {
  const cols: Product[][] = [[], []];
  const heights = [0, 0];

  products.forEach((item) => {
    const estimatedHeight = COLUMN_WIDTH * (1.2 + Math.random() * 0.5);
    const shorter = heights[0] <= heights[1] ? 0 : 1;
    cols[shorter].push(item);
    heights[shorter] += estimatedHeight + GAP;
  });

  return cols;
}
