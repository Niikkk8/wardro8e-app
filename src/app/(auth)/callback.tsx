import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  async function handleAuthCallback() {
    try {
      // Extract tokens from URL params
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;

      if (!accessToken || !refreshToken) {
        console.error('Missing tokens in callback');
        router.replace('/(auth)/welcome');
        return;
      }

      // Set the session
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Session error:', error);
        router.replace('/(auth)/welcome');
        return;
      }

      if (!data.user) {
        router.replace('/(auth)/welcome');
        return;
      }

      // Check if user profile exists
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile) {
        // New user - go to profile setup
        router.replace('/(auth)/profile-setup');
      } else if (!profile.style_quiz_completed) {
        // Existing user without quiz
        router.replace('/(auth)/style-quiz');
      } else {
        // Everything complete
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Callback error:', error);
      router.replace('/(auth)/welcome');
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#208B84" />
    </View>
  );
}

