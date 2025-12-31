import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useMemo } from 'react';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

function getRedirectTo() {
  // Supabase OAuth does NOT work reliably in Expo Go because Supabase rejects exp:// redirects,
  // and the Expo Auth Proxy flow requires an AuthSession-managed request (not Supabase's /authorize URL).
  // The reliable approach is a development build / production build with a custom scheme deep link.
  return 'wardro8e://callback';
}

function parseCodeFromUrl(url: string): string | null {
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  if (!query) return null;
  const params = new URLSearchParams(query);
  return params.get('code');
}

function parseTokensFromUrlHash(url: string): { accessToken: string | null; refreshToken: string | null } {
  const hash = url.split('#')[1] ?? '';
  if (!hash) return { accessToken: null, refreshToken: null };
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
}

export default function AuthWelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const redirectTo = useMemo(() => getRedirectTo(), []);
  const isExpoGo = Constants.appOwnership === 'expo';

  const ensureUsersRow = async (userId: string, email?: string | null) => {
    const { error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          id: userId,
          email: email ?? undefined,
          onboarding_completed: false,
          style_quiz_completed: false,
        },
        { onConflict: 'id' }
      );

    if (upsertError) {
      console.error('⚠️ Failed to upsert public.users row (check RLS/policies):', upsertError);
    }
  };

  const completeOAuthFromRedirectUrl = async (redirectUrl: string) => {
    console.log('📍 OAuth redirect URL:', redirectUrl);

    const code = parseCodeFromUrl(redirectUrl);
    const { accessToken, refreshToken } = parseTokensFromUrlHash(redirectUrl);

    if (code) {
      console.log('✅ Found PKCE code, exchanging for session...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (!data.user) throw new Error('No user after exchanging code');
      await ensureUsersRow(data.user.id, data.user.email);
      await navigateBasedOnProfile(data.user.id);
      return;
    }

    if (accessToken && refreshToken) {
      console.log('✅ Found tokens, setting session...');
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user after setting session');
      await ensureUsersRow(data.user.id, data.user.email);
      await navigateBasedOnProfile(data.user.id);
      return;
    }

    throw new Error('Missing code/tokens in redirect URL');
  };

  /**
   * Navigate user based on their profile completion status
   */
  const navigateBasedOnProfile = async (userId: string) => {
    console.log('📍 Checking profile for user:', userId);
    
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    console.log('📍 Profile:', profile);

    if (!profile) {
      console.log('➡️ No profile - going to profile setup');
      router.replace('/(auth)/profile-setup');
    } else if (!profile.onboarding_completed) {
      console.log('➡️ Profile incomplete - going to profile setup');
      router.replace('/(auth)/profile-setup');
    } else if (!profile.style_quiz_completed) {
      console.log('➡️ Quiz incomplete - going to style quiz');
      router.replace('/(auth)/style-quiz');
    } else {
      console.log('➡️ All complete - going to tabs');
      router.replace('/(tabs)');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      console.log('📍 Starting Google OAuth...');
      console.log('📍 Using redirectTo:', redirectTo);

      if (isExpoGo) {
        // This prevents the loop where users keep ending up on a browser error page.
        throw new Error(
          'Google OAuth requires a Development Build (not Expo Go). Run `npx expo run:android` and try again.'
        );
      }

      // Start the OAuth flow WITH explicit redirectTo (Expo Auth Proxy)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo,
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        throw error;
      }

      if (!data.url) {
        throw new Error('No OAuth URL returned');
      }

      console.log('📍 Opening OAuth URL...');

      // In dev/prod builds, use a custom scheme deep link: wardro8e://callback
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        showInRecents: true,
        preferEphemeralSession: false,
      });

      console.log('📍 WebBrowser result:', JSON.stringify(result, null, 2));

      // Use the returned URL directly (most reliable on Android).
      if (result.type === 'success' && result.url) {
        await completeOAuthFromRedirectUrl(result.url);
      }
    } catch (error: any) {
      console.error('❌ Google OAuth error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes (backup method)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('📍 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in via state change');
          await navigateBasedOnProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
              {loading ? 'Signing in...' : 'Continue with Google'}
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
