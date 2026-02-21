import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { clientStorage } from '@/lib/clientStorage';
import { preferenceService } from '@/lib/preferenceService';

const styleOptions = [
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'bohemian', label: 'Bohemian' },
  { id: 'casual', label: 'Casual' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'edgy', label: 'Edgy' },
  { id: 'classic', label: 'Classic' },
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'elegant', label: 'Elegant' },
];

const colorOptions = [
  { id: 'black', label: 'Black', color: '#000000' },
  { id: 'white', label: 'White', color: '#FFFFFF' },
  { id: 'blue', label: 'Blue', color: '#3B82F6' },
  { id: 'pink', label: 'Pink', color: '#EC4899' },
  { id: 'red', label: 'Red', color: '#EF4444' },
  { id: 'green', label: 'Green', color: '#10B981' },
  { id: 'beige', label: 'Beige', color: '#D4C5B9' },
  { id: 'grey', label: 'Grey', color: '#6B7280' },
];

const patternOptions = [
  { id: 'solids', label: 'Solids' },
  { id: 'florals', label: 'Florals' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'abstract', label: 'Abstract' },
];

export default function StyleQuizScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const screenWidth = Dimensions.get('window').width;
  const pillWidth = (screenWidth - 72) / 2; // screen width - padding (20*2) - gap (12) / 2 columns

  const toggleSelection = (item: string, list: string[], setter: Function) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleComplete = async () => {
    if (selectedStyles.length < 3) {
      Alert.alert('Please select at least 3 styles');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          style_tags: selectedStyles,
          favorite_colors: selectedColors,
          pattern_preferences: selectedPatterns,
          // quiz_skipped: false — add column in Supabase first (see supabase/migrations)
        }, {
          onConflict: 'user_id',
        });

      if (prefError) throw prefError;

      const { error: userError } = await supabase
        .from('users')
        .update({ style_quiz_completed: true, onboarding_completed: true })
        .eq('id', user.id);

      if (userError) throw userError;

      await storage.setStyleQuizCompleted(true);

      // Reset style counters + feed cache so personalization uses fresh quiz data
      await preferenceService.resetLearnedPreferences(user.id);

      // Navigate immediately, feed shows skeleton while loading
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create preferences row with all fields null (skip state stored locally; add quiz_skipped column in Supabase to persist)
      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          style_tags: [],
          favorite_colors: [],
          pattern_preferences: [],
          // quiz_skipped: true — add column in Supabase first (see supabase/migrations)
        }, {
          onConflict: 'user_id',
        });

      if (prefError) throw prefError;

      const { error: userError } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (userError) throw userError;

      await storage.setStyleQuizCompleted(true);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View className="items-center w-full">
            <Text className="text-2xl font-serif-bold text-neutral-900 mb-2 text-center">
              Pick your styles
            </Text>
            <Text className="text-sm text-neutral-600 mb-8 text-center px-4 leading-5">
              Choose at least 3 that resonate with you
            </Text>

            <View className="w-full mb-6">
              <View className="flex-row flex-wrap gap-3">
                {styleOptions.map((style) => (
                  <TouchableOpacity
                    key={style.id}
                    onPress={() => toggleSelection(style.id, selectedStyles, setSelectedStyles)}
                    className={`py-3.5 rounded-full border-2 items-center justify-center ${
                      selectedStyles.includes(style.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 bg-white'
                    }`}
                    style={{
                      width: pillWidth,
                      shadowColor: selectedStyles.includes(style.id) ? '#208B84' : '#000',
                      shadowOffset: { width: 0, height: selectedStyles.includes(style.id) ? 2 : 1 },
                      shadowOpacity: selectedStyles.includes(style.id) ? 0.1 : 0.05,
                      shadowRadius: selectedStyles.includes(style.id) ? 4 : 2,
                      elevation: selectedStyles.includes(style.id) ? 3 : 1,
                    }}
                  >
                    <Text
                      className={`text-base ${
                        selectedStyles.includes(style.id)
                          ? 'text-primary-500 font-sans-semibold'
                          : 'text-neutral-700 font-sans-medium'
                      }`}
                      numberOfLines={1}
                    >
                      {style.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="bg-neutral-50 rounded-xl px-4 py-2.5">
              <Text className={`text-sm font-sans-medium ${
                selectedStyles.length >= 3 ? 'text-primary-500' : 'text-neutral-600'
              }`}>
                {selectedStyles.length}/3 selected
              </Text>
            </View>
          </View>
        );

      case 2:
        const colorWidth = (screenWidth - 72 - 18) / 4; // 4 columns: padding (24*2) + gaps (12*3) = 72 + 18
        return (
          <View className="w-full">
            {/* Color Palette Section */}
            <View className="w-full mb-12">
              <Text className="text-2xl font-serif-bold text-neutral-900 mb-2 text-center">
                Your color palette
              </Text>
              <Text className="text-sm text-neutral-600 mb-8 text-center px-4 leading-5">
                Tap colors you're drawn to
              </Text>

              <View className="flex-row flex-wrap gap-3 w-full">
                {colorOptions.map((color) => {
                  const isSelected = selectedColors.includes(color.id);
                  return (
                    <TouchableOpacity
                      key={color.id}
                      onPress={() => toggleSelection(color.id, selectedColors, setSelectedColors)}
                      className="items-center"
                      style={{
                        width: colorWidth,
                      }}
                    >
                      <View
                        className={`rounded-full mb-2.5 ${
                          isSelected ? 'border-4 border-primary-500' : 'border-2 border-neutral-200'
                        }`}
                        style={{
                          width: colorWidth - 4,
                          height: colorWidth - 4,
                          backgroundColor: color.color,
                          shadowColor: isSelected ? '#208B84' : '#000',
                          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                          shadowOpacity: isSelected ? 0.2 : 0.1,
                          shadowRadius: isSelected ? 6 : 3,
                          elevation: isSelected ? 4 : 2,
                        }}
                      />
                      <Text 
                        className={`text-xs font-sans-medium ${
                          isSelected ? 'text-primary-500' : 'text-neutral-700'
                        }`}
                        numberOfLines={1}
                      >
                        {color.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-neutral-200 mb-10 w-full" />

            {/* Pattern Preferences Section */}
            <View className="w-full">
              <Text className="text-2xl font-serif-bold text-neutral-900 mb-6 text-center">
                Pattern preferences
              </Text>
              <View className="flex-row flex-wrap gap-3 w-full">
                {patternOptions.map((pattern) => (
                  <TouchableOpacity
                    key={pattern.id}
                    onPress={() =>
                      toggleSelection(pattern.id, selectedPatterns, setSelectedPatterns)
                    }
                    className={`py-3.5 rounded-full border-2 items-center justify-center ${
                      selectedPatterns.includes(pattern.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 bg-white'
                    }`}
                    style={{
                      width: pillWidth,
                      shadowColor: selectedPatterns.includes(pattern.id) ? '#208B84' : '#000',
                      shadowOffset: { width: 0, height: selectedPatterns.includes(pattern.id) ? 2 : 1 },
                      shadowOpacity: selectedPatterns.includes(pattern.id) ? 0.1 : 0.05,
                      shadowRadius: selectedPatterns.includes(pattern.id) ? 4 : 2,
                      elevation: selectedPatterns.includes(pattern.id) ? 3 : 1,
                    }}
                  >
                    <Text
                      className={`text-base ${
                        selectedPatterns.includes(pattern.id)
                          ? 'text-primary-500 font-sans-semibold'
                          : 'text-neutral-700 font-sans-medium'
                      }`}
                      numberOfLines={1}
                    >
                      {pattern.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between pt-12 px-6 pb-6">
        {/* Header */}
        <View className="items-center mb-6">
          <Text className="text-5xl font-serif text-primary-500 text-center mb-3">
            Wardro8e
          </Text>
          
          {/* Progress Indicator */}
          <View className="flex-row gap-2 mb-6 w-full max-w-xs">
            <View className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-neutral-200'}`} />
            <View className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-neutral-200'}`} />
          </View>

          <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">
            Let's find your style
          </Text>
          <Text className="text-sm text-neutral-600 text-center px-4 leading-5">
            Answer 2 quick questions for personalized recommendations
          </Text>
        </View>

        {/* Content - Centered with Scroll */}
        <View className="flex-1 justify-center w-full max-w-2xl mx-auto">
          <ScrollView 
            className="flex-1" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 4 }}
          >
            {renderStep()}
          </ScrollView>
        </View>

        {/* Bottom Actions */}
        <View className="pt-6">
          <View className="flex-row gap-3">
            {step > 1 && (
              <TouchableOpacity
                onPress={() => setStep(step - 1)}
                className="w-12 h-12 border border-neutral-200 rounded-xl items-center justify-center bg-white"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text className="text-neutral-700 text-lg font-bold pb-2">←</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => (step < 2 ? setStep(step + 1) : handleComplete())}
              disabled={(step === 1 && selectedStyles.length < 3) || loading}
              className={`${step > 1 ? 'flex-1' : 'w-full'} bg-primary-500 rounded-xl h-12 items-center justify-center ${
                (step === 1 && selectedStyles.length < 3) || loading ? 'opacity-50' : ''
              }`}
              style={{
                shadowColor: (step === 1 && selectedStyles.length < 3) || loading ? 'transparent' : '#208B84',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: (step === 1 && selectedStyles.length < 3) || loading ? 0 : 4,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-sm font-sans-semibold">
                  {step === 2 ? 'Complete' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSkip}
            disabled={loading}
            className="mt-3 py-3 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-neutral-500 text-sm font-sans-medium">
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

