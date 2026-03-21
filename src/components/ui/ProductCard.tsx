import React, { useState, useCallback } from 'react';
import { View, Image, TouchableOpacity, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { Product } from '../../types';

let Haptics: typeof import('expo-haptics') | null = null;
try { Haptics = require('expo-haptics'); } catch {}

interface ProductCardProps {
  product: Product;
  width: number;
  /** Fix the image area to a specific height (disables dynamic aspect-ratio sizing) */
  fixedImageHeight?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Show a like/heart toggle button */
  onLike?: () => void;
  isLiked?: boolean;
  /** Show a filled-heart remove button (wardrobe) instead of like toggle */
  onRemove?: () => void;
}

export default function ProductCard({
  product,
  width,
  fixedImageHeight,
  onPress,
  onLongPress,
  onLike,
  isLiked = false,
  onRemove,
}: ProductCardProps) {
  const [dynamicHeight, setDynamicHeight] = useState(width * 1.4);
  const [imageError, setImageError] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const imageHeight = fixedImageHeight ?? dynamicHeight;

  const handleImageLoad = useCallback((event: any) => {
    if (fixedImageHeight) return;
    const { width: imgWidth, height: imgHeight } = event.nativeEvent.source;
    if (imgWidth && imgHeight) {
      setDynamicHeight(width * (imgHeight / imgWidth));
    }
  }, [width, fixedImageHeight]);

  const handleLongPress = useCallback(() => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onLongPress?.();
  }, [onLongPress, scaleAnim]);

  const handleLike = useCallback(() => {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onLike?.();
  }, [onLike]);

  const imageUrl = product.image_urls?.[0];
  if (!imageUrl || imageError) return null;

  const hasDiscount = product.sale_price != null && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        delayLongPress={450}
        style={{
          width,
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: imageHeight, resizeMode: 'cover' }}
          onLoad={handleImageLoad}
          onError={() => setImageError(true)}
        />

        {/* Discount badge */}
        {hasDiscount && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: theme.colors.error,
              borderRadius: theme.borderRadius.full,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 9, fontFamily: typography.fontFamily.sans.bold }}>
              -{discountPercent}%
            </Text>
          </View>
        )}

        {/* Action button: like toggle or remove */}
        {(onLike || onRemove) && (
          <TouchableOpacity
            onPress={onRemove ?? handleLike}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadows.sm,
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={onRemove ? 'heart' : (isLiked ? 'heart' : 'heart-outline')}
              size={15}
              color={onRemove ? theme.colors.error : (isLiked ? theme.colors.error : theme.colors.neutral[600])}
            />
          </TouchableOpacity>
        )}

        {/* Info section — teal background, below image */}
        <View
          style={{
            backgroundColor: theme.colors.primary[500],
            paddingHorizontal: 10,
            paddingTop: 8,
            paddingBottom: 10,
          }}
        >
          {product.source_brand_name && (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: typography.fontFamily.sans.medium,
                fontSize: 9,
                color: 'rgba(255,255,255,0.75)',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 2,
              }}
            >
              {product.source_brand_name}
            </Text>
          )}
          {product.title && (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: typography.fontFamily.sans.medium,
                fontSize: 12,
                color: '#fff',
                lineHeight: 16,
                marginBottom: 4,
              }}
            >
              {product.title}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.bold,
                fontSize: 13,
                color: '#fff',
              }}
            >
              ₹{displayPrice.toLocaleString('en-IN')}
            </Text>
            {hasDiscount && (
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.regular,
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.55)',
                  textDecorationLine: 'line-through',
                }}
              >
                ₹{product.price.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
