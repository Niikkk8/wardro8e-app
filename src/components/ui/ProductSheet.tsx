/**
 * ProductSheet — immersive full-screen product viewer that slides up from the bottom.
 * Shows the product image carousel, key details, and quick-action buttons.
 * Keeps the user in the Explore feed context (no page navigation needed).
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Linking,
  Platform,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';

let LinearGradient: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}
let Haptics: typeof import('expo-haptics') | null = null;
try { Haptics = require('expo-haptics'); } catch {}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.46;

export interface ProductSheetProps {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onLike: (productId: string) => void;
  onSave: (productId: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
}

export function ProductSheet({
  product,
  visible,
  onClose,
  onLike,
  onSave,
  isLiked = false,
  isSaved = false,
}: ProductSheetProps) {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [imageIndex, setImageIndex] = useState(0);
  const [likedLocal, setLikedLocal] = useState(isLiked);
  const [savedLocal, setSavedLocal] = useState(isSaved);

  // Sync external state
  useEffect(() => { setLikedLocal(isLiked); }, [isLiked]);
  useEffect(() => { setSavedLocal(isSaved); }, [isSaved]);

  useEffect(() => {
    if (visible) {
      setImageIndex(0);
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          damping: 20,
          stiffness: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Drag-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, g) => g.dy > 0,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.8) {
          onClose();
        } else {
          Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleLike = useCallback(() => {
    if (!product) return;
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLikedLocal((v) => !v);
    onLike(product.id);
  }, [product, onLike]);

  const handleSave = useCallback(() => {
    if (!product) return;
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSavedLocal((v) => !v);
    onSave(product.id);
  }, [product, onSave]);

  const handleShop = useCallback(() => {
    if (!product?.affiliate_url) return;
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Linking.openURL(product.affiliate_url).catch(() => {});
  }, [product]);

  const handleViewDetails = useCallback(() => {
    if (!product) return;
    onClose();
    setTimeout(() => router.push(`/product/${product.id}` as any), 320);
  }, [product, onClose]);

  if (!product) return null;

  const images = product.image_urls?.filter(Boolean) ?? [];
  const hasDiscount = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.55)',
          opacity: backdropOpacity,
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SHEET_HEIGHT,
          backgroundColor: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          transform: [{ translateY: slideY }],
        }}
      >
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={{ paddingTop: 10, paddingBottom: 4, alignItems: 'center' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.neutral[200] }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Image carousel */}
          <ImageCarousel
            images={images}
            currentIndex={imageIndex}
            onIndexChange={setImageIndex}
            hasDiscount={hasDiscount}
            discountPct={discountPct}
          />

          {/* Content */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            {/* Brand */}
            {product.source_brand_name ? (
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.semibold,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: theme.colors.primary[600],
                  marginBottom: 4,
                }}
              >
                {product.source_brand_name}
              </Text>
            ) : null}

            {/* Title */}
            <Text
              style={{
                fontFamily: typography.fontFamily.serif.regular,
                fontSize: 20,
                lineHeight: 26,
                color: theme.colors.neutral[900],
                marginBottom: 10,
              }}
              numberOfLines={3}
            >
              {product.title}
            </Text>

            {/* Price row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.bold,
                  fontSize: 22,
                  color: hasDiscount ? theme.colors.error : theme.colors.neutral[900],
                }}
              >
                ₹{displayPrice.toLocaleString('en-IN')}
              </Text>
              {hasDiscount && (
                <>
                  <Text
                    style={{
                      fontFamily: typography.fontFamily.sans.regular,
                      fontSize: 14,
                      color: theme.colors.neutral[400],
                      textDecorationLine: 'line-through',
                    }}
                  >
                    ₹{product.price.toLocaleString('en-IN')}
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#FEE2E2',
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.sans.bold,
                        fontSize: 11,
                        color: theme.colors.error,
                      }}
                    >
                      {discountPct}% OFF
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Tags row: category, styles, occasion */}
            <TagsRow product={product} />

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text
                  style={{
                    fontFamily: typography.fontFamily.sans.semibold,
                    fontSize: 11,
                    color: theme.colors.neutral[500],
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Colours
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {product.colors.slice(0, 6).map((c) => (
                    <View
                      key={c}
                      style={{
                        borderRadius: 20,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: theme.colors.neutral[100],
                        borderWidth: 1,
                        borderColor: theme.colors.neutral[200],
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.fontFamily.sans.medium,
                          fontSize: 12,
                          color: theme.colors.neutral[700],
                        }}
                      >
                        {c}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Sizes */}
            {product.size_range && product.size_range.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text
                  style={{
                    fontFamily: typography.fontFamily.sans.semibold,
                    fontSize: 11,
                    color: theme.colors.neutral[500],
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Sizes
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {product.size_range.slice(0, 8).map((s) => (
                    <View
                      key={s}
                      style={{
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderWidth: 1,
                        borderColor: theme.colors.neutral[300],
                        minWidth: 36,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.fontFamily.sans.medium,
                          fontSize: 12,
                          color: theme.colors.neutral[700],
                        }}
                      >
                        {s}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* View full details link */}
            <TouchableOpacity
              onPress={handleViewDetails}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 4 }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.medium,
                  fontSize: 13,
                  color: theme.colors.primary[600],
                }}
              >
                View full details
              </Text>
              <Ionicons name="arrow-forward" size={13} color={theme.colors.primary[600]} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Sticky bottom action bar */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 32 : 16,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: theme.colors.neutral[100],
            flexDirection: 'row',
            gap: 10,
          }}
        >
          {/* Like */}
          <ActionButton
            icon={likedLocal ? 'heart' : 'heart-outline'}
            label="Like"
            onPress={handleLike}
            active={likedLocal}
            activeColor={theme.colors.error}
            variant="ghost"
          />
          {/* Save */}
          <ActionButton
            icon={savedLocal ? 'bookmark' : 'bookmark-outline'}
            label="Save"
            onPress={handleSave}
            active={savedLocal}
            activeColor={theme.colors.primary[600]}
            variant="ghost"
          />
          {/* Shop — primary CTA */}
          <TouchableOpacity
            onPress={handleShop}
            disabled={!product.affiliate_url}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: theme.colors.primary[600],
              borderRadius: theme.borderRadius.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 13,
              opacity: product.affiliate_url ? 1 : 0.4,
            }}
          >
            <Ionicons name="bag-outline" size={17} color="#fff" />
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.semibold,
                fontSize: 14,
                color: '#fff',
                letterSpacing: 0.3,
              }}
            >
              Shop Now
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ImageCarousel({
  images,
  currentIndex,
  onIndexChange,
  hasDiscount,
  discountPct,
}: {
  images: string[];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  hasDiscount: boolean;
  discountPct: number;
}) {
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (idx !== currentIndex) onIndexChange(idx);
    },
    [currentIndex, onIndexChange]
  );

  if (images.length === 0) {
    return (
      <View
        style={{
          height: IMAGE_HEIGHT,
          backgroundColor: theme.colors.neutral[100],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="image-outline" size={40} color={theme.colors.neutral[300]} />
      </View>
    );
  }

  return (
    <View style={{ height: IMAGE_HEIGHT }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
      >
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT, resizeMode: 'cover' }}
          />
        ))}
      </ScrollView>

      {/* Discount badge */}
      {hasDiscount && (
        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 16,
            backgroundColor: theme.colors.error,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.bold,
              fontSize: 11,
              color: '#fff',
            }}
          >
            -{discountPct}%
          </Text>
        </View>
      )}

      {/* Image indicator dots */}
      {images.length > 1 && (
        <View
          style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 5,
          }}
        >
          {images.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </View>
      )}

      {/* Image counter (top-right) */}
      {images.length > 1 && (
        <View
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            backgroundColor: 'rgba(0,0,0,0.45)',
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.medium,
              fontSize: 11,
              color: '#fff',
            }}
          >
            {currentIndex + 1}/{images.length}
          </Text>
        </View>
      )}
    </View>
  );
}

