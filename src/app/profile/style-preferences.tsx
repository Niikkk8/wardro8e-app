import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { UserPreferences } from "@/types";
import { theme } from "@/styles/theme";
import { typography } from "@/styles/typography";

export default function StylePreferencesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: preferencesData, error: preferencesError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (preferencesError && preferencesError.code !== "PGRST116") {
        throw preferencesError;
      }

      setPreferences(preferencesData || null);
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

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
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
      >
        {/* Page Title */}
        <Text
          className="text-neutral-900 mb-2"
          style={{
            fontFamily: typography.fontFamily.serif.bold,
            fontSize: 28,
            lineHeight: 34,
          }}
        >
          Style Preferences
        </Text>
        <Text
          className="text-neutral-500 mb-8"
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          Your personalized style profile based on your quiz responses
        </Text>

        {!preferences ? (
          <View className="items-center justify-center py-12">
            <Ionicons
              name="sparkles-outline"
              size={48}
              color={theme.colors.neutral[300]}
            />
            <Text
              className="text-neutral-500 mt-4 text-center"
              style={typography.styles.body}
            >
              You haven't completed the style quiz yet
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/style-quiz")}
              className="mt-6 bg-neutral-900 rounded-xl px-6 py-3"
            >
              <Text
                className="text-white"
                style={typography.styles.button}
              >
                Take Style Quiz
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-8">
            {/* Style Tags */}
            {preferences.style_tags && preferences.style_tags.length > 0 && (
              <View>
                <View className="flex-row items-center gap-2 mb-4">
                  <Ionicons name="shirt-outline" size={20} color={theme.colors.neutral[700]} />
                  <Text
                    className="text-neutral-900"
                    style={{
                      fontFamily: typography.fontFamily.serif.medium,
                      fontSize: 18,
                    }}
                  >
                    Your Style
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  {preferences.style_tags.map((tag, index) => (
                    <View
                      key={index}
                      className="py-3 px-5 rounded-full bg-neutral-900 items-center justify-center"
                    >
                      <Text
                        className="text-white"
                        style={{
                          fontFamily: typography.fontFamily.sans.medium,
                          fontSize: 14,
                        }}
                      >
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
                <View>
                  <View className="flex-row items-center gap-2 mb-4">
                    <Ionicons name="color-palette-outline" size={20} color={theme.colors.neutral[700]} />
                    <Text
                      className="text-neutral-900"
                      style={{
                        fontFamily: typography.fontFamily.serif.medium,
                        fontSize: 18,
                      }}
                    >
                      Color Palette
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-5">
                    {preferences.favorite_colors.map((color, index) => (
                      <View key={index} className="items-center gap-3">
                        <View
                          className="rounded-full"
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: getColorHex(color),
                            borderWidth: color.toLowerCase() === 'white' ? 1 : 0,
                            borderColor: theme.colors.neutral[200],
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.15,
                            shadowRadius: 8,
                            elevation: 5,
                          }}
                        />
                        <Text
                          className="text-neutral-700"
                          style={{
                            fontFamily: typography.fontFamily.sans.medium,
                            fontSize: 12,
                          }}
                        >
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
                  <View className="flex-row items-center gap-2 mb-4">
                    <Ionicons name="grid-outline" size={20} color={theme.colors.neutral[700]} />
                    <Text
                      className="text-neutral-900"
                      style={{
                        fontFamily: typography.fontFamily.serif.medium,
                        fontSize: 18,
                      }}
                    >
                      Patterns You Love
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {preferences.pattern_preferences.map((pattern, index) => (
                      <View
                        key={index}
                        className="py-3 px-5 rounded-full border border-neutral-300 items-center justify-center"
                      >
                        <Text
                          className="text-neutral-800"
                          style={{
                            fontFamily: typography.fontFamily.sans.medium,
                            fontSize: 14,
                          }}
                        >
                          {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

            {/* Retake Quiz Button */}
            <TouchableOpacity
              onPress={() => router.push("/(auth)/style-quiz")}
              className="mt-4 flex-row items-center justify-center gap-2 py-4 border border-neutral-300 rounded-xl"
            >
              <Ionicons name="refresh-outline" size={18} color={theme.colors.neutral[700]} />
              <Text
                className="text-neutral-700"
                style={{
                  fontFamily: typography.fontFamily.sans.medium,
                  fontSize: 14,
                }}
              >
                Retake Style Quiz
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
