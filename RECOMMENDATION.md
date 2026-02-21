# Wardro8e — App-Side Behavior & Recommendation Logic

> This document covers how the app should behave from the user's perspective: feed loading strategy, product interaction handling, preference updates, and the full data flow behind personalization.

---

## Table of Contents

1. [Onboarding & Style Quiz](#1-onboarding--style-quiz)
2. [Feed Loading — Every App Open](#2-feed-loading--every-app-open)
3. [Product Open — What Happens](#3-product-open--what-happens)
4. [Implicit Preference Updates](#4-implicit-preference-updates)
5. [The "More Like This" Section](#5-the-more-like-this-section)
6. [Feed Refresh & Pagination](#6-feed-refresh--pagination)
7. [State You Must Track Client-Side](#7-state-you-must-track-client-side)
8. [Things You Might Have Missed](#8-things-you-might-have-missed)
9. [Full Data Flow Diagram](#9-full-data-flow-diagram)

---

## 1. Onboarding & Style Quiz

### What Gets Collected

| Field | UI Input | Stored In |
|---|---|---|
| `gender` | Single select (Men / Women / Both) | `user_preferences.gender` |
| `style_tags` | Multi-select chips (Casual, Formal, Streetwear, Bohemian, etc.) | `user_preferences.style_tags` |
| `favorite_colors` | Color swatches, multi-select | `user_preferences.favorite_colors` |
| `pattern_preferences` | Multi-select (Solid, Floral, Striped, etc.) | `user_preferences.pattern_preferences` |


### Skip Handling

The user can skip the quiz entirely. This must be gracefully handled throughout the app.

- On skip: create a `user_preferences` row with **all fields null** — do NOT skip row creation. The row must exist.
- The app must check `onboarding_completed = true` regardless of whether they filled in quiz data.
- Mark `quiz_skipped = true` (add this boolean to `user_preferences`) so you can distinguish "skipped" from "hasn't reached quiz yet."

### After Quiz Submission

1. `UPSERT` into `user_preferences` with all collected fields.
2. Set `users.onboarding_completed = true`.
3. Navigate to home feed — **do not wait for feed to load before navigating**. Navigate immediately and show a skeleton loader.

---

## 2. Feed Loading — Every App Open

This is the most important flow. It runs every time the user lands on the home tab.

### Decision Tree

```
User opens app
      │
      ▼
Is user authenticated?
  No  ──► Show guest feed (trending/featured products, no personalization)
  Yes ──► Check user_preferences
              │
              ├── Has interaction history (user_interactions rows in last 30 days)?
              │         YES ──► Behavioral Feed (Layer 3B)
              │
              ├── Has quiz preferences (style_tags / colors not null)?
              │         YES ──► Preference Feed (Layer 3A)
              │
              └── Neither (new user who skipped quiz, zero interactions)
                          ──► Cold Start Feed (trending + featured)
```

### Feed Type Definitions

#### Cold Start Feed (no data)
- Fetch `products` ordered by `is_featured DESC, created_at DESC`
- Apply gender filter if gender was set during onboarding (even if rest was skipped)
- Limit 20, paginate with offset

#### Preference Feed (has quiz data, no interaction history)
- Call `get_personalized_feed(user_id)` Supabase RPC
- This scores products by style match, color match, pattern, recency
- Apply gender filter from `user_preferences.gender`
- Limit 20, paginate

#### Behavioral Feed (has interaction history)
- Call `POST /personalized-feed` on Python service
- Blends: 70% behavioral (based on top interacted products' visual neighbors) + 30% preference-based
- Apply gender filter
- Limit 20, paginate

### Loading Strategy (Critical for UX)

**Do NOT block the UI on feed load.** Follow this exact sequence:

```
1. App opens → navigate to home tab immediately
2. Show skeleton loaders (masonry grid of gray placeholder cards)
3. Check AsyncStorage / local cache:
     → If cached feed exists AND cache age < 15 minutes:
           Render cached feed instantly
           Trigger background refresh silently
     → If no cache or stale:
           Show skeletons until API responds
4. API returns → replace skeletons / update feed
5. Store new results in AsyncStorage with timestamp
```

**Cache key:** `feed_cache_{user_id}` with `{ data: [...], cached_at: ISO_timestamp }`

**Cache TTL:** 15 minutes. After 15 min, always fetch fresh even if cached data exists.

### Seen Products Filtering

Every feed response must exclude products the user has already seen or purchased.

- Maintain a local set in AsyncStorage: `seen_product_ids_{user_id}` (array of UUIDs)
- On every product view event, add `product_id` to this set
- Send this set as `exclude_ids` in every feed request
- Cap the exclusion list at **500 IDs** (oldest drop off first) to avoid bloated requests
- On the backend, add `AND id != ALL($exclude_ids)` to the feed query

```json
// Feed request payload
{
  "user_id": "uuid",
  "limit": 20,
  "offset": 0,
  "exclude_ids": ["uuid1", "uuid2", "..."]
}
```

### Gender Filtering

Gender filter must be applied at the DB level, not client-side:

- If `user_preferences.gender = 'women'` → `WHERE gender IN ('women', 'unisex')`
- If `user_preferences.gender = 'men'` → `WHERE gender IN ('men', 'unisex')`
- If `user_preferences.gender = 'both'` OR null → no gender filter

---

## 3. Product Open — What Happens

When a user taps a product card, two things happen in parallel: **UI renders** and **background data work starts**.

### Immediate (UI Thread)

1. Navigate to `/product/[id]`
2. Render product details from the data already in the card (title, image, price, brand) — you have this from the feed
3. Show skeleton for "More Like This" section below
4. Show skeleton for additional product details not in card (size options, description, attributes)

### Background (Non-blocking, fire-and-forget)

Fire all of these simultaneously using `Promise.all` or parallel async calls:

#### A. Log the View Interaction
```
INSERT INTO user_interactions (user_id, product_id, interaction_type, created_at)
VALUES ($user_id, $product_id, 'view', NOW())
```
- Do this immediately on product open, don't wait for user to scroll
- This is the lowest-weight signal (0.2) but highest volume — it builds the behavioral profile fast

#### B. Fetch Full Product Details
- Fetch complete product row if not already in local cache
- Cache product detail by `product_id` with TTL of 1 hour

#### C. Trigger "More Like This"
```
POST /similar-products
{ "product_id": "uuid", "limit": 12 }
```
- Display results in "More Like This" masonry section when they arrive
- Exclude products already in seen_product_ids

#### D. Update Local Preference Signal (see Section 4)

### Thresholds Before Logging Higher-Intent Signals

Not every product open is a strong signal. Use time-on-screen and scroll depth:

| Behavior | Threshold | Signal to Log |
|---|---|---|
| Opens product | Immediate | `view` (0.2) |
| Scrolls past 50% of detail page | After 3 seconds on screen | Update implicit style counters locally |
| Taps "Like" button | On tap | `like` (0.5) → INSERT interaction |
| Taps "Save" / adds to collection | On tap | `save` (0.7) → INSERT interaction |
| Taps "Buy Now" (affiliate link) | On tap | `purchase` (1.0) → INSERT interaction |

**Do not INSERT `view` interactions for the same product twice within 24 hours.** Check local seen_product_ids before logging a duplicate view.

---

## 4. Implicit Preference Updates

Every time a user opens a product, likes, saves, or purchases it, you have new data about their style. Use it.

### What to Extract from a Product Interaction

```
When user interacts with product P with weight W:
  → Extract: P.style[], P.colors[], P.attributes.pattern, P.occasion[], P.gender
  → Update local style counters (see below)
  → If W >= 0.5 (like/save/purchase): sync updated preferences to user_preferences table
```

### Local Style Counter (AsyncStorage)

Maintain a local tally of style signals. Do NOT write to Supabase on every single view — that's expensive. Accumulate locally, sync on meaningful interactions.

```json
// AsyncStorage key: style_counter_{user_id}
{
  "style_scores": {
    "Casual": 14,
    "Bohemian": 8,
    "Streetwear": 3
  },
  "color_scores": {
    "Black": 11,
    "White": 9,
    "Teal": 6
  },
  "pattern_scores": {
    "Solid": 18,
    "Floral": 4
  },
  "last_synced_at": "2026-02-15T10:30:00Z"
}
```

**On every product view:** Increment counters for that product's style, color, pattern tags.

**On like/save/purchase:** Increment counters AND sync top preferences to Supabase:

```
Derive top 5 styles from style_scores (sort descending, take top 5)
Derive top 5 colors from color_scores
Derive top 3 patterns from pattern_scores

UPSERT into user_preferences:
  style_tags = derived top 5 styles
  favorite_colors = derived top 5 colors
  pattern_preferences = derived top 3 patterns
  updated_at = NOW()
```

**Sync cadence:** Also sync to Supabase on:
- App going to background (`AppState` change to 'background')
- Every 10th product view (not just likes/saves)
- App close / logout

### Why This Matters

Without this, the personalized feed can only use the original quiz answers forever. With this, the feed naturally evolves as the user browses — they don't have to re-take the quiz.

---

## 5. The "More Like This" Section

Appears at the bottom of every product detail page. This is Layer 1 + Layer 2 of the recommendation system.

### Loading

```
Product detail page opens
  ├── Render product info (immediate, from feed cache)
  └── Fetch similar products (async)
        POST /similar-products { product_id, limit: 12 }
              │
              ▼ response arrives
        Filter out seen_product_ids
        Render as horizontal scroll or masonry below product details
```

### Edge Cases

- **No embedding yet:** If the product was just added and CLIP hasn't processed it, `/similar-products` returns 404 or empty. Show nothing — don't show an error state, just hide the section.
- **Fewer than 3 results:** Don't render the "More Like This" header if there are fewer than 3 results. An almost-empty section looks broken.
- **Tapping a "More Like This" product:** Navigates to that product page. Log a `view` interaction for it. The new product's "More Like This" loads fresh.

---

## 6. Feed Refresh & Pagination

### Pull-to-Refresh

User pulls down on the home feed:
1. Clear the cached feed for this user
2. Reset `offset` to 0
3. Re-fetch feed (full fresh load)
4. Do NOT reset `seen_product_ids` — they've already seen those products

### Infinite Scroll / Load More

As user scrolls and reaches 80% of current list:
1. Increment `offset` by 20 (or however many were loaded)
2. Fetch next page with same params + new offset
3. Append results to existing list (do not replace)
4. Filter out any IDs already in the list (dedup client-side)

### Feed Staleness

- Background refresh every 15 minutes while app is in foreground
- On foreground restore (app comes back from background after > 5 min): trigger silent refresh
- Use the new results only if they differ from current cache (avoid unnecessary re-renders)

---

## 7. State You Must Track Client-Side

These all live in AsyncStorage and/or React state. Without them the personalization logic breaks.

| Key | Type | Description | TTL |
|---|---|---|---|
| `feed_cache_{user_id}` | `{ data, cached_at }` | Last fetched home feed | 15 min |
| `seen_product_ids_{user_id}` | `string[]` (max 500) | Products already seen | Never expires, rolling window |
| `style_counter_{user_id}` | `{ style_scores, color_scores, pattern_scores, last_synced_at }` | Implicit preference counters | Persistent |
| `product_cache_{product_id}` | Full product row | Cached product detail | 1 hour |
| `similar_cache_{product_id}` | Similar products array | Cached "More Like This" results | 30 min |
| `last_interaction_{product_id}` | ISO timestamp | Prevents duplicate view logs | 24 hours |

---

## 8. Things You Might Have Missed

### 8.1 Guest Mode

Users who haven't signed up should still see a feed. Show a trending/featured feed with a soft CTA ("Sign up to personalize your feed"). Once they sign up and complete onboarding, their interactions from guest mode are **lost** — that's fine, don't over-engineer this.

### 8.2 Re-Quiz / Preference Reset

Give users a way to retake the style quiz or reset their preferences. Without this, a user whose taste changes has no recourse. Add a "Retake Style Quiz" option in profile settings. On retake:
- Overwrite `user_preferences` with new quiz answers
- Reset `style_counter_{user_id}` in AsyncStorage
- Clear `feed_cache_{user_id}` so the next open loads fresh

### 8.3 Category & Gender Switching (Discover Tab)

On the Discover tab where users browse by category/filter, the personalization score should still apply within filter results — don't disable scoring just because a filter is active. Show filtered results ranked by personalization score, not just `created_at DESC`.

### 8.4 "Not Interested" Signal

Consider adding a long-press action on product cards: "Not interested." This is a **negative signal** and extremely valuable.

When fired:
- Log `interaction_type = 'dismiss'` in `user_interactions` (weight: -0.3)
- Remove the card from the feed immediately (optimistic UI)
- Add to `seen_product_ids` so it never reappears
- On backend: dismissed products should be excluded from all future feed and similar product results for this user

### 8.5 Collections / Saves

When a user saves a product to a collection:
- Log `save` interaction (weight: 0.7)
- Update style counters + sync preferences
- The Collections tab shows all saved products — this is not a feed, don't apply recommendation scoring here. Show them chronologically.

### 8.6 Interaction Deduplication on Backend

Even with client-side deduplication (`last_interaction_{product_id}`), network retries or edge cases can cause duplicate inserts. On the backend `user_interactions` table, add a unique constraint or dedup logic:

```sql
-- Prevent duplicate view interactions for same user+product within 24 hours
CREATE UNIQUE INDEX uix_interactions_daily 
ON user_interactions (user_id, product_id, interaction_type, (created_at::date))
WHERE interaction_type = 'view';
```

For `like`, `save`, `purchase` — allow multiple but only count the most recent one per type when computing behavioral scores.

### 8.7 New User "Warm Up" Period

For a user with quiz data but zero interactions, the preference-based feed is decent but not great. The app should actively encourage interaction in the first session:

- Show a subtle "Tell us what you think" nudge after the first 5 cards
- This nudge should show a card with 3-4 style images (not products) asking "which vibe is more you?" — this is a micro-quiz that updates `style_tags` without being intrusive
- Only show this once, mark `micro_quiz_shown = true` in `user_preferences`

### 8.8 Brand Diversity Cap

Without a cap, if the catalog has 5000 products from Brand X and 50 from Brand Y, behavioral users who interacted with Brand X once will get flooded with Brand X. Add a server-side cap:

```
Max 2 products per brand per feed page (20 items)
```

Implement this as a post-ranking deduplication step in the Python service before returning results.

### 8.9 Trending / Social Proof Layer

Add a `trending_score` to products that combines:
- Views in last 24 hours (normalized)
- Saves in last 24 hours (normalized)
- New product bonus (added in last 48 hours)

Use this as a tiebreaker when two products have similar personalization scores. This also prevents the feed from always showing the same products to every user at the cold-start stage.

### 8.10 Feed Analytics You Should Log

For future weight tuning, log these events to your analytics tool (PostHog / Amplitude):

| Event | Properties |
|---|---|
| `feed_loaded` | feed_type (cold/preference/behavioral), item_count, load_time_ms |
| `product_opened` | product_id, source (feed/similar/discover/search), position_in_feed |
| `product_liked` | product_id, source |
| `product_saved` | product_id, source |
| `affiliate_link_opened` | product_id (this is your conversion event) |
| `feed_scrolled_to_bottom` | feed_type, items_loaded |
| `not_interested_tapped` | product_id |

The `position_in_feed` property is especially important — if users rarely click products in positions 10-20, your top-10 ranking is the only thing that matters and you should optimize accordingly.

---

## 9. Full Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│  APP OPEN                                                          │
│                                                                    │
│  1. Check auth → 2. Navigate to Home → 3. Show skeleton           │
│  4. Check AsyncStorage cache (TTL: 15 min)                        │
│       ├── FRESH → render cached feed immediately                  │
│       └── STALE / EMPTY → fetch from API                         │
│                                                                    │
│  Feed API Decision:                                               │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │  Has interactions?  → Behavioral Feed (Python service)  │      │
│  │  Has quiz prefs?    → Preference Feed (Supabase RPC)   │      │
│  │  Neither?           → Cold Start Feed (trending)       │      │
│  └─────────────────────────────────────────────────────────┘      │
│  ↓                                                                 │
│  Filter out seen_product_ids → Apply gender filter                │
│  → Render masonry grid                                             │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ user taps a product
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  PRODUCT OPEN                                                      │
│                                                                    │
│  IMMEDIATE (UI):                                                   │
│  → Navigate to product page                                        │
│  → Render from cached card data (title, image, price, brand)      │
│  → Show skeletons for: full details, More Like This               │
│                                                                    │
│  BACKGROUND (parallel):                                           │
│                                                                    │
│  A. Log view interaction                                           │
│     INSERT user_interactions (type=view, weight=0.2)              │
│     Add to seen_product_ids (local)                               │
│                                                                    │
│  B. Fetch full product details (if not cached)                    │
│     Cache with TTL 1hr                                            │
│                                                                    │
│  C. Fetch similar products                                         │
│     POST /similar-products → filter seen → render More Like This  │
│                                                                    │
│  D. Update local style counters                                   │
│     Increment style/color/pattern scores for this product         │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ user likes / saves / purchases
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  HIGH-INTENT INTERACTION                                           │
│                                                                    │
│  1. Optimistic UI update (show liked/saved state immediately)     │
│  2. INSERT user_interactions (type=like/save/purchase)            │
│  3. Increment local style counters (stronger increment)           │
│  4. Derive top preferences from counters                          │
│  5. UPSERT user_preferences (style_tags, colors, patterns)        │
│  6. Invalidate feed cache → next open gets fresh personalized feed│
└────────────────────────────────────────────────────────────────────┘
```

---

*Last updated: February 2026*
*Covers: Feed loading strategy, product interaction handling, implicit preference learning, edge cases, and analytics hooks.*