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

-- =====================================================
-- STEP 4: Add high-frequency filter columns
-- =====================================================
-- These are filtered in almost every query (discovery-first approach)

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS colors TEXT[],
ADD COLUMN IF NOT EXISTS size_range TEXT[],
ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);

-- =====================================================
-- STEP 5: Add medium-frequency columns (optional but helpful)
-- =====================================================
-- Frequently used for personalization and filtering

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS fit_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS style TEXT[],
ADD COLUMN IF NOT EXISTS occasion TEXT[],
ADD COLUMN IF NOT EXISTS season TEXT[];

-- =====================================================
-- STEP 6: Create indexes for optimal query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
CREATE INDEX IF NOT EXISTS idx_products_colors ON products USING GIN(colors);
CREATE INDEX IF NOT EXISTS idx_products_size_range ON products USING GIN(size_range);
CREATE INDEX IF NOT EXISTS idx_products_fit_type ON products(fit_type);
CREATE INDEX IF NOT EXISTS idx_products_style ON products USING GIN(style);
CREATE INDEX IF NOT EXISTS idx_products_occasion ON products USING GIN(occasion);
CREATE INDEX IF NOT EXISTS idx_products_season ON products USING GIN(season);
CREATE INDEX IF NOT EXISTS idx_products_sale_price ON products(sale_price) WHERE sale_price IS NOT NULL;

-- =====================================================
-- STEP 7: Add GIN indexes for JSONB category-specific fields
-- =====================================================
-- These fields remain in attributes JSONB:
-- pattern, materials, sleeve_type, neck_type, length, waist_type, closure_type, care_instructions

CREATE INDEX IF NOT EXISTS idx_products_attributes_pattern 
ON products USING GIN ((attributes->'pattern'));

CREATE INDEX IF NOT EXISTS idx_products_attributes_materials 
ON products USING GIN ((attributes->'materials'));

CREATE INDEX IF NOT EXISTS idx_products_attributes_sleeve_type 
ON products USING GIN ((attributes->'sleeve_type'));

CREATE INDEX IF NOT EXISTS idx_products_attributes_neck_type 
ON products USING GIN ((attributes->'neck_type'));

CREATE INDEX IF NOT EXISTS idx_products_attributes_length 
ON products USING GIN ((attributes->'length'));

CREATE INDEX IF NOT EXISTS idx_products_attributes_waist_type 
ON products USING GIN ((attributes->'waist_type'));

CREATE INDEX IF NOT EXISTS idx_products_attributes_closure_type 
ON products USING GIN ((attributes->'closure_type'));

CREATE INDEX IF NOT EXISTS idx_products_attributes_care_instructions 
ON products USING GIN ((attributes->'care_instructions'));
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
| **`sale_price`** | NUMERIC(10,2) | No | Discounted price (for showing discounts) |
| `category` | VARCHAR(100) | Yes | Category |
| `subcategory` | VARCHAR(100) | No | Subcategory |
| **`gender`** | VARCHAR(20) | **Yes** | 'men', 'women', 'unisex', 'kids' (high-frequency filter) |
| **`colors`** | TEXT[] | **Yes** | Array: ["Black", "White"] (high-frequency filter) |
| **`size_range`** | TEXT[] | **Yes** | Array: ["S", "M", "L"] (high-frequency filter) |
| **`fit_type`** | VARCHAR(50) | No | Regular Fit, Slim Fit, etc. (medium-frequency filter) |
| **`style`** | TEXT[] | No | Array: Casual, Formal, Sporty, etc. (medium-frequency filter) |
| **`occasion`** | TEXT[] | No | Array: Casual, Formal, Party, etc. (medium-frequency filter) |
| **`season`** | TEXT[] | No | Array: All Season, Summer, Winter, etc. (medium-frequency filter) |
| `attributes` | JSONB | Yes | Pattern, materials, sleeve_type, neck_type, length, waist_type, closure_type, care_instructions |
| `image_urls` | TEXT[] | Yes | Image URLs (from Supabase Storage) |
| `embedding` | VECTOR(512) | No | CLIP embedding (generated async) |
| `stock_quantity` | INTEGER | No | Not needed for affiliate |
| `is_active` | BOOLEAN | Yes | Default true |
| **`source_platform`** | VARCHAR(50) | Yes | 'myntra', 'ajio', 'amazon', etc. |
| **`source_brand_name`** | VARCHAR(255) | Yes | Brand name as text |
| **`affiliate_url`** | TEXT | Yes | Deep link to product |
| **`images_are_external`** | BOOLEAN | Yes | FALSE (images stored in Supabase Storage) |
| **`is_featured`** | BOOLEAN | No | For homepage placement |
| **`click_count`** | INTEGER | No | Track clicks |
| `created_at` | TIMESTAMP | Auto | Creation time |
| **`updated_at`** | TIMESTAMP | Auto | Last update time |

