import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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

      // Create user preferences
      const { error: prefError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          style_tags: selectedStyles,
          favorite_colors: selectedColors,
          pattern_preferences: selectedPatterns,
        });

      if (prefError) throw prefError;

      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({ style_quiz_completed: true })
        .eq('id', user.id);

      if (userError) throw userError;

      // Navigate to main app
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
          <View className="flex-1">
            <Text className="text-2xl font-serif-bold text-neutral-900 mb-2">
              Pick your styles
            </Text>
            <Text className="text-base text-neutral-600 mb-6">
              Choose at least 3 that resonate with you
            </Text>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-3">
                {styleOptions.map((style) => (
                  <TouchableOpacity
                    key={style.id}
                    onPress={() => toggleSelection(style.id, selectedStyles, setSelectedStyles)}
                    className={`px-5 py-3 rounded-full border-2 ${
                      selectedStyles.includes(style.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        selectedStyles.includes(style.id)
                          ? 'text-primary-500 font-sans-semibold'
                          : 'text-neutral-700'
                      }`}
                    >
                      {style.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text className="text-sm text-neutral-600 mt-4 mb-4">
              {selectedStyles.length}/3 selected
            </Text>
          </View>
        );

      case 2:
        return (
          <View className="flex-1">
            <Text className="text-2xl font-serif-bold text-neutral-900 mb-2">
              Your color palette
            </Text>
            <Text className="text-base text-neutral-600 mb-6">
              Tap colors you're drawn to
            </Text>

            <View className="flex-row flex-wrap gap-4 mb-8">
              {colorOptions.map((color) => (
                <TouchableOpacity
                  key={color.id}
                  onPress={() => toggleSelection(color.id, selectedColors, setSelectedColors)}
                  className="items-center"
                >
                  <View
                    className={`w-16 h-16 rounded-full mb-2 ${
                      selectedColors.includes(color.id) ? 'border-4 border-primary-500' : ''
                    }`}
                    style={{
                      backgroundColor: color.color,
                      borderColor: color.id === 'white' ? '#E5E5E5' : undefined,
                      borderWidth: color.id === 'white' ? 1 : undefined,
                    }}
                  />
                  <Text className="text-xs text-neutral-700">{color.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xl font-serif-bold text-neutral-900 mb-4">
              Pattern preferences
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {patternOptions.map((pattern) => (
                <TouchableOpacity
                  key={pattern.id}
                  onPress={() =>
                    toggleSelection(pattern.id, selectedPatterns, setSelectedPatterns)
                  }
                  className={`px-5 py-3 rounded-full border-2 ${
                    selectedPatterns.includes(pattern.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-base ${
                      selectedPatterns.includes(pattern.id)
                        ? 'text-primary-500 font-sans-semibold'
                        : 'text-neutral-700'
                    }`}
                  >
                    {pattern.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* Header */}
      <View className="mt-4 mb-6">
        <View className="flex-row gap-2 mb-6">
          <View className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-neutral-200'}`} />
          <View className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-neutral-200'}`} />
        </View>

        <Text className="text-3xl font-serif-bold text-neutral-900 mb-2">
          Let's find your style
        </Text>
        <Text className="text-base text-neutral-600">
          Answer 2 quick questions for personalized recommendations
        </Text>
      </View>

      {renderStep()}

      {/* Bottom Actions */}
      <View className="pb-8 flex-row gap-3">
        {step > 1 && (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            className="flex-1 border-2 border-neutral-200 rounded-xl h-14 items-center justify-center"
          >
            <Text className="text-neutral-700 text-base font-sans-semibold">Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => (step < 2 ? setStep(step + 1) : handleComplete())}
          disabled={(step === 1 && selectedStyles.length < 3) || loading}
          className={`flex-1 bg-primary-500 rounded-xl h-14 items-center justify-center ${
            (step === 1 && selectedStyles.length < 3) || loading ? 'opacity-50' : ''
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base font-sans-semibold">
              {step === 2 ? 'Complete' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

