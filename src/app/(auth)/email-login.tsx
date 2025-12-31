import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

const GOOGLE_FAVICON_URI = 'https://www.google.com/s2/favicons?domain=google.com&sz=128';

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

function getRedirectTo() {
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

export default function EmailLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const redirectTo = useMemo(() => getRedirectTo(), []);
  const isExpoGo = Constants.appOwnership === 'expo';

  const navigateBasedOnProfile = async (userId: string) => {
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

    await Promise.all([
      storage.setProfileOnboardingCompleted(!!profile?.onboarding_completed || hasPrefs),
      storage.setStyleQuizCompleted(!!profile?.style_quiz_completed || hasPrefs),
    ]);

    if (!profile) {
      router.replace(hasPrefs ? '/(tabs)' : '/(auth)/profile-setup');
    } else if (!profile.onboarding_completed) {
      router.replace(hasPrefs ? '/(tabs)' : '/(auth)/profile-setup');
    } else if (!profile.style_quiz_completed) {
      router.replace(hasPrefs ? '/(tabs)' : '/(auth)/style-quiz');
    } else {
      router.replace('/(tabs)');
    }
  };

  const ensureUsersRow = async (userId: string, email?: string | null) => {
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
      onboarding_completed: false,
      style_quiz_completed: false,
    });

    if (insertError) {
      console.error('⚠️ Failed to insert public.users row (check RLS/policies):', insertError);
    }
  };

  const completeOAuthFromRedirectUrl = async (redirectUrl: string) => {
    const code = parseCodeFromUrl(redirectUrl);
    const { accessToken, refreshToken } = parseTokensFromUrlHash(redirectUrl);

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (!data.user) throw new Error('No user after exchanging code');
      await ensureUsersRow(data.user.id, data.user.email);
      await navigateBasedOnProfile(data.user.id);
      return;
    }

    if (accessToken && refreshToken) {
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) throw error;

      if (data.user?.id) {
        await navigateBasedOnProfile(data.user.id);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      if (isExpoGo) {
        throw new Error(
          'Google OAuth requires a Development Build (not Expo Go). Run `npx expo run:android` and try again.'
        );
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        showInRecents: true,
        preferEphemeralSession: false,
      });

      if (result.type === 'success' && result.url) {
        await completeOAuthFromRedirectUrl(result.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="flex-1 justify-between pt-12 px-6 pb-6">
      {/* Header */}
            <View className="items-center">
              <TouchableOpacity
                onPress={() => router.back()}
                className="absolute left-0 top-0"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-neutral-700 text-lg font-bold pb-2">←</Text>
        </TouchableOpacity>
            </View>
            {/* Form - Centered */}
            <View className="flex-1 justify-center w-full max-w-md mx-auto py-8">
              <View className="items-center mb-12">
                <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
                <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">Welcome Back</Text>
                <Text className="text-sm text-neutral-600 text-center px-4">Log in to your account</Text>
      </View>
              <View className="gap-5">
                {/* Google Sign In */}
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
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View className="flex-row items-center">
                  <View className="flex-1 h-px bg-neutral-200" />
                  <Text className="text-neutral-400 text-xs px-3">OR</Text>
                  <View className="flex-1 h-px bg-neutral-200" />
                </View>

        <View>
          <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
            Email Address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
          />
        </View>

        <View>
          <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
          />
        </View>
                <View className="pt-4">
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
                    className="bg-primary-500 rounded-xl h-12 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
                      <Text className="text-white text-sm font-sans-semibold">
              Log In
            </Text>
          )}
        </TouchableOpacity>
                </View>
              </View>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/email-signup')}
                className="items-center text-center mt-4"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
                <Text className="text-neutral-500 text-sm">Don't have an account? <Text className="text-primary-500 font-sans-semibold">Sign up</Text></Text>
        </TouchableOpacity>
      </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

