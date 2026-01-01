# Affiliate Product System - Simplified

> Simple admin panel for manually adding products with affiliate deep links.

---

## What You're Building

- Admin panel with static credential auth (env-based)
- Modified products table with affiliate fields
- Direct product addition with deep links to external stores
- Same CLIP embeddings for recommendations

**No extra tables. No admin roles. No complexity.**

---

## Step 1: Alter Products Table

Run this SQL in Supabase SQL Editor:

```sql
-- =====================================================
-- STEP 1: Add affiliate columns to products table
-- =====================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_brand_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS affiliate_url TEXT,
ADD COLUMN IF NOT EXISTS images_are_external BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- =====================================================
-- STEP 2: Make brand_id optional (allow NULL)
-- =====================================================

ALTER TABLE products 
ALTER COLUMN brand_id DROP NOT NULL;

-- =====================================================
-- STEP 3: Add indexes for new columns
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_products_source_platform ON products(source_platform);
CREATE INDEX IF NOT EXISTS idx_products_source_brand ON products(source_brand_name);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_affiliate_url ON products(affiliate_url);
```

---

## Step 2: Updated Products Schema

After running the migration, your products table will look like this:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | UUID | Auto | Primary key |
| `brand_id` | UUID | **No** (now optional) | NULL for affiliate products |
| `title` | VARCHAR(255) | Yes | Product title |
| `description` | TEXT | Yes | Product description |
| `price` | DECIMAL(10,2) | Yes | Product price |
| `sale_price` | DECIMAL(10,2) | No | Sale price |
| `category` | VARCHAR(100) | Yes | Category |
| `subcategory` | VARCHAR(100) | No | Subcategory |
| `attributes` | JSONB | Yes | Colors, pattern, materials, sizes |
| `image_urls` | TEXT[] | Yes | Image URLs (external or uploaded) |
| `embedding` | VECTOR(512) | No | CLIP embedding (generated async) |
| `stock_quantity` | INTEGER | No | Not needed for affiliate |
| `is_active` | BOOLEAN | Yes | Default true |
| **`source_platform`** | VARCHAR(50) | Yes | 'myntra', 'ajio', 'amazon', etc. |
| **`source_brand_name`** | VARCHAR(255) | Yes | Brand name as text |
| **`affiliate_url`** | TEXT | Yes | Deep link to product |
| **`images_are_external`** | BOOLEAN | Yes | TRUE if using external image URLs |
| **`is_featured`** | BOOLEAN | No | For homepage placement |
| **`click_count`** | INTEGER | No | Track clicks |
| `created_at` | TIMESTAMP | Auto | Creation time |
| **`updated_at`** | TIMESTAMP | Auto | Last update time |

---

## Step 3: Add Environment Variables

Add to your `.env` file:

```env
# Admin Panel Auth (static credentials)
ADMIN_USERNAME=wardro8e_admin
ADMIN_PASSWORD=your_secure_password_here

# Python embedding service (if you have it running)
PYTHON_SERVICE_URL=http://localhost:8000
```

---

## Step 4: Admin Auth Wall (React Native)

Simple login screen that checks against env credentials:

