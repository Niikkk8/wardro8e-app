import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { useState, useEffect, useMemo } from 'react';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

const GOOGLE_FAVICON_URI = 'https://www.google.com/s2/favicons?domain=google.com&sz=128';

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

  const extractAvatarUrl = (user: any): string | undefined => {
    // Check various possible locations for avatar URL in OAuth providers
    const metadata = user?.user_metadata || {};
    return metadata.avatar_url || metadata.picture || metadata.picture_url || undefined;
  };

  const ensureUsersRow = async (userId: string, email?: string | null, user?: any) => {
    const avatarUrl = user ? extractAvatarUrl(user) : undefined;

    // IMPORTANT: do NOT upsert completion flags here.
    // Old users would get their onboarding/style flags overwritten back to false.
    const { data: existing, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existing) return;
    if (selectError) console.error('⚠️ users select error (continuing):', selectError);

    if (!email) {
      console.error('⚠️ Cannot create users row: missing email (email is NOT NULL).');
      return;
    }

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email,
      avatar_url: avatarUrl ?? null,
      onboarding_completed: false,
      style_quiz_completed: false,
    });

    if (insertError) {
      console.error('⚠️ Failed to insert public.users row (check RLS/policies):', insertError);
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
      await ensureUsersRow(data.user.id, data.user.email, data.user);
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
      await ensureUsersRow(data.user.id, data.user.email, data.user);
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
    
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    const hasPrefs = !!prefs;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    console.log('📍 Profile:', profile);

    // Sync local storage flags on every successful auth routing decision
    await Promise.all([
      storage.setProfileOnboardingCompleted(!!profile?.onboarding_completed || hasPrefs),
      storage.setStyleQuizCompleted(!!profile?.style_quiz_completed || hasPrefs),
    ]);

    if (!profile) {
      console.log('➡️ No profile - going to profile setup');
      router.replace(hasPrefs ? '/(tabs)' : '/(auth)/profile-setup');
    } else if (!profile.onboarding_completed) {
      console.log('➡️ Profile incomplete - going to profile setup');
      router.replace(hasPrefs ? '/(tabs)' : '/(auth)/profile-setup');
    } else if (!profile.style_quiz_completed) {
      console.log('➡️ Quiz incomplete - going to style quiz');
      router.replace(hasPrefs ? '/(tabs)' : '/(auth)/style-quiz');
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
          // Ensure user row exists with avatar_url if available
          await ensureUsersRow(session.user.id, session.user.email, session.user);
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
            <Image
              source={{ uri: GOOGLE_FAVICON_URI }}
              style={{ width: 24, height: 24, marginRight: 8 }}
            />
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