**Why This Schema?**
- **High-frequency filters** (`gender`, `colors`, `size_range`) are columns for optimal query performance (10-50x faster than JSONB)
- **Medium-frequency filters** (`fit_type`, `style`, `occasion`, `season`) are columns for personalization
- **Category-specific fields** remain in JSONB for flexibility

**Attributes JSONB Structure (Slimmer):**
```json
{
  "pattern": "Solid",
  "materials": ["Cotton", "Polyester"],
  "sleeve_type": "Full Sleeve",        // For tops/dresses
  "neck_type": "Round Neck",            // For tops/dresses
  "length": "Regular",                  // For various categories
  "waist_type": "High Waist",          // For bottoms
  "closure_type": "Button",             // For various categories
  "care_instructions": ["Machine Wash", "Do Not Bleach"]
}
```

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

## Step 4: Admin Auth Implementation

The admin panel uses static credential authentication via environment variables. The login page and auth middleware are already implemented in the codebase:

- **Login Page**: `app/admin/login/page.tsx`
- **Auth Middleware**: `lib/auth.ts` (uses cookies for session management)
- **Protected Routes**: `app/admin/(protected)/layout.tsx`

---

## Step 5: Admin Auth API

The admin authentication API is implemented in `app/api/admin/auth/route.ts`. It uses static credentials from environment variables and manages sessions via HTTP-only cookies for security.

---

## Step 6: Admin Products API

The products API is implemented in `app/api/admin/products/route.ts`. It includes:

- **GET**: List products with pagination
- **POST**: Create new products with validation for:
  - Required fields (title, description, price, category, gender, colors, size_range, etc.)
  - High-frequency filter fields (gender, colors, size_range as top-level columns)
  - Attributes (pattern, materials in JSONB)
  - Image uploads to Supabase Storage
  - Async CLIP embedding generation

The API uses session-based authentication via `verifyAdminSession` helper from `lib/auth.ts`.

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

  // High-frequency filter fields (as columns - filtered in almost every query)
  gender: 'men' | 'women' | 'unisex' | 'kids';
  colors: string[];
  size_range: string[];

  // Medium-frequency filter fields (as columns - for personalization)
  fit_type?: string;
  style?: string[];
  occasion?: string[];
  season?: string[];

  // Attributes (JSONB - category-specific and less frequently filtered)
  attributes: {
    pattern: string;
    materials: string[];
    // Category-specific fields (in JSONB)
    sleeve_type?: string;        // For tops/dresses
    neck_type?: string;           // For tops/dresses
    length?: string;              // For various categories
    waist_type?: string;          // For bottoms
    closure_type?: string;        // For various categories
    care_instructions?: string[]; // Array of care instructions
  };

  // Images
  image_urls: string[]; // URLs from Supabase Storage
  images_are_external: boolean; // FALSE (stored in Supabase)

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

The admin layout is implemented using Next.js route groups:

- **Protected Routes**: `app/admin/(protected)/layout.tsx` - Handles authentication checks
- **Login Page**: `app/admin/login/page.tsx` - Public login page
- **Admin Dashboard**: `app/admin/(protected)/page.tsx` - Main dashboard
- **Products Management**: `app/admin/(protected)/products/` - Product listing and creation

The layout uses server-side session verification and redirects unauthenticated users to the login page.

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
- [x] Create `/api/admin/auth` (Step 5) - ✅ Implemented
- [x] Create `/api/admin/products` (Step 6) - ✅ Implemented
- [x] Create `/api/admin/upload` - ✅ Implemented (for image uploads)
- [ ] Create `/api/products/[id]/click` (Step 9) - Optional

### Admin Panel (Next.js)
- [x] Create admin login screen (Step 4) - ✅ Implemented
- [x] Create admin layout with auth check (Step 8) - ✅ Implemented
- [x] Create add product form - ✅ Implemented (`app/admin/(protected)/products/add/page.tsx`)
- [x] Create products list screen - ✅ Implemented (`app/admin/(protected)/products/page.tsx`)

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
  "gender": "men",
  "colors": ["White", "Blue"],
  "size_range": ["S", "M", "L", "XL"],
  "fit_type": "Regular Fit",
  "style": ["Casual", "Classic"],
  "occasion": ["Casual", "Office"],
  "season": ["All Season"],
  "attributes": {
    "pattern": "Solid",
    "materials": ["Cotton"],
    "sleeve_type": "Full Sleeve",
    "neck_type": "Collar",
    "length": "Regular",
    "closure_type": "Button",
    "care_instructions": ["Machine Wash", "Do Not Bleach"]
  },
  "image_urls": [
    "https://your-supabase-url.supabase.co/storage/v1/object/public/products/1234567890-abc123.jpg"
  ],
  "images_are_external": false,
  "is_featured": false,
  "is_active": true
}
```

---

*Keep it simple. Ship fast. Iterate.*