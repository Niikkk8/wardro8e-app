import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';

export default function DiscoverScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between pt-20 px-6">
        {/* Header */}
        <View className="items-center">
          <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
          <Text className="text-sm text-neutral-500 text-center">Curated Fashion Discovery</Text>
        </View>

        {/* Animated Content - Centered */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
          className="items-center"
        >
          {/* Image */}
          <View className="w-96 h-64 mb-6 rounded-2xl overflow-hidden bg-neutral-100">
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1558769132-cb1aea3c8565?q=80&w=800&auto=format&fit=crop' }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">
            AI-Powered Style Matching
          </Text>
          <Text className="text-sm text-neutral-600 text-center px-8 leading-5">
            Our AI learns your taste and shows you exactly what you'll love
          </Text>
        </Animated.View>

        {/* Bottom Actions */}
        <View>
          {/* Progress Indicator */}
          <View className="flex-row gap-2 mb-4 justify-center">
            <View className="w-6 h-1 bg-primary-500 rounded-full" />
            <View className="w-6 h-1 bg-primary-500 rounded-full" />
            <View className="w-6 h-1 bg-neutral-200 rounded-full" />
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-12 h-12 border border-neutral-200 rounded-xl items-center justify-center"
            >
              <Text className="text-neutral-700 text-lg font-bold pb-2 items-center">←</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(onboarding)/ai-matching')}
              className="flex-1 bg-primary-500 rounded-xl h-12 items-center justify-center"
            >
              <Text className="text-white text-sm font-sans-semibold">
                Continue
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/welcome')}
            className="h-10 items-center justify-center text-center"
          >
            <Text className="text-neutral-500 text-xs">
              Already have an account? <Text className="text-primary-500 font-sans-semibold">Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

