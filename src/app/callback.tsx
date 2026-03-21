import { useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import * as Linking from 'expo-linking';

/**
 * OAuth Callback Screen
 * This screen handles the redirect from OAuth providers (Google, etc.)
 * It's placed at /callback to match the redirect URL: wardro8e://callback
 */

/**
 * Parse PKCE auth code from URL (?code=...)
 */
function parseCodeFromUrl(url: string): string | null {
  try {
    const query = url.split('?')[1]?.split('#')[0] ?? '';
    if (!query) return null;
    const params = new URLSearchParams(query);
    return params.get('code');
  } catch (error) {
    console.error('Error parsing code from URL:', error);
    return null;
  }
}

/**
 * Parse implicit tokens from URL hash (#access_token=...&refresh_token=...)
 * (Some providers / settings may still return tokens instead of code.)
 */
function parseTokensFromUrlHash(url: string): { accessToken: string | null; refreshToken: string | null } {
  try {
    const hash = url.split('#')[1] ?? '';
    if (!hash) return { accessToken: null, refreshToken: null };
    const params = new URLSearchParams(hash);
    return {
      accessToken: params.get('access_token'),
      refreshToken: params.get('refresh_token'),
    };
  } catch (error) {
    console.error('Error parsing tokens from URL hash:', error);
    return { accessToken: null, refreshToken: null };
  }
}

export default function CallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    access_token?: string;
    refresh_token?: string;
  }>();
  const ranRef = useRef(false);

  const handleAuthCallback = useCallback(async () => {
    try {
      console.log('📍 Callback screen mounted');
      
      // Prefer Expo Router params (deep link already handled by router)
      const codeFromParams = typeof params.code === 'string' ? params.code : undefined;
      const accessFromParams = typeof params.access_token === 'string' ? params.access_token : undefined;
      const refreshFromParams = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;

      if (params.error) {
        console.error('❌ OAuth error:', params.error, params.error_description);
        router.replace('/(auth)/welcome');
        return;
      }

      // Fallback: try to parse from initial URL (may be null in many cases)
      const url = await Linking.getInitialURL();
      console.log('📍 Linking.getInitialURL():', url);

      const code = codeFromParams ?? (url ? parseCodeFromUrl(url) : null);
      const parsedTokens = url ? parseTokensFromUrlHash(url) : { accessToken: null, refreshToken: null };
      const accessToken = accessFromParams ?? parsedTokens.accessToken;
      const refreshToken = refreshFromParams ?? parsedTokens.refreshToken;

      let userId: string | null = null;

      if (code) {
        console.log('✅ Auth code found, exchanging for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        userId = data.user?.id ?? null;
      } else if (accessToken && refreshToken) {
        console.log('✅ Tokens found, setting session...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        userId = data.user?.id ?? null;
      } else {
        // Sometimes Expo Router consumes the deep link and we don't get params,
        // while the session is already established in the welcome screen.
        const { data: sessionData } = await supabase.auth.getSession();
        const existingUserId = sessionData.session?.user?.id;
        if (existingUserId) {
          console.log('✅ Session already exists, continuing with user:', existingUserId);
          userId = existingUserId;
        } else {
          console.error('❌ Missing code/tokens in callback. Params:', params);
          router.replace('/(auth)/welcome');
          return;
        }
      }

      if (!userId) {
        console.error('❌ No user after completing OAuth');
        router.replace('/(auth)/welcome');
        return;
      }

      console.log('✅ OAuth complete for user:', userId);

      // Ensure a row exists in public.users for OAuth users (best-effort; depends on RLS)
      // IMPORTANT: do NOT upsert completion flags here; it would reset old users.
      const { data: authUserData } = await supabase.auth.getUser();
      const authUser = authUserData.user;
      const authEmail =
        authUser?.email ??
        (authUser?.user_metadata as any)?.email ??
        undefined;

      // Extract avatar URL from OAuth provider metadata
      const extractAvatarUrl = (user: any): string | undefined => {
        const metadata = user?.user_metadata || {};
        return metadata.avatar_url || metadata.picture || metadata.picture_url || undefined;
      };
      const avatarUrl = authUser ? extractAvatarUrl(authUser) : undefined;

      // IMPORTANT: ignoreDuplicates ensures we never overwrite completion flags for existing users.
      if (!authEmail) {
        console.error('⚠️ Cannot create users row: missing email (email is NOT NULL).');
      } else {
        const { error: insertError } = await supabase.from('users').upsert({
          id: userId,
          email: authEmail,
          avatar_url: avatarUrl ?? null,
          onboarding_completed: false,
          style_quiz_completed: false,
        }, { onConflict: 'id', ignoreDuplicates: true });

        if (insertError) {
          console.error('⚠️ Failed to ensure public.users row:', insertError);
        }
      }

      // Check if user profile exists
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('📍 Profile check:', profile ? 'found' : 'not found');

      // If preferences exist, user has progressed past setup; skip profile-setup
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      const hasPrefs = !!prefs;

      await Promise.all([
        storage.setProfileOnboardingCompleted(!!profile?.onboarding_completed || hasPrefs),
        storage.setStyleQuizCompleted(!!profile?.style_quiz_completed || hasPrefs),
      ]);

      if (!profile) {
        // New user - go to profile setup
        console.log('➡️ Navigating to profile setup (no profile)');
        router.replace(hasPrefs ? '/(tabs)' : '/(auth)/profile-setup');
      } else if (!profile.onboarding_completed) {
        // Profile exists but not completed
        console.log('➡️ Navigating to profile setup (incomplete)');
        router.replace(hasPrefs ? '/(tabs)' : '/(auth)/profile-setup');
      } else if (!profile.style_quiz_completed) {
        // Existing user without quiz
        console.log('➡️ Navigating to style quiz');
        router.replace(hasPrefs ? '/(tabs)' : '/(auth)/style-quiz');
      } else {
        // Everything complete
        console.log('➡️ Navigating to main app');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('❌ Callback error:', error);
      router.replace('/(auth)/welcome');
    }
  }, [router]);

  useEffect(() => {
    // Prevent running twice on fast refresh / rerenders
    if (ranRef.current) return;
    ranRef.current = true;
    handleAuthCallback();
  }, [handleAuthCallback]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#208B84" />
      <Text className="mt-4 text-neutral-600">Completing sign in...</Text>
    </View>
  );
}

