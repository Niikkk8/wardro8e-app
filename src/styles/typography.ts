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
    // Headings (Serif - Playfair Display)
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
    
    // Body (Sans - Montserrat)
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
    
    // Logo (Serif - Playfair Display)
    logo: {
      fontFamily: 'PlayfairDisplay-Medium',
      fontSize: 24,
      lineHeight: 24 * 1.2,
      letterSpacing: -0.3,
    },
  },
};

