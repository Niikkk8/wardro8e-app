import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Platform,
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

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Reset image error when image changes
  useEffect(() => {
    setImageError(false);
  }, [currentImageIndex]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      // Use static products for now
      // TODO: Replace with Supabase fetch when database is ready
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

    // Track click (TODO: Implement when database is ready)
    // if (product.id) {
    //   await supabase.rpc('increment_click_count', { product_id: product.id });
    // }

    // Open affiliate URL
    try {
      const supported = await Linking.canOpenURL(product.affiliate_url);
      if (supported) {
        await Linking.openURL(product.affiliate_url);
      } else {
        console.error("Cannot open URL:", product.affiliate_url);
      }
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };

  const handleProductPress = (productId: string) => {
    router.replace(`/product/${productId}`);
    setCurrentImageIndex(0);
    fetchProduct();
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
          <Text className="text-neutral-600 text-base text-center">
            Product not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 bg-primary-500 rounded-xl px-6 py-3"
          >
            <Text className="text-white text-sm font-sans-semibold">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = product.image_urls || [];
  const currentImage = images[currentImageIndex] || images[0];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Top Navbar - Same as Homepage */}
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
            className="w-10 h-10 items-center justify-center"
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
        {/* Product Info Above Image */}
        <View className="px-6 pt-4">
          {/* Brand */}
          {product.source_brand_name && (
            <Text className="text-primary-500 text-xs font-sans-semibold mb-1.5 tracking-wide uppercase">
              {product.source_brand_name}
            </Text>
          )}

          {/* Title */}
          <Text
            className="text-neutral-900 mb-2"
            style={{
              ...typography.styles.h2,
              fontSize: 26,
              lineHeight: 32,
            }}
          >
            {product.title}
          </Text>

          {/* Price */}
          <Text className="text-neutral-900 text-2xl font-sans-bold mb-4">
            ₹{product.price}
          </Text>
        </View>

        {/* Product Images */}
        {currentImage ? (
          !imageError ? (
            <View
              className="relative"
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.3 }}
            >
              <Image
                source={{ uri: currentImage }}
                style={{
                  width: "100%",
                  height: "100%",
                  resizeMode: "cover",
                }}
                onError={() => setImageError(true)}
              />

              {/* Share Button - Absolute Position Top Right */}
              <TouchableOpacity
                className="absolute top-4 right-4 w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
              >
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={theme.colors.neutral[700]}
                />
              </TouchableOpacity>

              {/* Like Button - Absolute Position Top Right (below share) */}
              <TouchableOpacity
                onPress={() => setIsLiked(!isLiked)}
                className="absolute top-16 right-4 w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
              >
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={
                    isLiked ? theme.colors.error : theme.colors.neutral[700]
                  }
                />
              </TouchableOpacity>

              {/* Image Indicators */}
              {images.length > 1 && (
                <View className="absolute bottom-6 left-0 right-0 flex-row justify-center gap-2">
                  {images.map((_, index) => (
                    <View
                      key={index}
                      className={`h-1.5 rounded-full ${
                        index === currentImageIndex ? "bg-white" : "bg-white/40"
                      }`}
                      style={{ width: index === currentImageIndex ? 24 : 8 }}
                    />
                  ))}
                </View>
              )}

              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  {currentImageIndex > 0 && (
                    <TouchableOpacity
                      onPress={() =>
                        setCurrentImageIndex(currentImageIndex - 1)
                      }
                      className="absolute left-4 w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        top: "50%",
                        marginTop: -20,
                        backgroundColor: "rgba(0, 0, 0, 0.4)",
                      }}
                    >
                      <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                  {currentImageIndex < images.length - 1 && (
                    <TouchableOpacity
                      onPress={() =>
                        setCurrentImageIndex(currentImageIndex + 1)
                      }
                      className="absolute right-4 w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        top: "50%",
                        marginTop: -20,
                        backgroundColor: "rgba(0, 0, 0, 0.4)",
                      }}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ) : (
            <View
              className="items-center justify-center bg-neutral-100"
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.3 }}
            >
              <Ionicons
                name="image-outline"
                size={64}
                color={theme.colors.neutral[400]}
              />
              <Text className="text-neutral-500 text-sm font-sans-regular mt-4">
                Image unavailable
              </Text>
            </View>
          )
        ) : (
          <View
            className="items-center justify-center bg-neutral-100"
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.3 }}
          >
            <Ionicons
              name="image-outline"
              size={64}
              color={theme.colors.neutral[400]}
            />
            <Text className="text-neutral-500 text-sm font-sans-regular mt-4">
              No image available
            </Text>
          </View>
        )}

        {/* Product Details Card */}
        <View
          className="px-6 pt-6 pb-6 bg-white -mt-6 rounded-t-3xl"
          style={{ marginTop: -24 }}
        >
          {/* Description */}
          {product.description && (
            <View className="mb-5">
              <Text className="text-neutral-600 text-base font-sans-regular leading-7">
                {product.description}
              </Text>
            </View>
          )}

          {/* Available Sizes */}
          {product.attributes?.size_range &&
            product.attributes.size_range.length > 0 && (
              <View className="mb-5">
                <Text className="text-neutral-900 text-sm font-sans-semibold mb-3">
                  Available Sizes
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {product.attributes.size_range.map((size, index) => (
                    <View
                      key={index}
                      className="w-14 h-14 rounded-xl border items-center justify-center"
                      style={{
                        borderColor: theme.colors.neutral[200],
                        backgroundColor: theme.colors.neutral[50],
                      }}
                    >
                      <Text className="text-neutral-900 text-sm font-sans-bold">
                        {size}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* Buy Button */}
          {product.affiliate_url && (
            <TouchableOpacity
              onPress={handleBuyNow}
              className="bg-primary-500 rounded-2xl h-14 items-center justify-center mb-6"
              style={theme.shadows.lg}
            >
              <Text className="text-white text-base font-sans-bold tracking-wide">
                Buy Now
              </Text>
            </TouchableOpacity>
          )}

          {/* Similar Products Section */}
          <View className="mb-4">
            <Text
              className="text-neutral-900 mb-4"
              style={{
                ...typography.styles.h3,
                fontSize: 22,
              }}
            >
              More to Explore
            </Text>
            <MasonryLayout
              onProductPress={handleProductPress}
              excludeProductId={product.id}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