function TagsRow({ product }: { product: Product }) {
  const tags: string[] = [];
  if (product.category) tags.push(product.category);
  if (product.style) tags.push(...product.style.slice(0, 2));
  if (product.occasion) tags.push(...product.occasion.slice(0, 2));
  if (tags.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {tags.map((tag, i) => (
        <View
          key={`${tag}-${i}`}
          style={{
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: i === 0 ? theme.colors.primary[50] : theme.colors.neutral[100],
            borderWidth: 1,
            borderColor: i === 0 ? theme.colors.primary[200] : theme.colors.neutral[200],
          }}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.medium,
              fontSize: 11,
              color: i === 0 ? theme.colors.primary[700] : theme.colors.neutral[600],
            }}
          >
            {tag}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  active,
  activeColor,
  variant,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  variant: 'ghost';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: active && activeColor ? activeColor : theme.colors.neutral[200],
        paddingVertical: 10,
        backgroundColor: active && activeColor ? `${activeColor}12` : 'transparent',
      }}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={active && activeColor ? activeColor : theme.colors.neutral[500]}
      />
      <Text
        style={{
          fontFamily: typography.fontFamily.sans.medium,
          fontSize: 9,
          color: active && activeColor ? activeColor : theme.colors.neutral[500],
          marginTop: 2,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Minimal StyleSheet polyfill (react-native StyleSheet.absoluteFillObject)
const StyleSheet = {
  absoluteFillObject: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};
