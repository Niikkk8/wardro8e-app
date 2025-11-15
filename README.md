# wardro8e - Fashion Discovery Marketplace

> A Pinterest-style fashion e-commerce platform that connects emerging brands with fashion-conscious consumers through AI-powered personalized discovery.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Database Architecture](#database-architecture)
4. [Brand Verification System](#brand-verification-system)
5. [Frontend Implementation](#frontend-implementation)
6. [Backend Implementation](#backend-implementation)
7. [AI Recommendation System](#ai-recommendation-system)
8. [Business Strategy](#business-strategy)
9. [Content & Marketing Plan](#content--marketing-plan)
10. [Development Roadmap](#development-roadmap)
11. [Getting Started](#getting-started)

---

## Project Overview

### Vision
wardro8e reimagines fashion discovery by combining Pinterest's visual discovery model with AI-powered personalization, creating a curated marketplace where emerging brands meet style-conscious consumers.

### Key Features
- 📌 **Pinterest-style masonry layout** for visual discovery
- 🤖 **AI-powered recommendations** using computer vision
- 👗 **Curated brand partnerships** with emerging designers
- 💫 **Personalized style profiles** for each user
- 📱 **Mobile-first responsive design**
- 🛒 **Seamless checkout** with multiple payment options

### Target Market
- **Primary**: Women aged 22-35 in Indian tier-1 cities
- **Secondary**: Fashion-forward Gen Z consumers (18-25)
- **Expansion**: Tier-2 cities and men's fashion

---

## Tech Stack

### Frontend
```javascript
// Core Framework
- Next.js 14+ (App Router)
- React 18
- TypeScript

// Styling
- Tailwind CSS
- Framer Motion (animations)
- shadcn/ui (component library)

// State Management
- Redux (simple state)
- React Query (server state)

// Image Handling
- Next/Image
- Cloudinary SDK
```

### Backend
```javascript
// Database & Auth
- Supabase (PostgreSQL + Auth)
- Redis (caching)

// Image Processing
- Cloudinary (CDN + optimization)
- Sharp (server-side processing)

// AI/ML
- Python FastAPI (recommendation service)
- CLIP model (image embeddings)
- PostgreSQL pgvector (similarity search)
```

### Infrastructure
```javascript
// Hosting
- Vercel (frontend)
- Railway/Render (Python services)
- Supabase Cloud (database)

// Monitoring
- Vercel Analytics
- Sentry (error tracking)
- PostHog (product analytics)
```

---

## Database Architecture

### Core Tables Schema

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user', -- 'user', 'brand', 'admin'
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Brands Table (Simple)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    brand_name VARCHAR(255) UNIQUE NOT NULL,
    brand_legal_name VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Brand Verifications Table (Single table for verification process)
CREATE TABLE brand_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,

    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'documents_uploaded', 'under_review', 'approved', 'rejected'
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,

    -- Business Details
    business_type VARCHAR(50), -- 'individual', 'company', 'partnership'
    gstin VARCHAR(15),
    pan_number VARCHAR(10),

    -- Contact Details
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(15) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,

    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,

    -- Bank Details
    bank_name VARCHAR(255),
    account_holder_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(11),

    -- Documents (stored as JSON array with file paths)
    documents JSONB DEFAULT '[]', -- [{type: 'gst', url: '...', uploaded_at: '...'}, ...]

    -- Verification Flags
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    documents_verified BOOLEAN DEFAULT FALSE,
    bank_verified BOOLEAN DEFAULT FALSE,

    -- Social/Online Presence
    website_url TEXT,
    instagram_handle VARCHAR(100),

    -- Internal Notes
    admin_notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(brand_id)
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    attributes JSONB, -- {color: 'blue', pattern: 'floral', material: 'cotton'}
    image_urls TEXT[],
    embedding VECTOR(512), -- CLIP embeddings for similarity search
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Style Preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    style_tags TEXT[], -- ['minimalist', 'bohemian', 'casual']
    favorite_colors TEXT[], -- ['blue', 'black', 'white']
    size_preferences JSONB, -- {tops: 'M', bottoms: 'L'}
    price_range JSONB, -- {min: 500, max: 5000}
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Interactions
CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20), -- 'view', 'like', 'save', 'purchase'
    interaction_value FLOAT, -- duration for views, quantity for purchases
    created_at TIMESTAMP DEFAULT NOW()
);

-- Collections (User-created boards)
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    cover_image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Collection Items
CREATE TABLE collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(collection_id, product_id)
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    shipping_address JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    brand_id UUID REFERENCES brands(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- User interactions for recommendation engine
CREATE INDEX idx_interactions_user_product ON user_interactions(user_id, product_id);
CREATE INDEX idx_interactions_type ON user_interactions(interaction_type);

-- Product search and filtering
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_price ON products(price);

-- Vector similarity search for recommendations
CREATE INDEX idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops);

-- Brand verification status
CREATE INDEX idx_verifications_status ON brand_verifications(status);
CREATE INDEX idx_brands_verified ON brands(verified);
```

---

## Brand Verification System

### Overview

A streamlined verification system to ensure only legitimate brands can sell on wardro8e. The process is simple yet effective, focusing on essential documentation and manual review.

### Verification Flow

```
1. Brand Registration → 2. Document Upload → 3. Admin Review → 4. Approved/Rejected
```

### Supabase Storage Setup

```sql
-- Create storage bucket for brand documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'brand-docs',
    'brand-docs',
    false, -- Private bucket
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
);

-- Storage policies
CREATE POLICY "Brands can upload own docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'brand-docs' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Brands can view own docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'brand-docs' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin access
CREATE POLICY "Admins can manage all docs"
ON storage.objects FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);
```

### Step 1: Brand Registration

```typescript
// app/brands/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BrandRegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: "",
    brandLegalName: "",
    businessType: "individual",
    gstin: "",
    panNumber: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    website: "",
    instagram: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    try {
      // Create brand record
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .insert({
          brand_name: formData.brandName,
          brand_legal_name: formData.brandLegalName,
          slug: formData.brandName.toLowerCase().replace(/\s+/g, "-"),
          email: formData.contactEmail,
        })
        .select()
        .single();

      if (brandError) throw brandError;

      // Create verification record
      const { error: verificationError } = await supabase
        .from("brand_verifications")
        .insert({
          brand_id: brand.id,
          business_type: formData.businessType,
          gstin: formData.gstin,
          pan_number: formData.panNumber,
          contact_name: formData.contactName,
          contact_phone: formData.contactPhone,
          contact_email: formData.contactEmail,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          website_url: formData.website,
          instagram_handle: formData.instagram,
          status: "pending",
        });

      if (verificationError) throw verificationError;

      // Redirect to document upload
      router.push(`/brands/verification/${brand.id}/documents`);
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Brand Registration</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Brand Information</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Brand Name *
            </label>
            <input
              type="text"
              required
              value={formData.brandName}
              onChange={(e) =>
                setFormData({ ...formData, brandName: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Your brand name as shown to customers"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Legal Business Name *
            </label>
            <input
              type="text"
              required
              value={formData.brandLegalName}
              onChange={(e) =>
                setFormData({ ...formData, brandLegalName: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Registered business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Business Type *
            </label>
            <select
              value={formData.businessType}
              onChange={(e) =>
                setFormData({ ...formData, businessType: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="individual">Individual/Sole Proprietor</option>
              <option value="company">Private Limited Company</option>
              <option value="partnership">Partnership/LLP</option>
            </select>
          </div>
        </div>

        {/* Tax Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Tax Information</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              GSTIN (if applicable)
            </label>
            <input
              type="text"
              value={formData.gstin}
              onChange={(e) =>
                setFormData({ ...formData, gstin: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="15 digit GST number"
              maxLength={15}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              PAN Number *
            </label>
            <input
              type="text"
              required
              value={formData.panNumber}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  panNumber: e.target.value.toUpperCase(),
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Contact Information</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Contact Person Name *
            </label>
            <input
              type="text"
              required
              value={formData.contactName}
              onChange={(e) =>
                setFormData({ ...formData, contactName: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.contactPhone}
              onChange={(e) =>
                setFormData({ ...formData, contactPhone: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="9876543210"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.contactEmail}
              onChange={(e) =>
                setFormData({ ...formData, contactEmail: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Business Address</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Address Line 1 *
            </label>
            <input
              type="text"
              required
              value={formData.addressLine1}
              onChange={(e) =>
                setFormData({ ...formData, addressLine1: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.addressLine2}
              onChange={(e) =>
                setFormData({ ...formData, addressLine2: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State *</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pincode *</label>
            <input
              type="text"
              required
              value={formData.pincode}
              onChange={(e) =>
                setFormData({ ...formData, pincode: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              maxLength={6}
            />
          </div>
        </div>

        {/* Online Presence */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Online Presence (Optional)</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="https://yourbrand.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Instagram Handle
            </label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) =>
                setFormData({ ...formData, instagram: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="@yourbrand"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Continue to Document Upload"}
        </button>
      </form>
    </div>
  );
}
```

### Step 2: Document Upload

```typescript
// app/brands/verification/[brandId]/documents/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const requiredDocuments = [
  { type: "pan_card", label: "PAN Card", required: true },
  { type: "gst_certificate", label: "GST Certificate", required: false },
  { type: "address_proof", label: "Address Proof", required: true },
  {
    type: "bank_statement",
    label: "Bank Statement (Last 3 months)",
    required: true,
  },
  { type: "brand_logo", label: "Brand Logo", required: true },
  {
    type: "product_catalog",
    label: "Product Catalog/Samples",
    required: false,
  },
];

export default function DocumentUploadPage({
  params,
}: {
  params: { brandId: string };
}) {
  const router = useRouter();
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (docType: string, file: File) => {
    setUploading(docType);
    const supabase = createClient();

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${params.brandId}/${docType}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("brand-docs")
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("brand-docs").getPublicUrl(fileName);

      // Update uploaded docs state
      setUploadedDocs((prev) => ({
        ...prev,
        [docType]: {
          type: docType,
          url: publicUrl,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      }));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload document");
    } finally {
      setUploading("");
    }
  };

  const handleSubmit = async () => {
    // Check if all required documents are uploaded
    const missingDocs = requiredDocuments
      .filter((doc) => doc.required && !uploadedDocs[doc.type])
      .map((doc) => doc.label);

    if (missingDocs.length > 0) {
      alert(`Please upload: ${missingDocs.join(", ")}`);
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      // Update verification record with documents
      const { error } = await supabase
        .from("brand_verifications")
        .update({
          documents: Object.values(uploadedDocs),
          status: "documents_uploaded",
          documents_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("brand_id", params.brandId);

      if (error) throw error;

      // Redirect to confirmation page
      router.push(`/brands/verification/${params.brandId}/confirmation`);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit documents");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
      <p className="text-gray-600 mb-8">
        Please upload the following documents for verification. Files should be
        in PDF, JPG, or PNG format and under 10MB.
      </p>

      <div className="space-y-4">
        {requiredDocuments.map((doc) => (
          <div key={doc.type} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  {doc.label}
                  {doc.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
                {uploadedDocs[doc.type] && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {uploadedDocs[doc.type].fileName}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="file"
                  id={doc.type}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(doc.type, file);
                  }}
                  disabled={uploading === doc.type}
                />
                <label
                  htmlFor={doc.type}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer inline-block"
                >
                  {uploading === doc.type
                    ? "Uploading..."
                    : uploadedDocs[doc.type]
                    ? "Replace"
                    : "Upload"}
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">📝 Next Steps</h3>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>
            After uploading documents, our team will review your application
          </li>
          <li>Verification typically takes 2-3 business days</li>
          <li>You'll receive an email once your brand is approved</li>
          <li>For manual signature on agreement, our team will contact you</li>
        </ol>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || Object.keys(uploadedDocs).length === 0}
        className="w-full mt-8 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit for Verification"}
      </button>
    </div>
  );
}
```

### Step 3: Admin Review Dashboard

```typescript
// app/admin/brands/pending/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminBrandReviewPage() {
  const [verifications, setVerifications] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brand_verifications")
      .select(
        `
        *,
        brands (
          id,
          brand_name,
          brand_legal_name,
          email
        )
      `
      )
      .in("status", ["documents_uploaded", "under_review"])
      .order("created_at", { ascending: true });

    if (data) setVerifications(data);
    setLoading(false);
  };

  const handleApprove = async (verificationId: string, brandId: string) => {
    const supabase = createClient();

    // Update verification status
    await supabase
      .from("brand_verifications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq("id", verificationId);

    // Update brand as verified
    await supabase
      .from("brands")
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        is_active: true,
      })
      .eq("id", brandId);

    // Send approval email (implement separately)
    await fetch("/api/emails/brand-approved", {
      method: "POST",
      body: JSON.stringify({ brandId }),
    });

    fetchPendingVerifications();
  };

  const handleReject = async (
    verificationId: string,
    brandId: string,
    reason: string
  ) => {
    const supabase = createClient();

    await supabase
      .from("brand_verifications")
      .update({
        status: "rejected",
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq("id", verificationId);

    // Send rejection email (implement separately)
    await fetch("/api/emails/brand-rejected", {
      method: "POST",
      body: JSON.stringify({ brandId, reason }),
    });

    fetchPendingVerifications();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Brand Verification Review</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* List of pending verifications */}
        <div className="col-span-1 space-y-2">
          <h2 className="font-semibold mb-4">
            Pending Reviews ({verifications.length})
          </h2>
          {verifications.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedBrand(v)}
              className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                selectedBrand?.id === v.id ? "border-pink-500 bg-pink-50" : ""
              }`}
            >
              <h3 className="font-medium">{v.brands.brand_name}</h3>
              <p className="text-sm text-gray-600">{v.contact_name}</p>
              <span
                className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                  v.status === "documents_uploaded"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {v.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>

        {/* Details panel */}
        <div className="col-span-2">
          {selectedBrand ? (
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">
                {selectedBrand.brands.brand_name}
              </h2>

              {/* Business Details */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Business Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Legal Name:</span>
                    <p className="font-medium">
                      {selectedBrand.brands.brand_legal_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <p className="font-medium">{selectedBrand.business_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">GSTIN:</span>
                    <p className="font-medium">
                      {selectedBrand.gstin || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">PAN:</span>
                    <p className="font-medium">{selectedBrand.pan_number}</p>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Contact Information</h3>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-gray-600">Name:</span>{" "}
                    {selectedBrand.contact_name}
                  </p>
                  <p>
                    <span className="text-gray-600">Phone:</span>{" "}
                    {selectedBrand.contact_phone}
                  </p>
                  <p>
                    <span className="text-gray-600">Email:</span>{" "}
                    {selectedBrand.contact_email}
                  </p>
                  <p>
                    <span className="text-gray-600">Address:</span>{" "}
                    {selectedBrand.address_line1}, {selectedBrand.city},{" "}
                    {selectedBrand.state} - {selectedBrand.pincode}
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Uploaded Documents</h3>
                <div className="space-y-2">
                  {selectedBrand.documents &&
                    selectedBrand.documents.map((doc: any) => (
                      <div
                        key={doc.type}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">
                          {doc.type.replace("_", " ")}
                        </span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline"
                        >
                          View Document
                        </a>
                      </div>
                    ))}
                </div>
              </div>

              {/* Admin Notes */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Admin Notes</h3>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  placeholder="Add internal notes..."
                  value={selectedBrand.admin_notes || ""}
                  onChange={(e) => {
                    // Update admin notes in real-time (implement as needed)
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    handleApprove(selectedBrand.id, selectedBrand.brand_id)
                  }
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Approve Brand
                </button>
                <button
                  onClick={() => {
                    const reason = prompt("Rejection reason:");
                    if (reason)
                      handleReject(
                        selectedBrand.id,
                        selectedBrand.brand_id,
                        reason
                      );
                  }}
                  className="flex-1 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-12 text-center text-gray-500">
              Select a brand to review
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Brand Dashboard - Track Verification Status

```typescript
// app/brands/dashboard/verification-status/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VerificationStatusPage() {
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("brand_verifications")
        .select(
          `
          *,
          brands (*)
        `
        )
        .eq("brands.user_id", user.id)
        .single();

      setVerification(data);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;
  if (!verification) return <div>No verification found</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Please complete your document upload to proceed with verification.";
      case "documents_uploaded":
        return "Your documents have been received and are waiting for review.";
      case "under_review":
        return "Our team is currently reviewing your application. This usually takes 2-3 business days.";
      case "approved":
        return "🎉 Congratulations! Your brand has been verified and you can now start selling on wardro8e.";
      case "rejected":
        return `Unfortunately, your application was not approved. Reason: ${verification.rejection_reason}`;
      default:
        return "Unknown status";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Verification Status</h1>

      {/* Status Banner */}
      <div
        className={`p-6 rounded-lg mb-8 ${getStatusColor(verification.status)
          .replace("text-", "bg-")
          .replace("800", "50")}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                verification.status
              )}`}
            >
              {verification.status.replace("_", " ").toUpperCase()}
            </span>
            <p className="mt-3 text-gray-700">
              {getStatusMessage(verification.status)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Verification Progress</h2>
        <div className="flex items-center justify-between">
          {["Registration", "Documents", "Review", "Approved"].map(
            (step, index) => {
              const isComplete =
                (index === 0 && verification.status !== "pending") ||
                (index === 1 &&
                  ["documents_uploaded", "under_review", "approved"].includes(
                    verification.status
                  )) ||
                (index === 2 &&
                  ["under_review", "approved"].includes(verification.status)) ||
                (index === 3 && verification.status === "approved");

              return (
                <div key={step} className="flex-1 text-center">
                  <div
                    className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isComplete ? "✓" : index + 1}
                  </div>
                  <p className="mt-2 text-sm">{step}</p>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Submitted Information */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Submitted Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Business Type:</span>
            <p className="font-medium">{verification.business_type}</p>
          </div>
          <div>
            <span className="text-gray-600">Contact Person:</span>
            <p className="font-medium">{verification.contact_name}</p>
          </div>
          <div>
            <span className="text-gray-600">Phone:</span>
            <p className="font-medium">{verification.contact_phone}</p>
          </div>
          <div>
            <span className="text-gray-600">Email:</span>
            <p className="font-medium">{verification.contact_email}</p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Address:</span>
            <p className="font-medium">
              {verification.address_line1}, {verification.city},{" "}
              {verification.state} - {verification.pincode}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {verification.status === "pending" && (
        <button className="mt-6 w-full py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600">
          Complete Document Upload
        </button>
      )}

      {verification.status === "rejected" && (
        <button className="mt-6 w-full py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600">
          Reapply for Verification
        </button>
      )}

      {verification.status === "approved" && (
        <button className="mt-6 w-full py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600">
          Go to Brand Dashboard
        </button>
      )}
    </div>
  );
}
```

---

## Frontend Implementation

### Project Structure

```
wardro8e/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth pages
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/              # Main app layout
│   │   ├── page.tsx         # Home feed
│   │   ├── explore/         # Explore page
│   │   ├── product/[id]/    # Product detail
│   │   ├── brand/[slug]/    # Brand page
│   │   ├── collections/     # User collections
│   │   └── profile/         # User profile
│   ├── brands/              # Brand portal
│   │   ├── register/        # Brand registration
│   │   ├── verification/    # Verification flow
│   │   └── dashboard/       # Brand dashboard
│   ├── admin/               # Admin panel
│   │   └── brands/          # Brand management
│   ├── api/                 # API routes
│   │   ├── recommendations/
│   │   └── products/
│   └── layout.tsx           # Root layout
│
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── MasonryGrid.tsx
│   │   └── MobileNav.tsx
│   ├── product/
│   │   ├── ProductCard.tsx
│   │   ├── QuickView.tsx
│   │   └── SimilarItems.tsx
│   └── shared/
│       ├── ImageUpload.tsx
│       └── InfiniteScroll.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── utils/
│   └── hooks/
│
├── styles/
│   └── globals.css
│
└── types/
    └── index.ts
```

### Key Components Implementation

#### 1. Pinterest-Style Masonry Grid

```tsx
// components/layout/MasonryGrid.tsx
import { useState, useEffect } from "react";
import Masonry from "react-masonry-css";
import { ProductCard } from "@/components/product/ProductCard";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

const breakpointColumns = {
  default: 5,
  1536: 4,
  1280: 3,
  768: 2,
  640: 1,
};

export function MasonryGrid({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts);
  const { loading, hasMore } = useInfiniteScroll(loadMoreProducts, products);

  async function loadMoreProducts() {
    // Fetch more products from API
    const newProducts = await fetch("/api/products/feed");
    setProducts([...products, ...newProducts]);
  }

  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className="flex -ml-4 w-auto"
      columnClassName="pl-4 bg-clip-padding"
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} className="mb-4" />
      ))}
    </Masonry>
  );
}
```

#### 2. Product Card with Hover Effects

```tsx
// components/product/ProductCard.tsx
import Image from "next/image";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = async () => {
    setIsLiked(!isLiked);
    // Track interaction in database
    await fetch("/api/interactions", {
      method: "POST",
      body: JSON.stringify({
        productId: product.id,
        type: "like",
      }),
    });
  };

  return (
    <motion.div
      className="relative group cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={product.image_urls[0]}
          alt={product.title}
          width={300}
          height={400}
          className="w-full h-auto object-cover"
          loading="lazy"
        />

        {/* Overlay on hover */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/20 flex items-end"
          >
            <div className="w-full p-4 bg-gradient-to-t from-black/70 to-transparent">
              <h3 className="text-white font-medium text-sm">
                {product.title}
              </h3>
              <p className="text-white/80 text-sm">₹{product.price}</p>
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <button
            onClick={handleLike}
            className="p-2 bg-white rounded-full shadow-md hover:scale-110 transition"
          >
            <Heart
              size={18}
              className={isLiked ? "fill-red-500 text-red-500" : ""}
            />
          </button>
          <button className="p-2 bg-white rounded-full shadow-md hover:scale-110 transition">
            <ShoppingBag size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

#### 3. Style Preference Onboarding

```tsx
// app/(auth)/onboarding/page.tsx
import { useState } from "react";
import { motion } from "framer-motion";

const styleOptions = [
  { id: "minimalist", label: "Minimalist", image: "/styles/minimalist.jpg" },
  { id: "bohemian", label: "Bohemian", image: "/styles/bohemian.jpg" },
  { id: "streetwear", label: "Streetwear", image: "/styles/streetwear.jpg" },
  { id: "classic", label: "Classic", image: "/styles/classic.jpg" },
  { id: "romantic", label: "Romantic", image: "/styles/romantic.jpg" },
  { id: "edgy", label: "Edgy", image: "/styles/edgy.jpg" },
];

export default function OnboardingPage() {
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [step, setStep] = useState(1);

  const toggleStyle = (styleId) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId)
        ? prev.filter((id) => id !== styleId)
        : [...prev, styleId]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-center mb-2">
            Welcome to wardro8e
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Let's personalize your fashion discovery experience
          </p>

          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Select your style preferences (choose at least 3)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {styleOptions.map((style) => (
                  <motion.button
                    key={style.id}
                    onClick={() => toggleStyle(style.id)}
                    className={`relative overflow-hidden rounded-lg border-2 transition ${
                      selectedStyles.includes(style.id)
                        ? "border-pink-500"
                        : "border-gray-200"
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={style.image}
                      alt={style.label}
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-3 bg-white">
                      <p className="font-medium">{style.label}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border border-gray-300 rounded-lg"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (step < 3 ? setStep(step + 1) : handleComplete())}
              disabled={step === 1 && selectedStyles.length < 3}
              className="px-6 py-2 bg-pink-500 text-white rounded-lg disabled:opacity-50 ml-auto"
            >
              {step === 3 ? "Complete" : "Next"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
```

---

## Backend Implementation

### Supabase Setup

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
```

### API Routes

```typescript
// app/api/products/feed/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createClient();

  // Get user preferences
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Personalized feed
    const { data: products } = await supabase.rpc("get_personalized_feed", {
      user_id: user.id,
      limit_count: limit,
      offset_count: offset,
    });

    return NextResponse.json({ products });
  } else {
    // Trending products for anonymous users
    const { data: products } = await supabase
      .from("products")
      .select(
        `
        *,
        brands (
          brand_name,
          slug
        )
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({ products });
  }
}

// app/api/recommendations/route.ts
export async function POST(request: Request) {
  const { productId } = await request.json();

  // Call Python recommendation service
  const response = await fetch(`${process.env.PYTHON_SERVICE_URL}/similar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
  });

  const recommendations = await response.json();
  return NextResponse.json(recommendations);
}
```

---

## AI Recommendation System

### Understanding the System (Beginner-Friendly)

#### What is a Recommendation System?

Think of it like a smart friend who knows your style. When you like a floral dress, it suggests similar floral patterns, same color palettes, or items from brands you've shown interest in.

#### How Does It Work?

1. **Image Understanding (CLIP Model)**

   - Takes a clothing image
   - Converts it to numbers (embeddings) that represent its features
   - Like creating a "fingerprint" for each clothing item

2. **Finding Similar Items**

   - Compares fingerprints to find similar clothes
   - Uses "cosine similarity" (how close two fingerprints are)

3. **Learning Your Preferences**
   - Tracks what you click, like, and buy
   - Adjusts recommendations based on your behavior

### Simple Implementation (Start Here!)

```python
# recommendation_service.py
from fastapi import FastAPI, HTTPException
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List
import asyncpg
import redis
import json

app = FastAPI()

# Initialize model (runs once when server starts)
model = SentenceTransformer('clip-ViT-B-32')

# Redis for caching
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Database connection
DATABASE_URL = "postgresql://user:password@localhost/wardro8e"

@app.on_event("startup")
async def startup():
    app.state.db = await asyncpg.create_pool(DATABASE_URL)

@app.post("/generate-embedding")
async def generate_embedding(image_url: str):
    """Generate embedding for a product image"""
    try:
        # Generate embedding
        embedding = model.encode([image_url])

        # Convert to list for JSON serialization
        embedding_list = embedding[0].tolist()

        return {"embedding": embedding_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/similar-products")
async def find_similar_products(product_id: str, limit: int = 10):
    """Find similar products based on visual similarity"""

    # Check cache first
    cache_key = f"similar:{product_id}:{limit}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Get product embedding from database
    async with app.state.db.acquire() as conn:
        product = await conn.fetchrow(
            "SELECT embedding FROM products WHERE id = $1",
            product_id
        )

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Find similar products using pgvector
        similar = await conn.fetch("""
            SELECT
                id,
                title,
                price,
                image_urls,
                1 - (embedding <=> $1) as similarity
            FROM products
            WHERE id != $2
            ORDER BY embedding <=> $1
            LIMIT $3
        """, product['embedding'], product_id, limit)

        result = [dict(row) for row in similar]

        # Cache for 1 hour
        redis_client.setex(cache_key, 3600, json.dumps(result, default=str))

        return result

@app.post("/personalized-recommendations")
async def get_personalized_recommendations(user_id: str, limit: int = 20):
    """Get personalized recommendations for a user"""

    async with app.state.db.acquire() as conn:
        # Get user's interaction history
        interactions = await conn.fetch("""
            SELECT
                product_id,
                interaction_type,
                COUNT(*) as count
            FROM user_interactions
            WHERE user_id = $1
            GROUP BY product_id, interaction_type
            ORDER BY created_at DESC
            LIMIT 50
        """, user_id)

        # Weight different interaction types
        weights = {
            'purchase': 1.0,
            'save': 0.7,
            'like': 0.5,
            'view': 0.2
        }

        # Calculate product scores
        product_scores = {}
        for interaction in interactions:
            score = weights.get(interaction['interaction_type'], 0)
            product_scores[interaction['product_id']] = score * interaction['count']

        # Get embeddings for top interacted products
        top_products = sorted(product_scores.items(), key=lambda x: x[1], reverse=True)[:5]

        recommendations = []
        for product_id, _ in top_products:
            similar = await find_similar_products(product_id, limit=5)
            recommendations.extend(similar)

        # Remove duplicates and sort by similarity
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec['id'] not in seen:
                seen.add(rec['id'])
                unique_recommendations.append(rec)

        return unique_recommendations[:limit]
```

### Deployment Instructions

```yaml
# docker-compose.yml for local development
version: "3.8"

services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_DB: wardro8e
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  recommendation_service:
    build: ./recommendation_service
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://admin:password@postgres/wardro8e
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## Business Strategy

### Market Positioning

#### Unique Value Proposition

"Discover Your Style, Not Just Clothes" - wardro8e is the fashion discovery platform that understands your unique style and connects you with emerging designers you'll love.

#### Competitive Advantages

1. **AI-Powered Discovery** vs traditional category browsing
2. **Emerging Brand Focus** vs mass market products
3. **Visual-First Interface** vs text-heavy listings
4. **Personalization from Day 1** vs generic recommendations

### Revenue Model

#### Primary Revenue Streams

1. **Commission on Sales** (15-18% initially)

   - Tiered structure based on volume
   - Lower rates for exclusive partnerships

2. **Premium Brand Placements** (₹50,000-₹2,00,000/month)

   - Featured collections
   - Homepage placement
   - Boosted visibility in feeds

3. **Subscription Model** (Future - Month 7+)
   - wardro8e Plus: ₹299/month
   - Benefits: Early access, exclusive sales, free shipping

#### Unit Economics (Per Transaction)

```
Average Order Value (AOV): ₹2,500
Commission Rate: 16%
Revenue per Order: ₹400
Payment Processing: -₹50
Customer Acquisition: -₹150
Gross Profit: ₹200 (8% margin)
```

### Brand Partnership Strategy

#### Outreach Email Template

```
Subject: Exclusive Partnership Opportunity - Reach 50,000+ Fashion-Forward Shoppers

Hi [Brand Name] Team,

I noticed your beautiful [specific product/collection] and believe it perfectly aligns with our wardro8e community's aesthetic.

wardro8e is a Pinterest-style fashion discovery platform that's revolutionizing how Indian consumers find their next favorite brands. Here's what makes us different:

✨ AI-powered matching ensures your products reach the RIGHT customers
📈 40% lower customer acquisition cost than Instagram ads
🎯 Detailed analytics on customer preferences and behavior
💫 Professional brand storytelling that showcases your uniqueness

Our early brand partners are seeing:
- 3x higher conversion rates than traditional marketplaces
- 60% repeat purchase rate within 3 months
- Average order values 25% higher than other channels

We're selectively partnering with 50 emerging brands for our launch. As an early partner, you'll receive:
- 3 months of ZERO commission fees
- Featured brand status on our homepage
- Dedicated account manager support
- Professional product photography (first 10 products free)

I'd love to show you how wardro8e can become your most profitable sales channel. Are you available for a quick 15-minute call this week?

Best regards,
[Your Name]
Founder, wardro8e

P.S. Check out our brand deck at wardro8e.com/partners
```

### Customer Acquisition Strategy

#### Phase 1: Pre-Launch (Month 1)

1. **Instagram Presence**

   - Daily style inspiration posts
   - Behind-the-scenes content
   - Fashion tips and trends
   - Target: 10,000 followers

2. **Influencer Partnerships**
   - 20 micro-influencers (10K-50K followers)
   - Focus on fashion/lifestyle niche
   - Barter collaborations initially

#### Phase 2: Soft Launch (Months 2-3)

1. **Beta User Program**

   - 500 invited users
   - Exclusive early access
   - Feedback incentives

2. **Referral Program**
   - ₹200 credit for referrer and referee
   - Tiered rewards for multiple referrals

#### Phase 3: Public Launch (Month 4+)

1. **Performance Marketing**
   - Google Ads: ₹50,000/month budget
   - Meta Ads: ₹75,000/month budget
   - Target CAC: ₹150

---

## Content & Marketing Plan

### Content Calendar Structure

#### Monthly Themes

- **January**: New Year, New Wardrobe
- **February**: Valentine's & Date Night Styles
- **March**: Spring Refresh
- **April**: Sustainable Fashion Month
- **May**: Summer Essentials
- **June**: Monsoon Ready
- **July**: Mid-Year Sale Season
- **August**: Independence Day Collections
- **September**: Festive Preview
- **October**: Diwali Fashion
- **November**: Wedding Season
- **December**: Year-End Party Looks

### SEO Strategy

#### Target Keywords

**Primary:**

- "pinterest style fashion india"
- "discover fashion brands india"
- "personalized fashion shopping"
- "emerging indian designers"

**Long-tail:**

- "sustainable fashion brands india online"
- "boutique clothing online india"
- "ai fashion recommendations india"
- "curated fashion marketplace"

---

## Content Creation Playbook

### 📱 Instagram Reels Ideas (30-60 seconds)

#### Behind-the-Scenes Content

1. **"Day in the Life of a Fashion Tech Founder"**

   - Morning routine → Code review → Brand meetings → Late night shipping
   - Hook: "POV: You're building the Pinterest of Indian fashion"

2. **"Building wardro8e in Public"**

   - Weekly progress updates showing actual metrics
   - Dashboard screenshots, user growth, new features
   - Hook: "Week 12 of building my startup in public"

3. **"From Code to Closet"**
   - Split screen: Writing code vs. User browsing the actual feature
   - Show the journey from IDE to live feature
   - Hook: "Watch this code become a shopping experience"

#### Educational/Value Content

4. **"AI Explains Your Style"**

   - Show how the AI analyzes a product
   - Visual representation of style matching
   - Hook: "How AI understands your fashion taste in 3 seconds"

5. **"₹500 vs ₹5000 Outfit Challenge"**
   - Using wardro8e to create looks at different price points
   - Hook: "Can AI help you look expensive on a budget?"

### 📸 Instagram Post Ideas

#### Founder's Journey Posts

1. **"The Rejection Collection"**

   - Carousel of rejection emails from investors/brands
   - Last slide: Current success metrics
   - Caption: Story of persistence

2. **"Midnight Oil Moments"**
   - Late night coding setup aesthetic shot
   - Caption: "3 AM. 47 bugs fixed. 2 features shipped. Building dreams requires losing sleep sometimes."

### 📝 Blog Content Ideas

#### Founder's Perspective Series

1. **"Why I Left My Corporate Job to Build Fashion Tech"**

   - Personal story
   - Challenges faced
   - Vision for Indian fashion industry

2. **"Building in Public: Our First 100 Days"**
   - Daily challenges and wins
   - Metrics transparency
   - Key decisions and pivots

### Progress Update Templates

#### Weekly LinkedIn Updates

```
Week [X] of Building wardro8e 🚀

Numbers:
📈 Users: [X] → [Y] (+Z%)
🛍️ GMV: ₹[X]
👗 Products: [X]
🏪 Brands: [X]

Wins:
✅ [Major feature shipped]
✅ [Partnership closed]

This week's focus: [Upcoming priority]

#BuildingInPublic #StartupLife #FashionTech
```

---

## Development Roadmap

### Month 1: Foundation

**Week 1-2: Setup & Architecture**

- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Supabase project and database
- [ ] Configure authentication flow
- [ ] Design database schema
- [ ] Set up development environment

**Week 3-4: Core Features**

- [ ] Build masonry grid layout
- [ ] Implement product card components
- [ ] Create basic navigation
- [ ] Set up image optimization with Cloudinary
- [ ] Build product detail pages

### Month 2: User Experience

**Week 5-6: User Features**

- [ ] Implement user registration/login
- [ ] Build onboarding flow
- [ ] Create user profile pages
- [ ] Add like/save functionality
- [ ] Build collections feature

**Week 7-8: Discovery Features**

- [ ] Implement search functionality
- [ ] Add category filters
- [ ] Build sorting options
- [ ] Create trending section
- [ ] Add infinite scroll

### Month 3: AI & Personalization

**Week 9-10: Recommendation System**

- [ ] Set up Python FastAPI service
- [ ] Implement CLIP model integration
- [ ] Build similarity search
- [ ] Create recommendation API
- [ ] Add "Similar Items" feature

**Week 11-12: Brand Tools**

- [ ] Build brand registration flow
- [ ] Create document upload interface
- [ ] Implement verification system
- [ ] Add admin review dashboard
- [ ] Build brand dashboard

### Month 4: Commerce Features

**Week 13-14: Shopping Cart**

- [ ] Implement cart functionality
- [ ] Build checkout flow
- [ ] Integrate Razorpay/Stripe
- [ ] Add address management
- [ ] Create order confirmation

**Week 15-16: Order Management**

- [ ] Build order tracking
- [ ] Implement email notifications
- [ ] Create returns/refunds flow
- [ ] Add invoice generation
- [ ] Build analytics dashboard

### Month 5: Optimization

**Week 17-18: Performance**

- [ ] Implement caching strategies
- [ ] Optimize database queries
- [ ] Add CDN for static assets
- [ ] Implement lazy loading
- [ ] Optimize bundle size

**Week 19-20: Mobile Experience**

- [ ] PWA implementation
- [ ] Mobile-specific optimizations
- [ ] Touch gestures
- [ ] App-like navigation
- [ ] Push notifications

### Month 6: Launch Preparation

**Week 21-22: Testing & QA**

- [ ] Comprehensive testing
- [ ] Load testing
- [ ] Security audit
- [ ] Bug fixes
- [ ] Performance monitoring

**Week 23-24: Launch**

- [ ] Production deployment
- [ ] Marketing campaign launch
- [ ] Press release
- [ ] Influencer outreach
- [ ] Launch event

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Supabase account
- Cloudinary account
- Vercel account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wardro8e.git
cd wardro8e

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Edit .env.local with your credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_cloudinary_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Run database migrations
npm run db:migrate

# Seed sample data (optional)
npm run db:seed

# Start development server
npm run dev
```

### Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run db:types     # Generate TypeScript types from Supabase
npm run lint         # Run ESLint
npm run format       # Format code with Prettier

# Testing
npm run test         # Run tests
npm run test:e2e     # Run E2E tests

# Production
npm run build        # Build for production
npm run start        # Start production server
```

### Deployment

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Follow prompts to configure project
```

---

## Support & Resources

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Community
- Discord: [Join our community](https://discord.gg/wardro8e)
- GitHub Issues: [Report bugs](https://github.com/yourusername/wardro8e/issues)
- Email: support@wardro8e.com

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by the wardro8e team
