import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserProfile, UserPreferences } from '@/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

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
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is okay if preferences don't exist yet
        throw preferencesError;
      }

      setProfile(profileData);
      setPreferences(preferencesData || null);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatGender = (gender?: string) => {
    if (!gender) return 'Not set';
    const genderMap: { [key: string]: string } = {
      woman: 'Woman',
      man: 'Man',
      'non-binary': 'Non-binary',
      prefer_not_to_say: 'Prefer not to say',
    };
    return genderMap[gender] || gender;
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View className="flex-1 pt-12 px-6 pb-6">
          {/* Header */}
          <View className="items-center mb-8">
            <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
            <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">Profile</Text>
          </View>

          {/* Profile Content */}
          <View className="flex-1 w-full max-w-md mx-auto">
            {/* Personal Information Section */}
            <View className="mb-8">
              <Text className="text-2xl font-serif-bold text-neutral-900 mb-4 text-center">
                Personal Information
              </Text>

              <View className="gap-4">
                {/* Full Name */}
                <View>
                  <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
                    Full Name
                  </Text>
                  <View className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 justify-center">
                    <Text className="text-base text-neutral-900">
                      {profile?.full_name || 'Not set'}
                    </Text>
                  </View>
                </View>

                {/* Email */}
                <View>
                  <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
                    Email
                  </Text>
                  <View className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 justify-center">
                    <Text className="text-base text-neutral-900">
                      {profile?.email || 'Not set'}
                    </Text>
                  </View>
                </View>

                {/* Gender */}
                <View>
                  <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
                    Gender
                  </Text>
                  <View className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 justify-center">
                    <Text className="text-base text-neutral-900">
                      {formatGender(profile?.gender)}
                    </Text>
                  </View>
                </View>

                {/* Birthday */}
                <View>
                  <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
                    Birthday
                  </Text>
                  <View className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 justify-center">
                    <Text className="text-base text-neutral-900">
                      {formatDate(profile?.birthday)}
                    </Text>
                  </View>
                </View>

                {/* Phone (if available) */}
                {profile?.phone && (
                  <View>
                    <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
                      Phone
                    </Text>
                    <View className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 justify-center">
                      <Text className="text-base text-neutral-900">
                        {profile.phone}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Style Preferences Section */}
            {preferences && (
              <View className="mb-8">
                <Text className="text-2xl font-serif-bold text-neutral-900 mb-4 text-center">
                  Style Preferences
                </Text>

                {/* Style Tags */}
                {preferences.style_tags && preferences.style_tags.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm text-neutral-700 mb-3 font-sans-medium">
                      Style Tags
                    </Text>
                    <View className="flex-row flex-wrap gap-3">
                      {preferences.style_tags.map((tag, index) => (
                        <View
                          key={index}
                          className="py-3.5 px-4 rounded-full border-2 border-primary-500 bg-primary-50 items-center justify-center"
                          style={{
                            shadowColor: '#208B84',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3,
                          }}
                        >
                          <Text className="text-base text-primary-500 font-sans-semibold">
                            {tag.charAt(0).toUpperCase() + tag.slice(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Favorite Colors */}
                {preferences.favorite_colors && preferences.favorite_colors.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm text-neutral-700 mb-3 font-sans-medium">
                      Favorite Colors
                    </Text>
                    <View className="flex-row flex-wrap gap-3">
                      {preferences.favorite_colors.map((color, index) => (
                        <View
                          key={index}
                          className="py-3.5 px-4 rounded-full border-2 border-primary-500 bg-primary-50 items-center justify-center"
                          style={{
                            shadowColor: '#208B84',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3,
                          }}
                        >
                          <Text className="text-base text-primary-500 font-sans-semibold">
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Pattern Preferences */}
                {preferences.pattern_preferences && preferences.pattern_preferences.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-sm text-neutral-700 mb-3 font-sans-medium">
                      Pattern Preferences
                    </Text>
                    <View className="flex-row flex-wrap gap-3">
                      {preferences.pattern_preferences.map((pattern, index) => (
                        <View
                          key={index}
                          className="py-3.5 px-4 rounded-full border-2 border-primary-500 bg-primary-50 items-center justify-center"
                          style={{
                            shadowColor: '#208B84',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3,
                          }}
                        >
                          <Text className="text-base text-primary-500 font-sans-semibold">
                            {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Onboarding Status */}
            <View className="mb-8">
              <Text className="text-2xl font-serif-bold text-neutral-900 mb-4 text-center">
                Account Status
              </Text>
              <View className="gap-3">
                <View className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 flex-row items-center justify-between">
                  <Text className="text-sm text-neutral-700 font-sans-medium">
                    Onboarding Completed
                  </Text>
                  <View
                    className={`w-6 h-6 rounded-full ${
                      profile?.onboarding_completed ? 'bg-primary-500' : 'bg-neutral-300'
                    }`}
                  />
                </View>
                <View className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 flex-row items-center justify-between">
                  <Text className="text-sm text-neutral-700 font-sans-medium">
                    Style Quiz Completed
                  </Text>
                  <View
                    className={`w-6 h-6 rounded-full ${
                      profile?.style_quiz_completed ? 'bg-primary-500' : 'bg-neutral-300'
                    }`}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
