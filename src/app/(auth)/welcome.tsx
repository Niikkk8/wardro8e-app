import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

export default function AuthWelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Handle OAuth redirect when app returns from browser
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;

        // Check if this is an OAuth callback
        if (url.includes('callback') || url.includes('access_token')) {
          // Parse URL manually (React Native compatible)
          const urlParts = url.split('#')[1] || url.split('?')[1];
          const params = new URLSearchParams(urlParts);

          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // Set the session
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Session error:', error);
              Alert.alert('Error', 'Failed to complete sign in');
              return;
            }

            // Navigate based on user profile
            if (data.user) {
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();

              if (!profile) {
                router.replace('/(auth)/profile-setup');
              } else if (!profile.style_quiz_completed) {
                router.replace('/(auth)/style-quiz');
              } else {
                router.replace('/(tabs)');
              }
            }
          }
        }
      } catch (error) {
        console.error('Deep link error:', error);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      // Create redirect URL using the app scheme
      const redirectUrl = Linking.createURL('/(auth)/callback');
      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('Opening OAuth URL:', data.url);

        // Open the OAuth URL in browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('OAuth result:', result.type);

        if (result.type === 'success' && result.url) {
          // Parse the callback URL (React Native compatible)
          const urlParts = result.url.split('#')[1] || result.url.split('?')[1];
          const params = new URLSearchParams(urlParts);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // Set session
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;

            // Check user profile and navigate
            if (sessionData.user) {
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', sessionData.user.id)
                .maybeSingle();

              if (!profile) {
                router.replace('/(auth)/profile-setup');
              } else if (!profile.style_quiz_completed) {
                router.replace('/(auth)/style-quiz');
              } else {
                router.replace('/(tabs)');
              }
            }
          }
        } else if (result.type === 'cancel') {
          console.log('User cancelled OAuth');
        } else {
          console.log('OAuth failed:', result);
        }
      }
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 flex-col px-6 pt-24">
        {/* Header */}
        <View className="flex-1 items-center">
          <View className="flex-col items-center justify-center">
            <Text className="text-3xl font-serif-medium text-neutral-900 mb-2">
              Welcome to
            </Text>
            <Text className="text-6xl font-serif text-primary-500">
              Wardro8e
            </Text>
          </View>
        </View>

        {/* Auth Buttons - Centered */}
        <View className="flex-1 justify-center px-6">
          {/* Google Sign In */}
          <Text className="text-sm text-neutral-500 text-center mb-6">
            Sign up to discover fashion that matches your style
          </Text>
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            className="bg-white border border-neutral-300 rounded-xl h-12 flex-row items-center justify-center"
          >
            <Text className="text-neutral-900 text-sm font-sans-medium">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-neutral-200" />
            <Text className="text-neutral-400 text-xs px-3">OR</Text>
            <View className="flex-1 h-px bg-neutral-200" />
          </View>

          {/* Email Sign Up */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/email-signup')}
            className="bg-primary-500 rounded-xl h-12 items-center justify-center"
          >
            <Text className="text-white text-sm font-sans-semibold">
              Continue with Email
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text className="text-neutral-400 text-xs text-center mt-4 px-4 leading-4">
            By continuing, you agree to our{' '}
            <Text className="text-primary-500">Terms</Text> and{' '}
            <Text className="text-primary-500">Privacy Policy</Text>
          </Text>
        </View>

        {/* Bottom Link */}
        <View className="flex-1 justify-end items-center px-6 pb-12">
          <TouchableOpacity onPress={() => router.push('/(auth)/email-login')} className="py-2 items-center">
            <Text className="text-neutral-600 text-sm items-center">Already have an account? <Text className="text-primary-500 font-sans-semibold items-center">Log in</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

