import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Animated,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../../styles/theme";
import { typography } from "../../styles/typography";
import { Product } from "../../types";
import { getProductById } from "../../lib/productsApi";
import MasonryLayout from "../../components/layouts/MasonryLayout";
import { useWardrobe } from "../../contexts/WardrobeContext";
import { useAuth } from "../../contexts/AuthContext";
import { interactionService } from "../../lib/interactionService";
import { preferenceService } from "../../lib/preferenceService";
import { recommendationService } from "../../lib/recommendationService";
import { clientStorage } from "../../lib/clientStorage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wardrobe = useWardrobe();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);

  const isLiked = id ? wardrobe.isFavourited(id) : false;
  const userId = user?.id || null;
  const openTime = useRef<number>(Date.now());
  const viewLogged = useRef(false);
  const scrollDepthReached = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const detailsHeight = useRef(new Animated.Value(0)).current;
  const detailsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) {
      openTime.current = Date.now();
      viewLogged.current = false;
      scrollDepthReached.current = false;
      fetchProduct();
      logViewAndFetchSimilar();
    }
  }, [id]);

  useEffect(() => {
    setImageError(false);
  }, [currentImageIndex]);

  useEffect(() => {
    if (product) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [product]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(detailsHeight, {
        toValue: showDetails ? 1 : 0,
        tension: 100,
        friction: 12,
        useNativeDriver: false,
      }),
      Animated.timing(detailsOpacity, {
        toValue: showDetails ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [showDetails]);

  const fetchProduct = async () => {
    try {
      setLoading(true);

      // Check local cache first
      if (id) {
        const cached = await clientStorage.getCachedProduct(id);
        if (cached) {
          setProduct(cached);
          setLoading(false);
          return;
        }
      }

      const foundProduct = id ? await getProductById(id) : null;
      if (foundProduct) {
        setProduct(foundProduct);
        await clientStorage.setCachedProduct(foundProduct);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const logViewAndFetchSimilar = async () => {
    if (!id) return;

    // A: Log view interaction (fire-and-forget)
    if (userId && !viewLogged.current) {
      viewLogged.current = true;
      const logged = await interactionService.logInteraction(userId, id, 'view');
      if (logged) {
        const prod = id ? await getProductById(id) : null;
        if (prod) {
          preferenceService.handleInteraction(userId, prod, 'view').catch(() => {});
        }
      }
    }

    // C: Fetch similar products
    setLoadingSimilar(true);
    try {
      const prod = id ? await getProductById(id) : null;
      if (prod) {
        const seenIds = userId ? await clientStorage.getSeenProductIds(userId) : [];
        const similar = await recommendationService.getSimilarProducts(prod, 12, seenIds);
        setSimilarProducts(similar);
      }
    } catch (e) {
      console.error("Error fetching similar products:", e);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleScrollDepth = useCallback((event: any) => {
    if (scrollDepthReached.current || !product || !userId) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const scrollPercent = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
    const timeOnScreen = Date.now() - openTime.current;

    if (scrollPercent > 0.5 && timeOnScreen > 3000) {
      scrollDepthReached.current = true;
      // Update implicit style counters (stronger signal than just view)
      preferenceService.updateStyleCounters(userId, product, 'view').catch(() => {});
    }
  }, [product, userId]);

  const handleLike = useCallback(() => {
    if (!id) return;
    wardrobe.toggleFavourite(id);

    if (userId && product && !isLiked) {
      interactionService.logInteraction(userId, id, 'like').catch(() => {});
      preferenceService.handleInteraction(userId, product, 'like').catch(() => {});
    }
  }, [id, userId, product, isLiked, wardrobe]);

  const handleSave = useCallback((collectionId: string) => {
    if (!id) return;

    const isIn = wardrobe.isInCollection(collectionId, id);
    if (isIn) {
      wardrobe.removeFromCollection(collectionId, id);
    } else {
      wardrobe.addToCollection(collectionId, id);
      if (userId && product) {
        interactionService.logInteraction(userId, id, 'save').catch(() => {});
        preferenceService.handleInteraction(userId, product, 'save').catch(() => {});
      }
    }
  }, [id, userId, product, wardrobe]);

  const handleBuyNow = async () => {
    if (!product?.affiliate_url) return;
    try {
      // Log purchase intent
      if (userId && id) {
        interactionService.logInteraction(userId, id, 'purchase').catch(() => {});
        preferenceService.handleInteraction(userId, product, 'purchase').catch(() => {});
      }

      const supported = await Linking.canOpenURL(product.affiliate_url);
      if (supported) {
        await Linking.openURL(product.affiliate_url);
      }
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };

  const handleProductPress = (productId: string) => {
    router.replace(`/product/${productId}`);
    setCurrentImageIndex(0);
    setSimilarProducts([]);
    setLoadingSimilar(true);
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text
            className="text-neutral-600 text-center"
            style={typography.styles.body}
          >
            Product not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 bg-primary-500 rounded-xl px-6 py-3"
          >
            <Text className="text-white" style={typography.styles.button}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = product.image_urls || [];
  const currentImage = images[currentImageIndex] || images[0];
  const colors = product.colors || [];
  const sizeRange = product.size_range || [];
  const displayPrice =
    product.sale_price && product.sale_price < product.price
      ? product.sale_price
      : product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  const hasDetails =
    colors.length > 0 ||
    (product.attributes?.materials && product.attributes.materials.length > 0) ||
    (product.style && product.style.length > 0) ||
    (product.occasion && product.occasion.length > 0);

  const showMoreLikeThis = !loadingSimilar && similarProducts.length >= 3;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{
          borderBottomColor: theme.colors.neutral[200],
          backgroundColor: "#FFFFFF",
        }}
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.neutral[900]}
            />
          </TouchableOpacity>
          <Text
            style={{
              ...typography.styles.logo,
              color: theme.colors.primary[500],
            }}
          >
            Wardro8e
          </Text>
        </View>

        <View className="flex-row items-center gap-4">
          <TouchableOpacity className="p-2" activeOpacity={0.7}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.colors.neutral[700]}
            />
          </TouchableOpacity>
          <TouchableOpacity className="p-2" activeOpacity={0.7}>
            <Ionicons
              name="bag-outline"
              size={24}
              color={theme.colors.neutral[700]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        onScroll={handleScrollDepth}
        scrollEventThrottle={500}
      >
        {/* Product Image */}
        {currentImage && !imageError ? (
          <View
            className="relative bg-neutral-100"
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 }}
          >
            <Image
              source={{ uri: currentImage }}
              style={{ width: "100%", height: "100%", resizeMode: "cover" }}
              onError={() => setImageError(true)}
            />

            <View className="absolute top-4 right-4 gap-3">
              <TouchableOpacity
                onPress={handleLike}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  ...theme.shadows.sm,
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={20}
                  color={isLiked ? theme.colors.error : theme.colors.neutral[600]}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSaveModal(true)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  ...theme.shadows.sm,
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color={theme.colors.neutral[600]}
                />
              </TouchableOpacity>
            </View>

            {hasDiscount && (
              <View
                className="absolute top-4 left-4 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: theme.colors.error }}
              >
                <Text
                  className="text-white"
                  style={{
                    fontFamily: typography.fontFamily.sans.bold,
                    fontSize: 11,
                  }}
                >
                  {discountPercent}% OFF
                </Text>
              </View>
            )}

            {images.length > 1 && (
              <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
                {images.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentImageIndex(index)}
                    className="h-2 rounded-full"
                    style={{
                      width: index === currentImageIndex ? 16 : 8,
                      backgroundColor:
                        index === currentImageIndex
                          ? "#FFFFFF"
                          : "rgba(255,255,255,0.5)",
                    }}
                  />
                ))}
              </View>
            )}

            {images.length > 1 && (
              <>
                <TouchableOpacity
                  onPress={() =>
                    currentImageIndex > 0 &&
                    setCurrentImageIndex(currentImageIndex - 1)
                  }
                  className="absolute left-0 top-0 bottom-0 w-1/3"
                  activeOpacity={1}
                />
                <TouchableOpacity
                  onPress={() =>
                    currentImageIndex < images.length - 1 &&
                    setCurrentImageIndex(currentImageIndex + 1)
                  }
                  className="absolute right-0 top-0 bottom-0 w-1/3"
                  activeOpacity={1}
                />
              </>
            )}
          </View>
        ) : (
          <View
            className="items-center justify-center bg-neutral-100"
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 }}
          >
            <Ionicons
              name="image-outline"
              size={48}
              color={theme.colors.neutral[300]}
            />
          </View>
        )}

        {/* Product Info */}
        <Animated.View
          className="bg-white px-5 pt-5"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {product.source_brand_name && (
            <Text
              className="text-primary-500 mb-1"
              style={{
                fontFamily: typography.fontFamily.sans.semibold,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {product.source_brand_name}
            </Text>
          )}

          <Text
            className="text-neutral-900 mb-3"
            style={{
              fontFamily: typography.fontFamily.serif.medium,
              fontSize: 22,
              lineHeight: 28,
            }}
          >
            {product.title}
          </Text>

          <View className="flex-row items-center gap-3 mb-5">
            <Text
              className="text-neutral-900"
              style={{
                fontFamily: typography.fontFamily.sans.bold,
                fontSize: 24,
              }}
            >
              ₹{displayPrice.toLocaleString("en-IN")}
            </Text>
            {hasDiscount && (
              <Text
                className="text-neutral-400 line-through"
                style={{
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 16,
                }}
              >
                ₹{product.price.toLocaleString("en-IN")}
              </Text>
            )}
          </View>

          <View className="flex-row flex-wrap gap-2 mb-5">
            {sizeRange.length > 0 && (
              <View
                className="px-3 py-2 rounded-lg border"
                style={{ borderColor: theme.colors.neutral[200] }}
              >
                <Text
                  className="text-neutral-700"
                  style={{
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 12,
                  }}
                >
                  {sizeRange.join(" · ")}
                </Text>
              </View>
            )}
            {product.fit_type && (
              <View
                className="px-3 py-2 rounded-lg border"
                style={{ borderColor: theme.colors.neutral[200] }}
              >
                <Text
                  className="text-neutral-700"
                  style={{
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 12,
                  }}
                >
                  {product.fit_type}
                </Text>
              </View>
            )}
          </View>

          {product.description && (
            <Text
              className="text-neutral-600 mb-5"
              style={{
                fontFamily: typography.fontFamily.sans.regular,
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {product.description}
            </Text>
          )}

          {hasDetails && (
            <View className="mb-5">
              <TouchableOpacity
                onPress={() => setShowDetails(!showDetails)}
                className="flex-row items-center justify-between py-4 border-t"
                style={{ borderTopColor: theme.colors.neutral[200] }}
                activeOpacity={0.7}
              >
                <Text
                  className="text-neutral-900"
                  style={{
                    fontFamily: typography.fontFamily.sans.semibold,
                    fontSize: 15,
                  }}
                >
                  Product Details
                </Text>
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: detailsHeight.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "180deg"],
                        }),
                      },
                    ],
                  }}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={theme.colors.neutral[500]}
                  />
                </Animated.View>
              </TouchableOpacity>

              <Animated.View
                style={{
                  maxHeight: detailsHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300],
                  }),
                  opacity: detailsOpacity,
                  overflow: "hidden",
                }}
              >
                <View className="pb-4 gap-4">
                  {colors.length > 0 && (
                    <View>
                      <Text
                        className="text-neutral-900 mb-1 font-medium"
                        style={{
                          fontFamily: typography.fontFamily.sans.medium,
                          fontSize: 12,
                        }}
                      >
                        Colors
                      </Text>
                      <Text
                        className="text-neutral-800"
                        style={{
                          fontFamily: typography.fontFamily.sans.regular,
                          fontSize: 14,
                        }}
                      >
                        {colors.join(", ")}
                      </Text>
                    </View>
                  )}
                  {product.attributes?.materials &&
                    product.attributes.materials.length > 0 && (
                      <View>
                        <Text
                          className="text-neutral-900 mb-1 font-medium"
                          style={{
                            fontFamily: typography.fontFamily.sans.medium,
                            fontSize: 12,
                          }}
                        >
                          Materials
                        </Text>
                        <Text
                          className="text-neutral-800"
                          style={{
                            fontFamily: typography.fontFamily.sans.regular,
                            fontSize: 14,
                          }}
                        >
                          {product.attributes.materials.join(", ")}
                        </Text>
                      </View>
                    )}
                  {product.style && product.style.length > 0 && (
                    <View>
                      <Text
                        className="text-neutral-900 mb-1 font-medium"
                        style={{
                          fontFamily: typography.fontFamily.sans.medium,
                          fontSize: 12,
                        }}
                      >
                        Style
                      </Text>
                      <Text
                        className="text-neutral-800"
                        style={{
                          fontFamily: typography.fontFamily.sans.regular,
                          fontSize: 14,
                        }}
                      >
                        {product.style.join(", ")}
                      </Text>
                    </View>
                  )}
                  {product.occasion && product.occasion.length > 0 && (
                    <View>
                      <Text
                        className="text-neutral-900 mb-1 font-medium"
                        style={{
                          fontFamily: typography.fontFamily.sans.medium,
                          fontSize: 12,
                        }}
                      >
                        Occasion
                      </Text>
                      <Text
                        className="text-neutral-800"
                        style={{
                          fontFamily: typography.fontFamily.sans.regular,
                          fontSize: 14,
                        }}
                      >
                        {product.occasion.join(", ")}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            </View>
          )}

          {/* More Like This */}
          <View
            className="mt-2 pt-5 border-t"
            style={{ borderTopColor: theme.colors.neutral[200] }}
          >
            {loadingSimilar ? (
              <>
                <Text
                  className="text-neutral-900 mb-5"
                  style={{
                    fontFamily: typography.fontFamily.serif.medium,
                    fontSize: 18,
                  }}
                >
                  More to explore
                </Text>
                <MasonryLayout showSkeleton skeletonCount={4} />
              </>
            ) : showMoreLikeThis ? (
              <>
                <Text
                  className="text-neutral-900 mb-5"
                  style={{
                    fontFamily: typography.fontFamily.serif.medium,
                    fontSize: 18,
                  }}
                >
                  More to explore
                </Text>
                <MasonryLayout
                  products={similarProducts}
                  onProductPress={handleProductPress}
                  excludeProductId={product.id}
                />
              </>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Buy Button */}
      {product.affiliate_url && (
        <View
          className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-8 bg-white"
          style={{
            ...theme.shadows.lg,
            shadowOffset: { width: 0, height: -2 },
          }}
        >
          <TouchableOpacity
            onPress={handleBuyNow}
            className="h-14 rounded-xl items-center justify-center flex-row"
            style={{ backgroundColor: theme.colors.primary[500] }}
            activeOpacity={0.9}
          >
            <Text
              className="text-white"
              style={{
                fontFamily: typography.fontFamily.sans.semibold,
                fontSize: 16,
              }}
            >
              Shop Now
            </Text>
            {product.source_platform && (
              <>
                <Text className="text-white/50 mx-2">·</Text>
                <Text
                  className="text-white/90"
                  style={{
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 14,
                  }}
                >
                  {product.source_platform.charAt(0).toUpperCase() +
                    product.source_platform.slice(1)}
                </Text>
              </>
            )}
            <Ionicons
              name="arrow-forward"
              size={18}
              color="white"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Save to Collection Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <View className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <TouchableOpacity
              className="flex-1"
              onPress={() => setShowSaveModal(false)}
              activeOpacity={1}
            />
            <View
              className="bg-white rounded-t-3xl"
              style={{ maxHeight: "65%" }}
            >
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
                Save to Collection
              </Text>
              <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.neutral[600]}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: 20,
                paddingBottom: Platform.OS === "ios" ? 40 : 20,
              }}
            >
              <View className="mb-5">
                <Text
                  className="mb-2"
                  style={{
                    fontFamily: typography.fontFamily.sans.semibold,
                    fontSize: 13,
                    color: theme.colors.neutral[700],
                  }}
                >
                  New collection
                </Text>
                <View className="flex-row items-center gap-3">
                  <TextInput
                    value={newCollectionName}
                    onChangeText={setNewCollectionName}
                    placeholder="Collection name"
                    placeholderTextColor={theme.colors.neutral[400]}
                    className="flex-1 rounded-xl px-4"
                    style={{
                      height: 44,
                      backgroundColor: theme.colors.neutral[100],
                      fontFamily: typography.fontFamily.sans.regular,
                      fontSize: 14,
                      color: theme.colors.neutral[900],
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (newCollectionName.trim() && id) {
                        const col = wardrobe.createCollection(
                          newCollectionName.trim()
                        );
                        wardrobe.addToCollection(col.id, id);
                        if (userId && product) {
                          interactionService.logInteraction(userId, id, 'save').catch(() => {});
                          preferenceService.handleInteraction(userId, product, 'save').catch(() => {});
                        }
                        setNewCollectionName("");
                        setShowSaveModal(false);
                      }
                    }}
                    className="rounded-xl items-center justify-center"
                    style={{
                      height: 44,
                      paddingHorizontal: 16,
                      backgroundColor: newCollectionName.trim()
                        ? theme.colors.primary[500]
                        : theme.colors.neutral[200],
                    }}
                    disabled={!newCollectionName.trim()}
                  >
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.sans.semibold,
                        fontSize: 13,
                        color: newCollectionName.trim()
                          ? "#FFF"
                          : theme.colors.neutral[400],
                      }}
                    >
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {wardrobe.userCollections.length > 0 && (
                <View>
                  <Text
                    className="mb-3"
                    style={{
                      fontFamily: typography.fontFamily.sans.semibold,
                      fontSize: 13,
                      color: theme.colors.neutral[700],
                    }}
                  >
                    Your collections
                  </Text>
                  {wardrobe.userCollections.map((col) => {
                    const isIn = id ? wardrobe.isInCollection(col.id, id) : false;
                    return (
                      <TouchableOpacity
                        key={col.id}
                        onPress={() => handleSave(col.id)}
                        className="flex-row items-center justify-between py-3.5 border-b"
                        style={{
                          borderBottomColor: theme.colors.neutral[100],
                        }}
                        activeOpacity={0.7}
                      >
                        <View className="flex-1 mr-3">
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: typography.fontFamily.sans.medium,
                              fontSize: 15,
                              color: theme.colors.neutral[900],
                            }}
                          >
                            {col.name}
                          </Text>
                          <Text
                            style={{
                              fontFamily: typography.fontFamily.sans.regular,
                              fontSize: 12,
                              color: theme.colors.neutral[500],
                            }}
                          >
                            {col.productIds.length} item
                            {col.productIds.length !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <View
                          className="w-6 h-6 rounded-md items-center justify-center"
                          style={{
                            backgroundColor: isIn
                              ? theme.colors.primary[500]
                              : "transparent",
                            borderWidth: isIn ? 0 : 1.5,
                            borderColor: theme.colors.neutral[300],
                          }}
                        >
                          {isIn && (
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
