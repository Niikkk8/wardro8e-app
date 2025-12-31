import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";
import { UserProfile, UserPreferences } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (preferencesError && preferencesError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is okay if preferences don't exist yet
        throw preferencesError;
      }

      setProfile(profileData);
      setPreferences(preferencesData || null);

      // Sync local storage flags so the rest of the app can route quickly/offline
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
      // Try parsing DD/MM/YYYY format first (Indian format)
      if (dateString.includes("/")) {
        const parts = dateString.split("/");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const year = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
      }
      // Fallback to standard Date parsing (for ISO format or other formats)
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

  const getColorHex = (colorName: string) => {
    const colorMap: { [key: string]: string } = {
      black: "#000000",
      white: "#FFFFFF",
      red: "#EF4444",
      blue: "#3B82F6",
      green: "#10B981",
      yellow: "#F59E0B",
      purple: "#8B5CF6",
      pink: "#EC4899",
      orange: "#F97316",
      brown: "#92400E",
      gray: "#6B7280",
      grey: "#6B7280",
      navy: "#1E3A8A",
      beige: "#F5F5DC",
      tan: "#D2B48C",
    };
    return colorMap[colorName.toLowerCase()] || "#E5E5E5";
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#208B84" />
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = formatDate(profile?.birthday);
  const gender = formatGender(profile?.gender);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Top Header with Back Icon and Title */}
      <View
        className="flex-row items-center px-6 py-4 border-b"
        style={{ borderBottomColor: "#E5E5E5" }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-neutral-700 text-lg font-bold pb-2">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-serif-bold text-neutral-900">
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Profile Header Section - Horizontal Layout */}
        <View className="px-6 py-8">
          <View className="flex-row items-center gap-4">
            {/* Avatar on Left */}
            <View className="relative">
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="rounded-full"
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              ) : (
                <View
                  className="bg-primary-500 rounded-full items-center justify-center"
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    shadowColor: "#208B84",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <Text className="text-white text-4xl font-serif-bold">
                    {getInitials(profile?.full_name)}
                  </Text>
                </View>
              )}
              {/* Edit button overlay */}
              <TouchableOpacity
                className="absolute bottom-0 right-0 bg-white rounded-full items-center justify-center border-2 border-primary-500"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Ionicons name="camera" size={14} color="#208B84" />
              </TouchableOpacity>
            </View>

            {/* Name and Details on Right */}
            <View className="flex-1">
              {/* Name */}
              <Text className="text-2xl font-serif-bold text-neutral-900 mb-2">
                {profile?.full_name || "User"}
              </Text>

              {/* Subtitle with key info */}
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="mail-outline" size={14} color="#737373" />
                  <Text className="text-sm text-neutral-500" numberOfLines={1}>
                    {profile?.email}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Content Sections */}
        <View className="px-6 pt-6">
          {/* Personal Details Card */}
          <View
            className="bg-white rounded-2xl p-6 mb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons
                name="person-circle-outline"
                size={20}
                color="#208B84"
              />
              <Text className="text-lg font-serif-bold text-neutral-900">
                Personal Details
              </Text>
            </View>

            <View className="gap-4">
              {/* Birthday */}
              {formattedDate && (
                <View
                  className="flex-row items-center justify-between py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: "#F5F5F5" }}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#737373"
                    />
                    <Text className="text-sm text-neutral-700 font-sans-medium">
                      Birthday
                    </Text>
                  </View>
                  <Text className="text-sm text-neutral-900">
                    {formattedDate}
                  </Text>
                </View>
              )}

              {/* Gender */}
              {gender && (
                <View
                  className="flex-row items-center justify-between py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: "#F5F5F5" }}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="person-outline" size={18} color="#737373" />
                    <Text className="text-sm text-neutral-700 font-sans-medium">
                      Gender
                    </Text>
                  </View>
                  <Text className="text-sm text-neutral-900">{gender}</Text>
                </View>
              )}

              {/* Phone */}
              {profile?.phone && (
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="call-outline" size={18} color="#737373" />
                    <Text className="text-sm text-neutral-700 font-sans-medium">
                      Phone
                    </Text>
                  </View>
                  <Text className="text-sm text-neutral-900">
                    {profile.phone}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Style Preferences Card */}
          {preferences && (
            <View
              className="bg-white rounded-2xl p-6 mb-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center gap-2 mb-6">
                <Text className="text-lg font-serif-bold text-neutral-900">
                  Style Preferences
                </Text>
              </View>

              {/* Style Tags */}
              {preferences.style_tags && preferences.style_tags.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center gap-2 mb-3">
                    <Text className="text-sm text-neutral-700 font-sans-semibold">
                      Style Tags
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2.5">
                    {preferences.style_tags.map((tag, index) => (
                      <View
                        key={index}
                        className="py-3 px-5 rounded-full border-2 border-primary-500 bg-primary-50 items-center justify-center"
                        style={{
                          shadowColor: "#208B84",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.15,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Text className="text-sm text-primary-500 font-sans-semibold">
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Favorite Colors */}
              {preferences.favorite_colors &&
                preferences.favorite_colors.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center gap-2 mb-4">
                      <Text className="text-sm text-neutral-700 font-sans-semibold">
                        Favorite Colors
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-4 items-center">
                      {preferences.favorite_colors.map((color, index) => (
                        <View key={index} className="items-center gap-2.5">
                          <View
                            className="rounded-full border-2 border-neutral-300"
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 28,
                              backgroundColor: getColorHex(color),
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 3 },
                              shadowOpacity: 0.15,
                              shadowRadius: 5,
                              elevation: 4,
                            }}
                          />
                          <Text className="text-xs text-neutral-700 font-sans-medium">
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

              {/* Pattern Preferences */}
              {preferences.pattern_preferences &&
                preferences.pattern_preferences.length > 0 && (
                  <View>
                    <View className="flex-row items-center gap-2 mb-3">
                      <Text className="text-sm text-neutral-700 font-sans-semibold">
                        Pattern Preferences
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2.5">
                      {preferences.pattern_preferences.map((pattern, index) => (
                        <View
                          key={index}
                          className="py-3 px-5 rounded-full border-2 border-primary-500 bg-primary-50 items-center justify-center"
                          style={{
                            shadowColor: "#208B84",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 4,
                            elevation: 3,
                          }}
                        >
                          <Text className="text-sm text-primary-500 font-sans-semibold">
                            {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
            </View>
          )}

          {/* Account Status Card */}
          <View
            className="bg-white rounded-2xl p-6 mb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#208B84"
              />
              <Text className="text-lg font-serif-bold text-neutral-900">
                Account Status
              </Text>
            </View>

            <View className="gap-3">
              <View
                className="flex-row items-center justify-between py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: "#F5F5F5" }}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={
                      profile?.onboarding_completed ? "#208B84" : "#D4D4D4"
                    }
                  />
                  <Text className="text-sm text-neutral-700 font-sans-medium">
                    Onboarding Completed
                  </Text>
                </View>
                <View
                  className={`w-5 h-5 rounded-full ${
                    profile?.onboarding_completed
                      ? "bg-primary-500"
                      : "bg-neutral-300"
                  }`}
                />
              </View>

              <View className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center gap-3">
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={
                      profile?.style_quiz_completed ? "#208B84" : "#D4D4D4"
                    }
                  />
                  <Text className="text-sm text-neutral-700 font-sans-medium">
                    Style Quiz Completed
                  </Text>
                </View>
                <View
                  className={`w-5 h-5 rounded-full ${
                    profile?.style_quiz_completed
                      ? "bg-primary-500"
                      : "bg-neutral-300"
                  }`}
                />
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 flex-row items-center justify-center gap-3"
            style={{
              shadowColor: "#EF4444",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text className="text-red-600 font-sans-semibold text-base">
                  Logout
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
