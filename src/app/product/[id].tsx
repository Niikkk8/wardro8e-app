import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "../../styles/theme";
import { typography } from "../../styles/typography";
import { Product } from "../../types";
import { STATIC_PRODUCTS } from "../../data/staticProducts";
import MasonryLayout from "../../components/layouts/MasonryLayout";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const detailsHeight = useRef(new Animated.Value(0)).current;
  const detailsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    setImageError(false);
  }, [currentImageIndex]);

  // Entrance animation
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

  // Details expansion animation
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
      const foundProduct = STATIC_PRODUCTS.find((p) => p.id === id);
      if (foundProduct) {
        setProduct(foundProduct);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product?.affiliate_url) return;
    try {
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
    (colors.length > 0) ||
    (product.attributes?.materials && product.attributes.materials.length > 0) ||
    (product.style && product.style.length > 0) ||
    (product.occasion && product.occasion.length > 0);

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

            {/* Action Buttons on Image */}
            <View className="absolute top-4 right-4 gap-3">
              <TouchableOpacity
                onPress={() => setIsLiked(!isLiked)}
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
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  ...theme.shadows.sm,
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-redo-outline"
                  size={18}
                  color={theme.colors.neutral[600]}
                />
              </TouchableOpacity>
            </View>

            {/* Discount Badge */}
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

            {/* Image Dots */}
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

            {/* Tap Navigation */}
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
          {/* Brand */}
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

          {/* Title */}
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

          {/* Price */}
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

          {/* Quick Info */}
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

          {/* Description */}
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

          {/* Details Section */}
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
                        className="text-neutral-500 mb-1"
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
                          className="text-neutral-500 mb-1"
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
                        className="text-neutral-500 mb-1"
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
                        className="text-neutral-500 mb-1"
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

          {/* More to Explore */}
          <View className="mt-2 pt-5 border-t" style={{ borderTopColor: theme.colors.neutral[200] }}>
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
              onProductPress={handleProductPress}
              excludeProductId={product.id}
            />
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
    </SafeAreaView>
  );
}
