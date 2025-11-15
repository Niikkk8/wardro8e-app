import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between pt-20 px-6">
        {/* Header */}
        <View className="items-center">
          <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
          <Text className="text-sm text-neutral-500 text-center">Curated Fashion Discovery</Text>
        </View>

        {/* Content - Centered */}
        <View className="items-center">
          {/* Image */}
          <View className="w-96 h-64 mb-6 rounded-2xl overflow-hidden bg-neutral-100">
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop' }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">
            Discover Unique Brands
          </Text>
          <Text className="text-sm text-neutral-600 text-center px-8 leading-5">
            Find emerging designers and boutique brands you won't see anywhere else
          </Text>
        </View>

        {/* Bottom Actions */}
        <View>
          {/* Progress Indicator */}
          <View className="flex-row gap-2 mb-4 justify-center">
            <View className="w-6 h-1 bg-primary-500 rounded-full" />
            <View className="w-6 h-1 bg-neutral-200 rounded-full" />
            <View className="w-6 h-1 bg-neutral-200 rounded-full" />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/discover')}
            className="bg-primary-500 rounded-xl h-12 items-center justify-center mb-3"
          >
            <Text className="text-white text-sm font-sans-semibold">
              Continue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/welcome')}
            className="h-10 items-center justify-center"
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

