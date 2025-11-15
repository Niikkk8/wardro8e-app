import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { storage } from '@/lib/storage';

const onboardingSteps = [
  {
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop',
    title: 'Discover Unique Brands',
    description: 'Find emerging designers and boutique brands you won\'t see anywhere else',
  },
  {
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
    title: 'AI-Powered Style Matching',
    description: 'Our AI learns your taste and shows you exactly what you\'ll love',
  },
  {
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
    title: 'Create Style Boards',
    description: 'Save your favorites, create wishlists, and share inspiration with friends',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backButtonOpacity = useRef(new Animated.Value(0)).current;
  const backButtonWidth = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      const nextStep = currentStep + 1;
      const willShowBackButton = nextStep > 0;
      
      // Animate back button if needed
      if (willShowBackButton) {
        Animated.parallel([
          Animated.timing(backButtonOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(backButtonWidth, {
            toValue: 48,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
      }

      // Fade out and slide left
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(nextStep);
        // Reset and fade in from right
        slideAnim.setValue(30);
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
      });
    } else {
      handleGetStarted();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      const willHideBackButton = prevStep === 0;
      
      // Animate back button if needed
      if (willHideBackButton) {
        Animated.parallel([
          Animated.timing(backButtonOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(backButtonWidth, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
      }

      // Fade out and slide right
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 30,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(prevStep);
        // Reset and fade in from left
        slideAnim.setValue(-30);
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
      });
    }
  };

  const handleSkip = async () => {
    await storage.setOnboardingCompleted(true);
    router.replace('/(auth)/welcome');
  };

  const handleGetStarted = async () => {
    await storage.setOnboardingCompleted(true);
    router.replace('/(auth)/welcome');
  };

  useEffect(() => {
    // Initialize back button state
    if (currentStep > 0) {
      backButtonOpacity.setValue(1);
      backButtonWidth.setValue(48);
    } else {
      backButtonOpacity.setValue(0);
      backButtonWidth.setValue(0);
    }
  }, []);

  const step = onboardingSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between pt-20 px-6 pb-6">
        {/* Header with Skip Button */}
        <View className="items-center relative mb-8">
          <TouchableOpacity
            onPress={handleSkip}
            className="absolute right-0 top-0"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-primary-500 text-sm font-sans-semibold">
              Skip
            </Text>
          </TouchableOpacity>
          <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
          <Text className="text-sm text-neutral-500 text-center">Curated Fashion Discovery</Text>
        </View>

        {/* Animated Content - Centered */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
          className="items-center flex-1 justify-center"
        >
          {/* Image */}
          <View className="w-96 h-64 mb-6 rounded-2xl overflow-hidden bg-neutral-100">
            <Image
              source={{ uri: step.image }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">
            {step.title}
          </Text>
          <Text className="text-sm text-neutral-600 text-center px-8 leading-5">
            {step.description}
          </Text>
        </Animated.View>

        {/* Bottom Actions */}
        <View className="pt-4">
          {/* Progress Indicator */}
          <View className="flex-row gap-2 mb-6 justify-center">
            {onboardingSteps.map((_, index) => (
              <View
                key={index}
                className={`w-6 h-1 rounded-full ${
                  index <= currentStep ? 'bg-primary-500' : 'bg-neutral-200'
                }`}
              />
            ))}
          </View>

          {/* Navigation Buttons */}
          <View className="flex-row gap-3 mb-4">
            {/* Back Button - Animated */}
            <Animated.View
              style={{
                opacity: backButtonOpacity,
                width: backButtonWidth,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                onPress={handlePrevious}
                className="h-12 border border-neutral-200 rounded-xl items-center justify-center"
                disabled={isFirstStep}
              >
                <Text className="text-neutral-700 text-lg font-bold pb-2">←</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Continue/Get Started Button */}
            <TouchableOpacity
              onPress={handleNext}
              className="flex-1 bg-primary-500 rounded-xl h-12 items-center justify-center"
            >
              <Text className="text-white text-sm font-sans-semibold">
                {isLastStep ? 'Get Started' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/welcome')}
            className="h-10 items-center justify-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

