# Wardro8e React Native Style Guide

*A comprehensive guide to design patterns, coding conventions, and architectural decisions for the Wardro8e mobile application.*

## Table of Contents

1. [Core Principles & Mobile UX](#1-core-principles--mobile-ux)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Design Tokens & Theme](#4-design-tokens--theme)
5. [Typography System](#5-typography-system)
6. [Spacing & Layout](#6-spacing--layout)
7. [Color System](#7-color-system)
8. [Component Library](#8-component-library)
9. [Navigation Patterns](#9-navigation-patterns)
10. [Forms & Input Handling](#10-forms--input-handling)
11. [Authentication Flow](#11-authentication-flow)
12. [State Management](#12-state-management)
13. [API Integration](#13-api-integration)
14. [Animations & Gestures](#14-animations--gestures)
15. [Platform Specifics](#15-platform-specifics)
16. [Performance Guidelines](#16-performance-guidelines)
17. [Accessibility](#17-accessibility)
18. [Error Handling](#18-error-handling)
19. [Testing Strategy](#19-testing-strategy)
20. [Security & Storage](#20-security--storage)

---

## 1. Core Principles & Mobile UX

### Design Philosophy
- **Thumb-friendly**: Primary actions within comfortable thumb reach
- **Minimal friction**: Core actions achievable in ≤ 3 taps
- **Immediate feedback**: Touch states, haptics, and loading indicators
- **Progressive disclosure**: Show complexity only when needed
- **Platform respect**: Honor iOS/Android conventions where appropriate
- **Offline-first**: Core features work without network

### Mobile-First Considerations
- Touch targets minimum 44pt (iOS) / 48dp (Android)
- Gesture navigation support
- Safe area respect (notches, home indicators)
- Keyboard avoidance behavior
- Pull-to-refresh patterns
- Swipe actions for common operations

---

## 2. Tech Stack & Dependencies

### Core
```json
{
  "react-native": "0.74.x",
  "typescript": "^5.x",
  "expo": "~51.0.0",
  "expo-router": "~3.x"
}
```

### Essential Libraries
```json
{
  // State & Data
  "@tanstack/react-query": "^5.x",
  "redux": "^4.x",
  "react-hook-form": "^7.x",
  
  // UI & Styling  
  "nativewind": "^4.x",
  "react-native-reanimated": "~3.x",
  "react-native-gesture-handler": "~2.x",
  "react-native-safe-area-context": "4.x",
  
  // Auth & Security
  "@supabase/supabase-js": "^2.x",
  "expo-secure-store": "~13.x",
  "expo-local-authentication": "~14.x",
  
  // Media & Performance
  "expo-image": "~1.x",
  "react-native-fast-image": "^8.x",
  "react-native-mmkv": "^2.x",
  
  // Utilities
  "expo-haptics": "~13.x",
  "expo-blur": "~13.x",
  "lottie-react-native": "6.x"
}
```

---

## 3. Project Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth stack
│   ├── (tabs)/            # Tab navigator
│   └── _layout.tsx        # Root layout
├── components/            
│   ├── ui/                # Base components
│   ├── features/          # Feature-specific
│   └── layouts/           # Screen layouts
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── api/               # API layer
│   ├── storage/           # MMKV storage
│   └── validators/        # Zod schemas
├── hooks/                 # Custom hooks
├── store/                 # Redux stores
├── styles/
│   ├── theme.ts           # Design tokens
│   └── tw.ts              # NativeWind config
└── utils/                 # Helpers
```

---

## 4. Design Tokens & Theme

### Theme Configuration
```typescript
// styles/theme.ts
export const theme = {
  colors: {
    // Primary Palette
    primary: {
      50: '#E6F7F5',
      100: '#CCEFEB',
      200: '#99DFD7',
      300: '#66CFC3',
      400: '#33BFAF',
      500: '#208B84', // Main brand teal
      600: '#1A6F69',
      700: '#145350',
      800: '#0D3836',
      900: '#071C1B',
    },
    
    // Neutrals
    neutral: {
      0: '#FFFFFF',
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },
    
    // Semantic
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
  },
  
  borderRadius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
```

---

## 5. Typography System

### Font Configuration
```typescript
// styles/typography.ts
export const typography = {
  fontFamily: {
    // Primary fonts
    sans: {
      thin: 'Montserrat-Thin',
      light: 'Montserrat-Light',
      regular: 'Montserrat-Regular',
      medium: 'Montserrat-Medium',
      semibold: 'Montserrat-SemiBold',
      bold: 'Montserrat-Bold',
    },
    serif: {
      regular: 'PlayfairDisplay-Regular',
      medium: 'PlayfairDisplay-Medium',
      bold: 'PlayfairDisplay-Bold',
    },
  },
  
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
  },
  
  lineHeights: {
    tight: 1.1,
    snug: 1.2,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.7,
  },
  
  // Predefined styles
  styles: {
    // Headings (Serif)
    h1: {
      fontFamily: 'PlayfairDisplay-Bold',
      fontSize: 32,
      lineHeight: 32 * 1.1,
      letterSpacing: -0.5,
    },
    h2: {
      fontFamily: 'PlayfairDisplay-Bold', 
      fontSize: 28,
      lineHeight: 28 * 1.2,
      letterSpacing: -0.3,
    },
    h3: {
      fontFamily: 'PlayfairDisplay-Medium',
      fontSize: 24,
      lineHeight: 24 * 1.2,
    },
    
    // Body (Sans)
    bodyLarge: {
      fontFamily: 'Montserrat-Regular',
      fontSize: 18,
      lineHeight: 18 * 1.5,
    },
    body: {
      fontFamily: 'Montserrat-Regular',
      fontSize: 16,
      lineHeight: 16 * 1.5,
    },
    bodySmall: {
      fontFamily: 'Montserrat-Regular',
      fontSize: 14,
      lineHeight: 14 * 1.4,
    },
    
    // UI Elements
    button: {
      fontFamily: 'Montserrat-SemiBold',
      fontSize: 16,
      lineHeight: 16 * 1.2,
      letterSpacing: 0.5,
    },
    caption: {
      fontFamily: 'Montserrat-Regular',
      fontSize: 12,
      lineHeight: 12 * 1.3,
    },
  },
};
```

---

## 6. Spacing & Layout

### Spacing Scale
```typescript
// Consistent 4pt grid system
const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,   // Default unit
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};
```

### Layout Guidelines
- Screen padding: 16pt horizontal, 20pt top
- Card padding: 16pt all sides
- List item padding: 16pt horizontal, 12pt vertical
- Section spacing: 24pt between major sections
- Input spacing: 12pt between form fields
- Button height: 48pt (default), 40pt (small), 56pt (large)

---

## 7. Color System

### Usage Patterns
```typescript
// components/ui/themed.tsx
export const themedColors = {
  // Backgrounds
  bgPrimary: 'bg-white dark:bg-neutral-950',
  bgSecondary: 'bg-neutral-50 dark:bg-neutral-900',
  bgCard: 'bg-white dark:bg-neutral-900',
  bgOverlay: 'bg-black/50 dark:bg-black/70',
  
  // Text
  textPrimary: 'text-neutral-900 dark:text-neutral-50',
  textSecondary: 'text-neutral-600 dark:text-neutral-400',
  textMuted: 'text-neutral-500 dark:text-neutral-500',
  
  // Borders
  border: 'border-neutral-200 dark:border-neutral-800',
  borderFocus: 'border-primary-500',
  
  // Interactive
  brandPrimary: 'bg-primary-500',
  brandSecondary: 'bg-primary-100 dark:bg-primary-900',
};
```

---

## 8. Component Library

### Button Component
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  haptic?: boolean;
}

const buttonStyles = {
  base: 'flex-row items-center justify-center rounded-xl active:scale-95',
  variants: {
    primary: 'bg-primary-500 active:bg-primary-600',
    secondary: 'bg-neutral-100 dark:bg-neutral-800',
    outline: 'border-2 border-neutral-200 dark:border-neutral-700',
    ghost: 'bg-transparent',
  },
  sizes: {
    sm: 'h-10 px-4',
    md: 'h-12 px-5',
    lg: 'h-14 px-6',
  },
};
```

### Input Component
```typescript
// components/ui/Input.tsx
interface InputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  secure?: boolean;
}

const inputStyles = {
  container: 'mb-4',
  label: 'text-sm text-neutral-700 dark:text-neutral-300 mb-1.5',
  input: 'h-12 px-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800',
  error: 'text-xs text-error mt-1',
  focused: 'border-primary-500',
};
```

### Card Component
```typescript
// components/ui/Card.tsx
const cardStyles = {
  base: 'bg-white dark:bg-neutral-900 rounded-2xl p-4',
  elevated: 'shadow-md',
  bordered: 'border border-neutral-200 dark:border-neutral-800',
  interactive: 'active:scale-98 transition-transform',
};
```

---

## 9. Navigation Patterns

### Tab Navigation
```typescript
// app/(tabs)/_layout.tsx
const tabConfig = {
  // Tab bar styling
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    elevation: 0,
  },
  
  // Tab styling
  tabs: {
    home: { icon: 'home', label: 'Home' },
    search: { icon: 'search', label: 'Discover' },
    create: { icon: 'plus-circle', label: 'Create', accent: true },
    wardrobe: { icon: 'hanger', label: 'Wardrobe' },
    profile: { icon: 'user', label: 'Profile' },
  },
};
```

### Stack Navigation
- Use slide transitions for forward navigation
- Modal presentation for creation flows
- Transparent modals for overlays
- Gesture-enabled back navigation

---

## 10. Forms & Input Handling

### Form Patterns
```typescript
// hooks/useForm.ts
const formConfig = {
  // Validation timing
  validateOn: 'blur', // or 'change' for critical fields
  
  // Error display
  errorDisplay: 'inline', // below each field
  
  // Submit behavior
  disableOnSubmit: true,
  showLoadingState: true,
  hapticFeedback: true,
};
```

### OTP Input
```typescript
// components/features/OTPInput.tsx
const otpStyles = {
  container: 'flex-row justify-between px-8',
  cell: 'w-12 h-14 rounded-xl bg-neutral-50 dark:bg-neutral-900 items-center justify-center border-2',
  cellFocused: 'border-primary-500',
  cellFilled: 'bg-primary-50 dark:bg-primary-900/20',
  text: 'text-2xl font-semibold',
};

// Features:
// - Auto-focus next field
// - Paste support (distribute across cells)
// - Backspace navigation
// - Haptic feedback on input
```

---

## 11. Authentication Flow

### Signup Flow
```typescript
// screens/auth/SignupFlow.tsx
const authFlow = {
  steps: [
    { id: 'brand', title: 'Brand Details' },
    { id: 'account', title: 'Create Account' },
    { id: 'verify', title: 'Verify Email' },
    { id: 'complete', title: 'Welcome!' },
  ],
  
  // Animations between steps
  transition: 'slide-horizontal',
  duration: 300,
  
  // Storage
  tempStorage: 'mmkv', // for partial form data
  tokenStorage: 'expo-secure-store',
};
```

### Biometric Auth
```typescript
// utils/biometric.ts
const biometricConfig = {
  // Face ID / Touch ID / Fingerprint
  promptMessage: 'Authenticate to access your wardrobe',
  fallbackLabel: 'Use Password',
  disableDeviceFallback: false,
  cancelLabel: 'Cancel',
};
```

---

## 12. State Management

### Store Structure
```typescript
// store/index.ts
interface AppStore {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // UI
  theme: 'light' | 'dark' | 'system';
  haptics: boolean;
  
  // Data
  wardrobe: WardrobeItem[];
  favorites: string[];
  
  // Actions
  setUser: (user: User) => void;
  logout: () => void;
  toggleTheme: () => void;
}
```

### Query Patterns
```typescript
// hooks/queries/useWardrobe.ts
const queryConfig = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  retry: 2,
};
```

---

## 13. API Integration

### Request Configuration
```typescript
// lib/api/client.ts
const apiConfig = {
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  
  // Retry logic
  retries: 3,
  retryDelay: exponentialBackoff,
  
  // Error handling
  interceptors: {
    response: handleAuthError,
    request: attachAuthToken,
  },
};
```

### Offline Support
```typescript
// lib/api/offline.ts
const offlineConfig = {
  // Queue actions when offline
  queueRequests: true,
  storage: 'mmkv',
  
  // Sync when back online
  autoSync: true,
  syncDebounce: 1000,
  
  // Conflict resolution
  conflictStrategy: 'client-wins', // or 'server-wins', 'merge'
};
```

---

## 14. Animations & Gestures

### Animation Presets
```typescript
// utils/animations.ts
export const animations = {
  // Entrance
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },
  
  slideUp: {
    from: { translateY: 20, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    duration: 400,
    easing: Easing.out(Easing.cubic),
  },
  
  // Interaction
  scale: {
    pressed: { scale: 0.95 },
    duration: 100,
  },
  
  // Loading
  pulse: {
    0: { opacity: 0.6 },
    0.5: { opacity: 1 },
    1: { opacity: 0.6 },
    loop: true,
    duration: 1500,
  },
};
```

### Gesture Handlers
```typescript
// Common gesture patterns
const gestures = {
  swipeToDelete: {
    threshold: 100,
    damping: 20,
    overshootLeft: false,
  },
  
  pullToRefresh: {
    threshold: 60,
    resistance: 2.5,
    hapticTrigger: true,
  },
  
  pinchToZoom: {
    minScale: 0.5,
    maxScale: 3,
    doubleTapScale: 2,
  },
};
```

---

## 15. Platform Specifics

### iOS Specific
```typescript
// utils/platform.ios.ts
const iosConfig = {
  // Safe areas
  statusBarHeight: 44, // iPhone with notch
  homeIndicatorHeight: 34,
  
  // Haptics
  impactStyle: 'light', // light, medium, heavy
  
  // Keyboard
  keyboardType: 'default',
  keyboardAppearance: 'dark',
};
```

### Android Specific
```typescript
// utils/platform.android.ts
const androidConfig = {
  // Status bar
  statusBarTranslucent: true,
  statusBarColor: 'transparent',
  
  // Navigation bar
  navigationBarColor: '#FFFFFF',
  
  // Ripple effect
  rippleColor: 'rgba(32, 139, 132, 0.2)',
  borderless: false,
};
```

---

## 16. Performance Guidelines

### Image Optimization
```typescript
// Use expo-image for optimal performance
const imageConfig = {
  cachePolicy: 'memory-disk', // Cache in memory and disk
  priority: 'high', // For above-fold images
  contentFit: 'cover',
  transition: 200, // Fade in duration
  recyclingKey: 'image-key', // For list recycling
  placeholder: 'blurhash',
};
```

### List Optimization
```typescript
// FlatList configuration
const listConfig = {
  // Performance
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  windowSize: 10,
  initialNumToRender: 10,
  
  // Memory
  getItemLayout: (data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }),
};
```

### Bundle Optimization
- Enable Hermes for Android
- Use ProGuard/R8 for Android
- Enable bitcode for iOS
- Lazy load heavy screens
- Split bundles for large features

---

## 17. Accessibility

### Required Attributes
```typescript
// All interactive elements must have:
const a11yProps = {
  accessible: true,
  accessibilityLabel: 'Descriptive label',
  accessibilityHint: 'What happens when activated',
  accessibilityRole: 'button', // button, link, image, etc.
  accessibilityState: { disabled: false, selected: false },
};
```

### Screen Reader Support
- Logical reading order
- Grouped related elements
- Announce state changes
- Support for VoiceOver (iOS) and TalkBack (Android)

### Visual Accessibility
- Minimum contrast ratio: 4.5:1 (normal text), 3:1 (large text)
- Touch targets: 44x44pt minimum
- Support for Dynamic Type (iOS)
- Dark mode support

---

## 18. Error Handling

### Error Boundaries
```typescript
// components/ErrorBoundary.tsx
const errorConfig = {
  // Fallback UI
  fallback: 'simple', // 'simple', 'detailed', 'custom'
  
  // Reporting
  reportToSentry: true,
  reportToAnalytics: true,
  
  // Recovery
  allowRetry: true,
  autoRecover: false,
};
```

### User-Facing Errors
```typescript
// utils/errors.ts
const errorMessages = {
  network: {
    title: 'Connection Issue',
    message: 'Please check your internet connection',
    action: 'Try Again',
  },
  
  auth: {
    title: 'Authentication Required',
    message: 'Please sign in to continue',
    action: 'Sign In',
  },
  
  generic: {
    title: 'Something went wrong',
    message: 'We're working on fixing this',
    action: 'Go Back',
  },
};
```

---

## 19. Testing Strategy

### Unit Testing
```typescript
// __tests__/components/Button.test.tsx
describe('Button Component', () => {
  // Visual
  it('renders correctly', () => {});
  it('applies variant styles', () => {});
  
  // Interaction
  it('handles press events', () => {});
  it('shows loading state', () => {});
  it('triggers haptic feedback', () => {});
  
  // Accessibility
  it('has proper accessibility props', () => {});
});
```

### Integration Testing
- Auth flows
- Navigation flows
- API interactions
- State management
- Offline functionality

### E2E Testing
```typescript
// e2e/auth.test.ts
describe('Auth Flow', () => {
  it('completes signup process', async () => {
    // Brand details → Account → OTP → Success
  });
  
  it('handles login with biometrics', async () => {
    // Email/Password → Biometric prompt → Dashboard
  });
});
```

---

## 20. Security & Storage

### Secure Storage
```typescript
// utils/storage.ts
const storageConfig = {
  // Sensitive data (tokens, credentials)
  secure: {
    provider: 'expo-secure-store',
    encryption: true,
    authenticationPrompt: 'Authenticate to access',
  },
  
  // General data (preferences, cache)
  general: {
    provider: 'mmkv',
    encryption: false,
    id: 'wardro8e.storage',
  },
  
  // Large data (images, files)
  files: {
    provider: 'expo-file-system',
    directory: 'documentDirectory',
  },
};
```

### Security Checklist
- [ ] API keys in environment variables
- [ ] Certificate pinning for production
- [ ] Obfuscation for production builds
- [ ] Secure keyboard for sensitive inputs
- [ ] No sensitive data in logs
- [ ] Biometric authentication option
- [ ] Session timeout handling
- [ ] Jailbreak/root detection (optional)

---

## Quick Reference

### Common Patterns
```typescript
// Button with haptic
<Button onPress={() => { Haptics.impactAsync('light'); handlePress(); }} />

// Dismissible keyboard view
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    {/* Content */}
  </TouchableWithoutFeedback>
</KeyboardAvoidingView>

// Pull to refresh
<FlatList
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.primary[500]}
    />
  }
/>

// Safe area wrapper
<SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
  {/* Screen content */}
</SafeAreaView>
```

### NativeWind Classes
```typescript
// Consistent with web but mobile-optimized
const styles = {
  // Containers
  screen: 'flex-1 bg-white dark:bg-neutral-950',
  safeArea: 'flex-1 px-4 pt-5',
  card: 'bg-white dark:bg-neutral-900 rounded-2xl p-4 mb-4',
  
  // Typography
  h1: 'font-serif-bold text-3xl text-neutral-900 dark:text-neutral-50',
  body: 'font-sans text-base text-neutral-700 dark:text-neutral-300',
  
  // Interactive
  button: 'bg-primary-500 rounded-xl h-12 px-5 items-center justify-center',
  input: 'bg-neutral-50 dark:bg-neutral-900 rounded-xl h-12 px-4 border',
  
  // States
  disabled: 'opacity-50',
  active: 'scale-95',
  error: 'border-red-500',
};
```

---

## Version History
- v1.0.0 - Initial mobile style guide
- Based on Wardro8e Web Style Guide v1.0

## Notes
- This guide assumes Expo SDK 51+ with Expo Router
- NativeWind v4 for Tailwind-style classes
- React Native 0.74+ for New Architecture support
- Designed for iOS 14+ and Android 7+