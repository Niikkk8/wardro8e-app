import { useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { supabase } from '@/lib/supabase';
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
      const { data: authUserData } = await supabase.auth.getUser();
      const authEmail =
        authUserData.user?.email ??
        (authUserData.user?.user_metadata as any)?.email ??
        undefined;

      if (!authEmail) {
        console.error('⚠️ Cannot upsert public.users because email is missing (email column is NOT NULL).');
      }

      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: userId,
            ...(authEmail ? { email: authEmail } : {}),
            onboarding_completed: false,
            style_quiz_completed: false,
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        console.error('⚠️ Failed to upsert public.users row (check RLS/policies):', upsertError);
      }

      // Check if user profile exists
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('📍 Profile check:', profile ? 'found' : 'not found');

      if (!profile) {
        // New user - go to profile setup
        console.log('➡️ Navigating to profile setup (no profile)');
        router.replace('/(auth)/profile-setup');
      } else if (!profile.onboarding_completed) {
        // Profile exists but not completed
        console.log('➡️ Navigating to profile setup (incomplete)');
        router.replace('/(auth)/profile-setup');
      } else if (!profile.style_quiz_completed) {
        // Existing user without quiz
        console.log('➡️ Navigating to style quiz');
        router.replace('/(auth)/style-quiz');
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

