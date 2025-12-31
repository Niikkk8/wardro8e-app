import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking destination
    if (authLoading) {
      return;
    }
    
    // Reset and check destination when auth state changes
    setChecking(true);
    setDestination(null);
    checkDestination();
  }, [user, authLoading]);

  async function checkDestination() {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    try {
      // Step 1: ALWAYS check onboarding completion FIRST (regardless of auth state)
      const onboardingCompleted = await storage.getOnboardingCompleted();
      console.log('📱 Onboarding completed status:', onboardingCompleted);
      
      if (!onboardingCompleted) {
        console.log('✅ Showing onboarding screens');
        setDestination('/(onboarding)');
        setChecking(false);
        return;
      }

      // Step 2: Onboarding is done, check authentication
      console.log('📱 User auth status:', user ? 'authenticated' : 'not authenticated');
      
      if (!user) {
        console.log('✅ Showing auth welcome screen');
        setDestination('/(auth)/welcome');
        setChecking(false);
        return;
      }

      // Step 3: User is authenticated, check their profile
      console.log('📱 Checking user profile for:', user.id);
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Returns null instead of throwing error

      if (error) {
        console.error('❌ Profile fetch error:', error);
        setDestination('/(auth)/profile-setup');
        setChecking(false);
        return;
      }

      if (!profile) {
        console.log('✅ No profile found - showing profile setup');
        setDestination('/(auth)/profile-setup');
        setChecking(false);
        return;
      }

      // Step 4: Check profile completion status
      console.log('📱 Profile status:', {
        onboarding_completed: profile.onboarding_completed,
        style_quiz_completed: profile.style_quiz_completed,
      });

      if (!profile.onboarding_completed) {
        console.log('✅ Profile not completed - showing profile setup');
        setDestination('/(auth)/profile-setup');
      } else if (!profile.style_quiz_completed) {
        console.log('✅ Quiz not completed - showing style quiz');
        setDestination('/(auth)/style-quiz');
      } else {
        console.log('✅ Everything complete - going to main app');
        setDestination('/(tabs)');
      }
      
      setChecking(false);
    } catch (error) {
      console.error('❌ Error checking destination:', error);
      // On any error, show onboarding (safest default)
      setDestination('/(onboarding)');
      setChecking(false);
    }
  }

  if (authLoading || checking || !destination) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#208B84" />
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}