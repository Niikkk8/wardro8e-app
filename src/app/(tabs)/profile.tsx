import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";
import { UserProfile, UserPreferences } from "@/types";
import { theme } from "@/styles/theme";
import { typography } from "@/styles/typography";
import { STATIC_PRODUCTS } from "@/data/staticProducts";
import { Product } from "@/types";

// Dynamic import for image picker (not available in Expo Go)
let ImagePicker: typeof import("expo-image-picker") | null = null;
try {
  ImagePicker = require("expo-image-picker");
} catch (e) {
  // Image picker not available (likely in Expo Go)
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Get some random products for "Recently Viewed" simulation
  const recentlyViewedProducts = STATIC_PRODUCTS.sort((a, b) => Math.random() - 0.5).slice(0, 4);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const { data: preferencesData, error: preferencesError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (preferencesError && preferencesError.code !== "PGRST116") {
        throw preferencesError;
      }

      setProfile(profileData);
      setPreferences(preferencesData || null);

      const profileOnboardingCompleted =
        !!profileData?.onboarding_completed || !!preferencesData;
      const styleQuizCompleted =
        !!profileData?.style_quiz_completed || !!preferencesData;
      await Promise.all([
        storage.setProfileOnboardingCompleted(profileOnboardingCompleted),
        storage.setStyleQuizCompleted(styleQuizCompleted),
      ]);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const parseDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    try {
      if (dateString.includes("/")) {
        const parts = dateString.split("/");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
      }
      return new Date(dateString);
    } catch {
      return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = parseDate(dateString);
      if (!date) return dateString;

      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatGender = (gender?: string) => {
    if (!gender) return null;
    const genderMap: { [key: string]: string } = {
      woman: "Woman",
      man: "Man",
      "non-binary": "Non-binary",
      prefer_not_to_say: "Prefer not to say",
    };
    return genderMap[gender] || gender;
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.replace("/(auth)/welcome");
    } catch (error: any) {
      console.error("Error logging out:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handlePickImage = async () => {
    if (!ImagePicker) {
      Alert.alert(
        "Not Available",
        "Profile picture editing requires a development build. This feature is not available in Expo Go."
      );
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to change your profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    if (!user) return;

    try {
      setUploadingImage(true);

      // For now, we'll store the local URI as the avatar_url
      // In production, you'd upload to Supabase Storage
      const { error } = await supabase
        .from("users")
        .update({ avatar_url: imageUri })
        .eq("id", user.id);

      if (error) throw error;

      // Update local state
      setProfile((prev) => (prev ? { ...prev, avatar_url: imageUri } : prev));
    } catch (error: any) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to update profile picture. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProductPress = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const renderProductCard = (product: Product) => {
    const hasDiscount = product.sale_price && product.sale_price < product.price;
    const displayPrice = hasDiscount ? product.sale_price : product.price;

    return (
      <TouchableOpacity
        key={product.id}
        onPress={() => handleProductPress(product.id)}
        className="mb-4"
        style={{ width: PRODUCT_CARD_WIDTH }}
        activeOpacity={0.9}
      >
        <View
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Image
            source={{ uri: product.image_urls?.[0] }}
            style={{
              width: "100%",
              height: PRODUCT_CARD_WIDTH * 1.3,
              backgroundColor: theme.colors.neutral[100],
            }}
            resizeMode="cover"
          />
          <View className="p-3">
            {product.source_brand_name && (
              <Text
                className="text-neutral-500 mb-1"
                style={{
                  fontFamily: typography.fontFamily.sans.medium,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
                numberOfLines={1}
              >
                {product.source_brand_name}
              </Text>
            )}
            <Text
              className="text-neutral-900 mb-2"
              style={{
                fontFamily: typography.fontFamily.sans.medium,
                fontSize: 12,
                lineHeight: 16,
              }}
              numberOfLines={2}
            >
              {product.title}
            </Text>
            <View className="flex-row items-center gap-2">
              <Text
                className="text-neutral-900"
                style={{
                  fontFamily: typography.fontFamily.sans.bold,
                  fontSize: 14,
                }}
              >
                ₹{displayPrice?.toLocaleString("en-IN")}
              </Text>
              {hasDiscount && (
                <Text
                  className="text-neutral-400 line-through"
                  style={{
                    fontFamily: typography.fontFamily.sans.regular,
                    fontSize: 11,
                  }}
                >
                  ₹{product.price.toLocaleString("en-IN")}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
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

  const formattedDate = formatDate(profile?.birthday);
  const gender = formatGender(profile?.gender);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Header - matching homepage style */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{
          borderBottomColor: theme.colors.neutral[200],
          backgroundColor: "#FFFFFF",
        }}
      >
        <Text
          style={{
            ...typography.styles.logo,
            color: theme.colors.primary[500],
          }}
        >
          Wardro8e
        </Text>

        <View className="flex-row items-center gap-4">
          <TouchableOpacity className="p-2" activeOpacity={0.7}>
            <Ionicons
              name="settings-outline"
              size={24}
              color={theme.colors.neutral[700]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Section */}
        <View className="px-6 py-6">
          <View className="flex-row items-center gap-4">
            {/* Avatar with Edit */}
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={uploadingImage}
              className="relative"
              activeOpacity={0.8}
            >
              {uploadingImage ? (
                <View
                  className="bg-neutral-100 rounded-full items-center justify-center"
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                >
                  <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                </View>
              ) : profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: theme.colors.neutral[100],
                  }}
                />
              ) : (
                <View
                  className="bg-neutral-900 rounded-full items-center justify-center"
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                >
                  <Text
                    className="text-white"
                    style={{
                      fontFamily: typography.fontFamily.serif.bold,
                      fontSize: 32,
                    }}
                  >
                    {getInitials(profile?.full_name)}
                  </Text>
                </View>
              )}
              {/* Edit overlay */}
              <View
                className="absolute bottom-0 right-0 bg-white rounded-full items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: theme.colors.neutral[900],
                }}
              >
                <Ionicons name="camera" size={14} color={theme.colors.neutral[900]} />
              </View>
            </TouchableOpacity>

            {/* Name and Details */}
            <View className="flex-1">
              <Text
                className="text-neutral-900 mb-1"
                style={{
                  fontFamily: typography.fontFamily.serif.bold,
                  fontSize: 22,
                  lineHeight: 28,
                }}
              >
                {profile?.full_name || "User"}
              </Text>

              <Text
                className="text-neutral-500"
                style={{
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 13,
                }}
                numberOfLines={1}
              >
                {profile?.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Info Pills */}
        <View className="px-6 mb-6">
          <View className="flex-row flex-wrap gap-2">
            {gender && (
              <View className="flex-row items-center gap-1.5 px-3 py-2 bg-neutral-100 rounded-full">
                <Ionicons name="person-outline" size={14} color={theme.colors.neutral[600]} />
                <Text
                  className="text-neutral-700"
                  style={{
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 12,
                  }}
                >
                  {gender}
                </Text>
              </View>
            )}
            {formattedDate && (
              <View className="flex-row items-center gap-1.5 px-3 py-2 bg-neutral-100 rounded-full">
                <Ionicons name="calendar-outline" size={14} color={theme.colors.neutral[600]} />
                <Text
                  className="text-neutral-700"
                  style={{
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 12,
                  }}
                >
                  {formattedDate}
                </Text>
              </View>
            )}
            {profile?.phone && (
              <View className="flex-row items-center gap-1.5 px-3 py-2 bg-neutral-100 rounded-full">
                <Ionicons name="call-outline" size={14} color={theme.colors.neutral[600]} />
                <Text
                  className="text-neutral-700"
                  style={{
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 12,
                  }}
                >
                  {profile.phone}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Style Preferences Link */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            onPress={() => router.push("/profile/style-preferences")}
            className="flex-row items-center justify-between py-4 px-5 bg-neutral-50 rounded-2xl border border-neutral-200"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View>
                <Text
                  className="text-neutral-900"
                  style={{
                    fontFamily: typography.fontFamily.sans.semibold,
                    fontSize: 15,
                  }}
                >
                  Style Preferences
                </Text>
                <Text
                  className="text-neutral-500"
                  style={{
                    fontFamily: typography.fontFamily.sans.regular,
                    fontSize: 12,
                  }}
                >
                  {preferences ? "View your style profile" : "Complete your style quiz"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[400]} />
          </TouchableOpacity>
        </View>

        {/* Recently Viewed Products */}
        <View className="px-6 mb-8">
          <Text
            className="text-neutral-900 mb-4"
            style={{
              fontFamily: typography.fontFamily.serif.medium,
              fontSize: 18,
            }}
          >
            Recently Viewed
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {recentlyViewedProducts.map((product) => renderProductCard(product))}
          </View>
        </View>

        {/* Logout Button */}
        <View className="px-6">
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            className="flex-row items-center justify-center gap-2 py-4 border border-neutral-300 rounded-xl"
            activeOpacity={0.7}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={theme.colors.neutral[900]} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.neutral[900]} />
                <Text
                  className="text-neutral-900"
                  style={{
                    fontFamily: typography.fontFamily.sans.medium,
                    fontSize: 15,
                  }}
                >
                  Sign Out
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