```typescript
// app/(admin)/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    
    try {
      // Call your API to verify credentials
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Store admin session
        await AsyncStorage.setItem('admin_token', data.token);
        router.replace('/(admin)/dashboard');
      } else {
        Alert.alert('Error', 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background p-6 justify-center">
      <Text className="text-2xl font-bold text-white mb-8 text-center">
        Admin Panel
      </Text>
      
      <TextInput
        className="bg-muted text-white p-4 rounded-lg mb-4"
        placeholder="Username"
        placeholderTextColor="#666"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        className="bg-muted text-white p-4 rounded-lg mb-6"
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        className="bg-primary p-4 rounded-lg"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Step 5: Admin Auth API (Next.js)

```typescript
// app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Simple credential check
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Generate a simple token
      const token = sign(
        { role: 'admin', username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Admin Products API

```typescript
// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify admin token
function verifyAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  
  try {
    const token = authHeader.slice(7);
    const decoded = verify(token, JWT_SECRET) as { role: string };
    return decoded.role === 'admin';
  } catch {
    return false;
  }
}

// GET - List products
export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data, total: count, page, limit });
}

// POST - Create product
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate required fields
    const required = ['title', 'description', 'price', 'category', 'source_platform', 'source_brand_name', 'affiliate_url', 'image_urls'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ message: `${field} is required` }, { status: 400 });
      }
    }

    // Validate attributes
    const attributes = body.attributes || {};
    if (!attributes.colors?.length || !attributes.pattern || !attributes.materials?.length || !attributes.size_range?.length) {
      return NextResponse.json({ message: 'Colors, pattern, materials, and sizes are required in attributes' }, { status: 400 });
    }

    // Validate price
    if (typeof body.price !== 'number' || body.price <= 0) {
      return NextResponse.json({ message: 'Valid price is required' }, { status: 400 });
    }

    // Validate image_urls
    if (!Array.isArray(body.image_urls) || body.image_urls.length === 0) {
      return NextResponse.json({ message: 'At least one image URL is required' }, { status: 400 });
    }

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        brand_id: null, // No brand for affiliate products
        title: body.title.trim(),
        description: body.description.trim(),
        price: body.price,
        sale_price: body.sale_price || null,
        category: body.category,
        subcategory: body.subcategory || null,
        attributes: body.attributes,
        image_urls: body.image_urls,
        source_platform: body.source_platform,
        source_brand_name: body.source_brand_name.trim(),
        affiliate_url: body.affiliate_url.trim(),
        images_are_external: body.images_are_external ?? true,
        is_featured: body.is_featured ?? false,
        is_active: body.is_active ?? true,
        stock_quantity: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    // Generate embedding async (don't wait)
    if (process.env.PYTHON_SERVICE_URL && product.image_urls?.length > 0) {
      generateEmbedding(product.id, product.image_urls[0]).catch(console.error);
    }

    return NextResponse.json({ message: 'Product created', product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// Async embedding generation
async function generateEmbedding(productId: string, imageUrl: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${process.env.PYTHON_SERVICE_URL}/generate-embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const { embedding } = await res.json();
      await supabase
        .from('products')
        .update({ embedding })
        .eq('id', productId);
      console.log(`Embedding generated for product ${productId}`);
    }
  } catch (error) {
    console.error(`Embedding generation failed for ${productId}:`, error);
  }
}
```

---

## Step 7: Product Form Data Structure

```typescript
// types/product.ts
export interface AffiliateProductInput {
  // Source Info
  source_platform: 'myntra' | 'ajio' | 'amazon' | 'flipkart' | 'tatacliq' | 'indie' | 'other';
  source_brand_name: string;
  affiliate_url: string;

  // Product Info
  title: string;
  description: string;
  price: number;
  sale_price?: number;
  category: string;
  subcategory?: string;

  // Attributes
  attributes: {
    colors: string[];
    pattern: string;
    materials: string[];
    size_range: string[];
  };

  // Images
  image_urls: string[]; // External URLs from source platform
  images_are_external: boolean;

  // Status
  is_featured?: boolean;
  is_active?: boolean;
}

export const SOURCE_PLATFORMS = [
  { id: 'myntra', name: 'Myntra' },
  { id: 'ajio', name: 'AJIO' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'flipkart', name: 'Flipkart' },
  { id: 'tatacliq', name: 'Tata CLiQ' },
  { id: 'indie', name: 'Indie Brand' },
  { id: 'other', name: 'Other' },
];

export const CATEGORIES = [
  { id: 'tops', name: 'Tops', subcategories: ['shirts', 't-shirts', 'crop-tops', 'tank-tops', 'sweaters'] },
  { id: 'dresses', name: 'Dresses', subcategories: ['maxi', 'midi', 'mini', 'cocktail', 'casual'] },
  { id: 'bottoms', name: 'Bottoms', subcategories: ['jeans', 'trousers', 'skirts', 'shorts', 'leggings'] },
  { id: 'outerwear', name: 'Outerwear', subcategories: ['jackets', 'coats', 'blazers', 'cardigans'] },
  { id: 'ethnic', name: 'Ethnic', subcategories: ['sarees', 'kurtas', 'lehengas', 'salwar-suits'] },
];

export const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Gray', 'Navy', 'Beige', 'Maroon', 'Teal'];
export const PATTERNS = ['Solid', 'Stripes', 'Floral', 'Polka Dots', 'Geometric', 'Abstract', 'Animal Print', 'Paisley', 'Checkered', 'Plaid'];
export const MATERIALS = ['Cotton', 'Silk', 'Polyester', 'Linen', 'Wool', 'Denim', 'Chiffon', 'Satin', 'Velvet', 'Georgette'];
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
```

---

## Step 8: Admin Layout with Auth Check

```typescript
// app/(admin)/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (token) {
        // Optionally verify token with API
        setAuthenticated(true);
      } else {
        router.replace('/(admin)/login');
      }
    } catch {
      router.replace('/(admin)/login');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#208B84" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0F0F0F' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="add-product" options={{ title: 'Add Product' }} />
      <Stack.Screen name="products" options={{ title: 'All Products' }} />
    </Stack>
  );
}
```

---

## Step 9: Click Tracking (Optional but Recommended)

Track when users click affiliate links for analytics:

```typescript
// app/api/products/[id]/click/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Increment click count
    await supabase.rpc('increment_click_count', { product_id: params.id });

    // Get product affiliate URL
    const { data: product } = await supabase
      .from('products')
      .select('affiliate_url')
      .eq('id', params.id)
      .single();

    return NextResponse.json({ 
      success: true, 
      redirect_url: product?.affiliate_url 
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

SQL function for atomic increment:

```sql
-- Add this function to Supabase
CREATE OR REPLACE FUNCTION increment_click_count(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products 
  SET click_count = click_count + 1, updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Summary Checklist

### Database
- [ ] Run SQL migration (Step 1)
- [ ] Add `increment_click_count` function (Step 9)

### Environment
- [ ] Add `ADMIN_USERNAME` to `.env`
- [ ] Add `ADMIN_PASSWORD` to `.env`
- [ ] Add `JWT_SECRET` to `.env`

### API Routes
- [ ] Create `/api/admin/auth` (Step 5)
- [ ] Create `/api/admin/products` (Step 6)
- [ ] Create `/api/products/[id]/click` (Step 9)

### Mobile App
- [ ] Create admin login screen (Step 4)
- [ ] Create admin layout with auth check (Step 8)
- [ ] Create add product form
- [ ] Create products list screen

---

## Quick Reference: Adding a Product

When adding a product via the admin panel, you'll send:

```json
{
  "source_platform": "myntra",
  "source_brand_name": "H&M",
  "affiliate_url": "https://www.myntra.com/shirts/hm/...",
  "title": "H&M Regular Fit Oxford Shirt",
  "description": "A classic oxford shirt in regular fit...",
  "price": 1499,
  "sale_price": 1199,
  "category": "tops",
  "subcategory": "shirts",
  "attributes": {
    "colors": ["White", "Blue"],
    "pattern": "Solid",
    "materials": ["Cotton"],
    "size_range": ["S", "M", "L", "XL"]
  },
  "image_urls": [
    "https://assets.myntassets.com/h_720,q_90,w_540/v1/assets/images/...",
    "https://assets.myntassets.com/h_720,q_90,w_540/v1/assets/images/..."
  ],
  "images_are_external": true,
  "is_featured": false,
  "is_active": true
}
```

---

*Keep it simple. Ship fast. Iterate.*