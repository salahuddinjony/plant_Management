# Nursery Bazar BD - API Documentation

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready  
**Base URL**: `https://api.nurserybazarbd.com/api/v1`

## Table of Contents

1. [Overview & Setup](#overview--setup)
2. [Authentication](#authentication)
3. [Module Endpoints](#module-endpoints)
4. [Data Models](#data-models)
5. [Business Logic](#important-business-logic)
6. [Error Handling](#error-handling)
7. [Implementation Files](#implementation-files)
8. [Postman Setup](#postman-setup)

---

## Overview & Setup

### Project Structure

This e-commerce API is built with a modular architecture. All source code is located in `src/modules/` with each feature having its own folder containing:

- `*.interface.ts` - TypeScript type definitions
- `*.model.ts` - MongoDB schema definition
- `*.validation.ts` - Zod runtime validation schemas
- `*.service.ts` - Business logic layer
- `*.controller.ts` - HTTP request handlers
- `*.route.ts` - API endpoint definitions

### Installation & Running

```bash
# Install dependencies
npm install
# or
pnpm install

# Development
npm run dev

# Production Build
npm run build
npm start
```

### Environment Configuration

Create a `.env` file with the following:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nursery-bazar-bd
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=hello@yourdomain.com
SENDGRID_FROM_NAME=Nursery Bazar BD
# Optional SMTP fallback if SENDGRID_API_KEY is not set:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
PORT=5000
NODE_ENV=development
```

---

## Authentication

### Bearer Token Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

**Endpoint**: `POST /auth/login`

```bash
curl -X POST https://api.nurserybazarbd.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

### Role-Based Access Control

- **USER**: Regular customers with limited permissions
- **ADMIN**: Administrative access to management endpoints

### Sample Authentication Flow

```typescript
// In Dart (Flutter)
final response = await http.post(
  Uri.parse('https://api.nurserybazarbd.com/api/v1/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'email': 'user@example.com',
    'password': 'password123',
  }),
);

final data = jsonDecode(response.body);
final token = data['data']['accessToken'];

// Use token for authenticated requests
final cartResponse = await http.get(
  Uri.parse('https://api.nurserybazarbd.com/api/v1/carts'),
  headers: {'Authorization': 'Bearer $token'},
);
```

---

## Module Endpoints

## Auth Module (`/auth`)

### POST `/auth/sign-up`

Register a new user account (Email and phone verification no longer required)

- **Auth**: Not required
- **Content-Type**: `multipart/form-data` (for profile picture upload)
- **Body** (either email or phone is required):

  ```json
  {
    "name": "John Doe",
    "email": "user@example.com",
    "password": "password123",
    "phone": "01712345678",
    "profilePicture": "file (optional)"
  }
  ```
  
  OR
  
  ```json
  {
    "name": "John Doe",
    "phone": "01712345678",
    "password": "password123"
  }
  ```

- **Response**: User object (without password, OTP fields no longer sent)
- **Note**: Email verification is no longer required. Users can log in immediately after signup.

### POST `/auth/login`

Login with email or phone number

- **Auth**: Not required
- **Body** (either email or phone is required):

  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
  
  OR
  
  ```json
  {
    "phone": "01712345678",
    "password": "password123"
  }
  ```

- **Response**:

  ```json
  {
    "user": { /* user object */ },
    "accessToken": "jwt_token",
    "refreshToken": "jwt_refresh_token"
  }
  ```

- **Note**: Email verification is not required to login

### POST `/auth/verify-email` (DEPRECATED)

**This endpoint is no longer available.** Email verification is no longer required for signup.

<!-- Previously: Verify email address using OTP
- **Auth**: Not required
- **Body**: `{"email": "user@example.com", "otp": "123456"}`
- **Response**: Success message -->

### GET `/auth/verify-email` (DEPRECATED)

**This endpoint is no longer available.** Email verification is no longer required for signup.

<!-- Previously: Verify email via link (sent in email)
- **Auth**: Not required
- **Query Params**: `token`, `email`
- **Response**: Redirects to verification result page -->

### POST `/auth/resend-otp` (DEPRECATED)

**This endpoint is no longer available.** Email verification is no longer required for signup.

<!-- Previously: Resend email verification OTP
- **Auth**: Not required
- **Body**: `{"email": "user@example.com"}`
- **Response**: Success message
- **Note**: Only works for unverified emails -->

### POST `/auth/request-password-reset`

Request password reset (Forgot Password)

- **Auth**: Not required
- **Body**:

  ```json
  {
    "email": "user@example.com"
  }
  ```

- **Response**: Success message
- **Note**: Sends reset token to email (valid for 24 hours)

### GET `/auth/reset-password`

Redirect to password reset page

- **Auth**: Not required
- **Query Params**:
  - `token`: Reset token
  - `email`: User email
- **Response**: Redirects to reset password HTML page

### POST `/auth/reset-password`

Reset password using token

- **Auth**: Not required
- **Body**:

  ```json
  {
    "email": "user@example.com",
    "token": "reset_token",
    "newPassword": "newpassword123"
  }
  ```

- **Response**: Success message

### POST `/auth/change-password`

Change password for authenticated user

- **Auth**: Required (USER or ADMIN)
- **Body**:

  ```json
  {
    "oldPassword": "currentPassword123",
    "newPassword": "newPassword123"
  }
  ```

- **Response**: Success message

---

## Products Module (`/products`)

### POST `/products`

Create a new product (Admin)

- **Auth**: Required (Admin/Super Admin)
- **Content-Type**: `multipart/form-data`
- **Body** (admin sends `quantity` for initial stock; do **not** send `available` or `sold`):

  | Field | Required | Notes |
  |-------|----------|--------|
  | `name` | Yes | min 2 chars |
  | `price` | Yes | number ≥ 0 |
  | `images` | **Yes** | 1–5 image files (multipart field name must be `images`) |
  | `quantity` | **Yes** | Initial stock; server sets `available = quantity`, `sold = 0` |
  | `description`, `discount`, `isAvailable`, `isFeatured`, `sku`, `brand`, `categoryId`, `tags`, `deliveryTime`, `courierCharge` | No | same as before |

  Do **not** send an `image` field. All URLs are returned in `images` only.

  Example form fields:

  ```json
  {
    "name": "Rose Plant",
    "description": "Beautiful red rose plant",
    "price": 250,
    "discount": 10,
    "quantity": 50,
    "isAvailable": true,
    "isFeatured": false,
    "sku": "ROSE-001",
    "brand": "Garden Paradise",
    "categoryId": "category_id",
    "tags": "rose,flower,outdoor",
    "deliveryTime": "2-3 business days",
    "courierCharge": 50
  }
  ```

- **Response** (201):

  ```json
  {
    "success": true,
    "message": "Product created successfully",
    "data": {
      "_id": "...",
      "name": "Rose Plant",
      "price": 250,
      "available": 50,
      "sold": 0,
      "isAvailable": true,
      "images": [
        "https://res.cloudinary.com/.../img1.png",
        "https://res.cloudinary.com/.../img2.png"
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
  ```

  Stock fields: `available` and `sold` are always returned. **`quantity`** is included in responses only for **admin/super-admin** tokens (`quantity` equals `available`). **User** tokens do not receive `quantity`. `quantity` is not stored in the database.

### GET `/products`

Get all products with filtering, sorting, and pagination

- **Auth**: Required (User/Admin/Super Admin)
- **Query Params**:
  - `searchTerm`: Search in name, description, brand, sku, tags
  - `brand`: Filter by brand
  - `tag`: Filter by specific tag
  - `price`: Filter by price (e.g., `?price[gte]=100&price[lte]=500`)
  - `rating`: Filter by rating
  - `stock`: Filter by stock availability
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sort`: Sort field (e.g., `price`, `-price`, `createdAt`)
  - `fields`: Select specific fields (e.g., `name,price,image`)
- **Response**:

  ```json
  {
    "products": [...],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 100
    }
  }
  ```

### GET `/products/tag/:tag`

Get products by specific tag name(s) - supports multiple tags

- **Auth**: Required (User/Admin/Super Admin)
- **Params**: `tag` - Single tag or comma-separated tags (e.g., "rose" or "rose,flower,apple")
- **Query Params**: (All optional)
  - `searchTerm`: Search in name, description, brand, sku
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 1000)
  - `sort`: Sort field (e.g., `price`, `-price`, `createdAt`)
  - `fields`: Select specific fields (e.g., `name,price,image`)
- **Examples**:
  - Single tag: `/products/tag/rose`
  - Multiple tags: `/products/tag/rose,flower,apple`
  - With pagination: `/products/tag/rose,flower?page=1&limit=10`
  - With sorting: `/products/tag/rose?sort=-price`
- **Response**:

  ```json
  {
    "products": [...],
    "meta": {
      "totalDocuments": 25,
      "totalPages": 3,
      "currentPage": 1,
      "limitPerPage": 10
    }
  }
  ```

- **Note**: Case-insensitive matching. Returns products containing ANY of the specified tags.

Get a product by ID

- **Auth**: Required (User/Admin/Super Admin)
- **Params**: `id` - Product ID
- **Response**: Product object

### GET `/products/category/:categoryId`

Get all products by category ID

- **Auth**: Required (User/Admin/Super Admin)
- **Params**: `categoryId` - Category ID
- **Response**:

  ```json
  {
    "products": [...],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 50
    }
  }
  ```

### PATCH `/products/:id`

Update a product (Admin)

- **Auth**: Required (Admin/Super Admin)
- **Content-Type**: `multipart/form-data`
- **Params**: `id` - Product ID
- **Max images**: **5** total per product (existing + new combined)
- **Body** (all optional):

  | Field | Effect |
  |-------|--------|
  | `quantity` | Sets `available` to this value (`available = quantity`) |
  | `sold` | Sets `sold` directly (manual correction) |
  | `images` (text) | JSON array of **existing image URLs to keep** after user removes some in the UI (see flows below) |
  | `images` (files) | New image **files** to upload (field name `images`, same as create) |
  | Other fields | Same as create (`name`, `price`, `isAvailable`, etc.) |

  Do **not** send `available` in the body; use `quantity` to set stock.

  #### Product image update flows (frontend)

  Keep local state: `keptUrls: string[]` (Cloudinary URLs still shown) and `newFiles: File[]` (picked locally, not uploaded yet).

  | Case | Send `images` (URLs text) | Send `images` (files) | Backend result |
  |------|---------------------------|------------------------|----------------|
  | **A. Only change name/price** (no image change) | omit | omit | Images unchanged |
  | **B. Add new photo only** | omit | new file(s) | **Append** to existing URLs |
  | **C. Remove one (or more), no new file** | JSON array of URLs **still on screen** | omit | **Replace** to that list; removed URLs deleted from storage |
  | **D. Remove one + add new** | JSON array of URLs **still on screen** | new file(s) | **Replace** kept URLs + append uploads |
  | **E. Replace all images** | omit or `[]` | full new set of files (1–5) | Only new uploads (old deleted) |

  **Case D example** (had 3 images, user removed B, added new file D):

  - `images` (text): `["https://.../A.jpg","https://.../C.jpg"]`
  - `images` (file): one file for D
  - Result: `[A, C, D]` (max 5)

  **Case B example** (add only):

  - Do **not** send `images` text field
  - `images` (file): new photo only
  - Result: old images + new photo

  **Validation errors**

  - More than 5 images total → `400` — `A product can have at most 5 images`
  - Zero images after update → `400` — `At least one product image is required`

  Flutter/Dio: use `FormData`; for kept URLs use  
  `formData.fields.add(MapEntry('images', jsonEncode(keptUrls)));`  
  and attach files with `MultipartFile.fromFile` under key `images`.

  Examples (other fields):

  ```json
  { "quantity": 80 }
  { "sold": 12 }
  { "quantity": 100, "sold": 5, "price": 300 }
  ```

- **Response** (200): product with `images: string[]` (up to 5 URLs)

- **Note**: Removed URLs (when you send the `images` text list) are deleted from Cloudinary. When you only append files, old images are kept.

#### Inventory (orders, automatic)

| Event | `sold` | `available` |
|-------|--------|-------------|
| Order placed (`pending`) | `+qty` | `−qty` |
| Order `cancelled` | `−qty` | `+qty` |
| `delivered` | no change | no change |

Clients read `available` (stock) and `sold` on product list/detail. Cart still uses body field `quantity` for how many units to add to the cart.

### DELETE `/products/:id`

Delete a product (Admin)

- **Auth**: Required (Admin/Super Admin)
- **Params**: `id` - Product ID
- **Response**: Deleted product object
- **Side Effect**: Automatically deletes associated images from Cloudinary

---

## Cart Module (`/carts`)

### GET `/carts`

Get user's shopping cart

- **Auth**: Required
- **Response**: Cart object with items array

### POST `/carts/add`

Add item to cart

- **Auth**: Required
- **Body**: `{ productId: string, quantity: number }`
- **Response**: Updated cart

### PATCH `/carts/:productId`

Update cart item quantity

- **Auth**: Required
- **Params**: `productId`
- **Body**: `{ quantity: number }`
- **Response**: Updated cart

### DELETE `/carts/:productId`

Remove item from cart

- **Auth**: Required
- **Params**: `productId`
- **Response**: Updated cart

### DELETE `/carts`

Clear entire cart

- **Auth**: Required
- **Response**: Empty cart

---

## Order Module (`/orders`)

### POST `/orders`

Create order from cart

- **Auth**: Required
- **Body**:

  ```json
  {
    "shippingAddressId": "address_id",
    "discountCode": "CODE (optional)",
    "paymentMethod": "cash | card (optional)",
    "notes": "delivery notes (optional)"
  }
  ```

- **Response**: Order object with orderId, status, total

### GET `/orders`

Get user's orders

- **Auth**: Required
- **Response**: Array of orders

### GET `/orders/:orderId`

Get specific order

- **Auth**: Required
- **Params**: `orderId`
- **Response**: Order details

### PATCH `/orders/:orderId/status`

Update order status (Admin)

- **Auth**: Required (Admin)
- **Params**: `orderId`
- **Body**: `{ status: "pending | processing | delivered | cancelled" }`
- **Response**: Updated order

### PATCH `/orders/:orderId/payment-status`

Update order payment status (Admin / Super Admin)

- **Auth**: Required (Admin or Super Admin)
- **Params**: `orderId` — e.g. `ORD-1704196800000-abc123`
- **Body**:

  ```json
  {
    "paymentStatus": "completed"
  }
  ```

  - `paymentStatus` (required): `"pending"` | `"completed"` | `"failed"`
- **Response**: Updated order with new `paymentStatus`
- **Side effect**: Syncs linked transaction `transactionStatus` when a transaction exists for the order
- See also: `documentations/ORDER_PAYMENT_STATUS_API.md`

### PATCH `/orders/:orderId/cancel`

Cancel order (User) - Within 6 hours of creation

- **Auth**: Required (User/Admin)
- **Params**: `orderId`
- **Validations**:
  - Order must belong to the authenticated user
  - Order must be created within the last 6 hours
  - Order status must not be "cancelled" or "delivered"
- **Response**: Updated order with status "cancelled"
- **Errors**:
  - `400` - Order can only be cancelled within 6 hours of creation
  - `400` - Order is already cancelled
  - `400` - Cannot cancel a delivered order
  - `404` - Order not found

---

## Review & Rating Module (`/reviews`)

### POST `/reviews`

Create product review

- **Auth**: Required
- **Body**:

  ```json
  {
    "productId": "product_id",
    "rating": 1-5,
    "reviewText": "optional review text",
    "isPublished": false
  }
  ```

- **Response**: Review object

### GET `/reviews/product/:productId`

Get published reviews for product

- **Params**: `productId`
- **Response**: Array of reviews (sorted by newest)

### GET `/reviews`

Get user's reviews

- **Auth**: Required
- **Response**: Array of user's reviews

### PATCH `/reviews/:reviewId/publish`

Publish review (makes it visible)

- **Auth**: Required
- **Params**: `reviewId`
- **Response**: Updated review
- **Side Effect**: Updates product ratingAverage and ratingCount

### PATCH `/reviews/:reviewId/unpublish`

Unpublish review (hides it)

- **Auth**: Required
- **Params**: `reviewId`
- **Response**: Updated review
- **Side Effect**: Recalculates product ratings

### PATCH `/reviews/:reviewId/helpful`

Mark review as helpful

- **Params**: `reviewId`
- **Response**: Review with incremented helpfulCount

### DELETE `/reviews/:reviewId`

Delete review

- **Auth**: Required
- **Params**: `reviewId`
- **Response**: Deleted review
- **Side Effect**: Recalculates product ratings if published

---

## Wishlist Module (`/wishlists`)

### GET `/wishlists`

Get user's wishlist

- **Auth**: Required
- **Response**: Wishlist with populated product details

### POST `/wishlists/add`

Add product to wishlist

- **Auth**: Required
- **Body**: `{ productId: string }`
- **Response**: Updated wishlist

### GET `/wishlists/check/:productId`

Check if product in wishlist

- **Auth**: Required
- **Params**: `productId`
- **Response**: `{ isInWishlist: boolean }`

### DELETE `/wishlists/:productId`

Remove product from wishlist

- **Auth**: Required
- **Params**: `productId`
- **Response**: Updated wishlist

### DELETE `/wishlists`

Clear entire wishlist

- **Auth**: Required
- **Response**: Empty wishlist

---

## Address Module (`/addresses`)

### POST `/addresses`

Create new address

- **Auth**: Required
- **Body**:

  ```json
  {
    "street": "123 Main Street, Apt 4B",
    "city": "Dhaka",
    "postalCode": "1212",
    "country": "Bangladesh",
    "phoneNumber": "01712345678",
    "label": "home",
    "isDefault": true
  }
  ```

  - `phoneNumber` (required): 10–15 digits (e.g. `"01712345678"`)
  - `label` (optional): `"home"` | `"office"` | `"other"` — defaults to `"other"` if omitted

- **Response**: Created address
- **Note**: First address is automatically set as default

### GET `/addresses`

Get all user addresses

- **Auth**: Required
- **Response**: Array of addresses (default first)

### GET `/addresses/:addressId`

Get specific address

- **Auth**: Required
- **Params**: `addressId`
- **Response**: Address details

### PATCH `/addresses/:addressId`

Update address

- **Auth**: Required
- **Params**: `addressId`
- **Body**: Any address fields to update
- **Response**: Updated address

### PATCH `/addresses/:addressId/set-default`

Set address as default shipping address

- **Auth**: Required
- **Params**: `addressId`
- **Response**: Updated address
- **Side Effect**: Unsets previous default

### DELETE `/addresses/:addressId`

Delete address

- **Auth**: Required
- **Params**: `addressId`
- **Response**: Deleted address
- **Side Effect**: Sets another address as default if deleted was default

---

## Coupon/Discount Module (`/coupons`)

### POST `/coupons`

Create discount coupon (Admin)

- **Body**:

  ```json
  {
    "code": "SAVE20",
    "discountType": "percentage | fixed",
    "discountValue": 20,
    "validFrom": "2024-01-20T00:00:00Z",
    "validUntil": "2024-12-31T23:59:59Z",
    "maxUses": 100,
    "minOrderAmount": 5000,
    "isActive": true,
    "description": "New Year Sale"
  }
  ```

- **Response**: Created coupon

### GET `/coupons`

Get all coupons

- **Query**: `?isActive=true|false`
- **Response**: Array of coupons

### GET `/coupons/:code`

Get coupon by code

- **Params**: `code`
- **Response**: Coupon details

### POST `/coupons/validate`

Validate coupon for order

- **Body**:

  ```json
  {
    "code": "SAVE20",
    "orderTotal": 10000
  }
  ```

- **Response**:

  ```json
  {
    "coupon": { ...coupon details },
    "discountAmount": 2000,
    "finalTotal": 8000
  }
  ```

### POST `/coupons/apply`

Apply coupon (increments usage)

- **Body**: `{ code: string }`
- **Response**: Updated coupon with incremented currentUses

### PATCH `/coupons/:couponId`

Update coupon (Admin)

- **Params**: `couponId`
- **Body**: Partial coupon fields
- **Response**: Updated coupon

### DELETE `/coupons/:couponId`

Delete coupon (Admin)

- **Params**: `couponId`
- **Response**: Deleted coupon

---

## Payment Method Module (`/payment-methods`)

### POST `/payment-methods`

Create a new payment method (Admin)

- **Auth**: Required (Admin)
- **Body**:

  ```json
  {
    "methodName": "bKash",
    "description": "Mobile payment service",
    "accountNumber": "01XXXXXXXXX",
    "isActive": true,
    "displayOrder": 1
  }
  ```

- **Response**: Created payment method object

### GET `/payment-methods`

Get all active payment methods

- **Auth**: Not required
- **Query**: None
- **Response**: Array of active payment methods sorted by displayOrder

### GET `/payment-methods/admin/all`

Get all payment methods (Admin)

- **Auth**: Required (Admin)
- **Response**: Array of all payment methods

### GET `/payment-methods/:id`

Get specific payment method (Admin)

- **Auth**: Required (Admin)
- **Params**: `id` - Payment method ID
- **Response**: Payment method details

### PATCH `/payment-methods/:id`

Update payment method (Admin)

- **Auth**: Required (Admin)
- **Params**: `id` - Payment method ID
- **Body**: Partial payment method fields
- **Response**: Updated payment method

### DELETE `/payment-methods/:id`

Delete payment method (Admin)

- **Auth**: Required (Admin)
- **Params**: `id` - Payment method ID
- **Response**: Success message

---

## Transaction Module (`/transactions`)

### POST `/transactions`

Create a transaction after manual payment

- **Auth**: Required (User)
- **Body**:

  ```json
  {
    "orderId": "ORD-1704196800000-a1b2c3d4",
    "paymentMethodId": "method_id",
    "userProvidedTransactionId": "BKH123456789"
  }
  ```

- **Response**: Created transaction object

### GET `/transactions/history/user`

Get user's transaction history

- **Auth**: Required (User)
- **Query**: `?page=1&limit=10`
- **Response**: Paginated array of user's transactions

### GET `/transactions/history/all`

Get all transactions (Admin)

- **Auth**: Required (Admin)
- **Query**: `?page=1&limit=10`
- **Response**: Paginated array of all transactions

### GET `/transactions/:id`

Get specific transaction (Admin)

- **Auth**: Required (Admin)
- **Params**: `id` - Transaction ID
- **Response**: Transaction details with populated payment method

### PATCH `/transactions/:id/status`

Update transaction status (Admin)

- **Auth**: Required (Admin)
- **Params**: `id` - Transaction ID
- **Body**:

  ```json
  {
    "transactionStatus": "completed|failed|cancelled",
    "adminNotes": "Transaction verified successfully"
  }
  ```

- **Response**: Updated transaction
- **Side Effect**: Automatically updates order payment status

### GET `/transactions/order/:orderId`

Get transaction by order ID

- **Auth**: Required (User/Admin)
- **Params**: `orderId` - Order ID
- **Response**: Transaction details for the order

---

## Avatar Module (`/avatars`)

### POST `/avatars/create`

Create a new avatar (Admin only)

- **Auth**: Required (Admin/Super Admin)
- **Body (multipart/form-data)**:

  ```json
  {
    "name": "Avatar Name",
    "image": "<file upload>"
  }
  ```

- **Response**: Created avatar object with imageUrl

### GET `/avatars`

Get all active avatars

- **Auth**: Not required
- **Query**:
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 10)
  - `search` - Search by avatar name
  - `sort` - Sort field and order (e.g., `-createdAt`)
- **Response**: Paginated array of avatars

### GET `/avatars/:id`

Get specific avatar by ID

- **Auth**: Not required
- **Params**: `id` - Avatar ID
- **Response**: Avatar details

### PATCH `/avatars/:id`

Update avatar (Admin only)

- **Auth**: Required (Admin/Super Admin)
- **Params**: `id` - Avatar ID
- **Body (multipart/form-data)**:

  ```json
  {
    "name": "Updated Avatar Name (optional)",
    "image": "<file upload (optional)>",
    "isActive": true
  }
  ```

- **Response**: Updated avatar object

### DELETE `/avatars/:id`

Delete avatar (soft delete) (Admin only)

- **Auth**: Required (Admin/Super Admin)
- **Params**: `id` - Avatar ID
- **Response**: Deleted avatar (sets isActive to false)

---

## User Profile with Avatar

### PATCH `/users/update`

Update user profile (supports both image upload and avatar selection)

- **Auth**: Required (User/Admin/Super Admin)
- **Body (multipart/form-data)**:

  ```json
  {
    "name": "Updated Name (optional)",
    "profilePicture": "<file upload (optional)>",
    "avatarId": "avatar_id (optional)"
  }
  ```

- **Note**:
  - If `profilePicture` is uploaded, `avatarId` will be cleared
  - If `avatarId` is provided, `profilePicture` will be cleared
  - Only one can be used at a time

- **Response**: Updated user profile with avatar details populated

### GET `/users/profile`

Get user profile

- **Auth**: Required (User/Admin/Super Admin)
- **Response**: User profile with avatar details populated if avatarId is set

---

## Data Models Summary

### Cart

```typescript
{
  userId: string (unique)
  items: [
    {
      productId: string
      quantity: number
      price: number
      total: number
    }
  ]
  subtotal: number
  total: number
  createdAt: Date
  updatedAt: Date
}
```

### Order

```typescript
{
  orderId: string (unique, e.g., "ORD-1704196800000-a1b2c3d4")
  userId: string
  items: [
    {
      productId: string
      name: string
      price: number
      quantity: number
      total: number
    }
  ]
  shippingAddress: { street, city, postalCode, country, phoneNumber, label }  // snapshot from address at checkout
  billingAddress: { street, city, postalCode, country, phoneNumber, label }
  subtotal: number
  tax: number (5%)
  shippingCost: number (free if subtotal > 5000, else 100)
  discountCode: string (optional)
  discountAmount: number
  total: number
  paymentMethod: string
  paymentStatus: "pending" | "completed" | "failed"
  orderStatus: "pending" | "processing" | "delivered" | "cancelled"
  createdAt: Date
  updatedAt: Date
}
```

### Review

```typescript
{
  userId: string
  productId: string
  rating: 1-5
  reviewText: string (optional)
  isPublished: boolean
  helpfulCount: number
  createdAt: Date
  updatedAt: Date
  // Composite unique index on (userId, productId)
}
```

### Wishlist

```typescript
{
  userId: string (unique)
  productIds: [string]
  createdAt: Date
  updatedAt: Date
}
```

### Address

```typescript
{
  userId: string
  street: string
  city: string
  postalCode: string
  country: string
  phoneNumber: string (required)
  label: "home" | "office" | "other"
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Coupon

```typescript
{
  code: string (unique, uppercase)
  discountType: "percentage" | "fixed"
  discountValue: number
  validFrom: Date
  validUntil: Date
  maxUses: number
  currentUses: number (auto-incremented)
  minOrderAmount: number
  isActive: boolean
  description: string (optional)
  createdAt: Date
  updatedAt: Date
}
```

### Payment Method

```typescript
{
  _id: ObjectId
  methodName: string (unique)
  description: string
  accountNumber: string
  isActive: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}
```

### Transaction

```typescript
{
  _id: ObjectId
  transactionId: string (unique, auto-generated)
  orderId: string
  userId: string
  paymentMethodId: string
  amount: number
  transactionStatus: "pending" | "completed" | "failed" | "cancelled"
  userProvidedTransactionId: string
  adminNotes: string (optional)
  createdAt: Date
  updatedAt: Date
}
```

### Avatar

```typescript
{
  _id: ObjectId
  name: string (unique)
  imageUrl: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### User

```typescript
{
  _id: ObjectId
  name: string
  emailOrPhone: string (unique)
  password: string (hashed)
  profilePicture: string (optional)
  avatarId: ObjectId (optional, ref: "Avatar")
  role: "USER" | "ADMIN" | "SUPER_ADMIN"
  status: "ACTIVE" | "BLOCKED"
  isDeleted: boolean
  passwordChangedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

---

## Important Business Logic

1. **Cart → Order**: Cart items are snapshotted to order (prices won't change if product price updates)
2. **Order Totals**:
   - Tax: 5% of subtotal
   - Shipping: Free if subtotal > 5000, else 100
   - Discount: Applied after tax and shipping
3. **Reviews & Ratings**: Product ratingAverage and ratingCount update when reviews are published/unpublished
4. **Coupons**:
   - Must be within validFrom/validUntil date range
   - Must not exceed maxUses
   - Order must meet minOrderAmount
5. **Addresses**: Automatically makes first address default; can only have one default at a time
6. **Quantity Checks**: Cart/Order operations check product availability

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description"
}
```

Common status codes:

- **400**: Bad request (validation error, insufficient quantity, etc.)
- **404**: Resource not found
- **401**: Unauthorized (auth required)
- **403**: Forbidden (insufficient permissions)
- **500**: Server error

---

## Implementation Files

### Modules Created/Modified

#### Authentication Module

```
src/modules/auth/
├── auth.interface.ts           - Auth types and JWT payload
├── auth.model.ts               - User schema with password hashing
├── auth.validation.ts          - Zod schemas for login/register
├── auth.service.ts             - Login, registration, token generation
├── auth.controller.ts          - Auth endpoints
└── auth.route.ts               - Auth routes (/auth)
```

#### Product Module

```
src/modules/products/
├── product.interface.ts        - Product types
├── product.model.ts            - Product schema with ratings
├── product.validation.ts       - Zod validation schemas
├── product.service.ts          - CRUD operations, search, filter
├── product.controller.ts       - Product endpoints
└── product.route.ts            - Product routes (/products)
```

#### Cart Module

```
src/modules/cart/
├── cart.interface.ts           - Cart types
├── cart.model.ts               - Cart schema
├── cart.validation.ts          - Zod validation schemas
├── cart.service.ts             - Add, remove, update items
├── cart.controller.ts          - Cart endpoints
└── cart.route.ts               - Cart routes (/carts)
```

#### Order Module

```
src/modules/order/
├── order.interface.ts          - Order types (updated with transactionId)
├── order.model.ts              - Order schema (updated with transactionId)
├── order.validation.ts         - Zod validation schemas
├── order.service.ts            - Create order, update status
├── order.controller.ts         - Order endpoints
└── order.route.ts              - Order routes (/orders)
```

#### Review Module

```
src/modules/review/
├── review.interface.ts         - Review types
├── review.model.ts             - Review schema with helpful count
├── review.validation.ts        - Zod validation schemas
├── review.service.ts           - CRUD, publish/unpublish
├── review.controller.ts        - Review endpoints
└── review.route.ts             - Review routes (/reviews)
```

#### Wishlist Module

```
src/modules/wishlist/
├── wishlist.interface.ts       - Wishlist types
├── wishlist.model.ts           - Wishlist schema
├── wishlist.validation.ts      - Zod validation schemas
├── wishlist.service.ts         - Add, remove, check products
├── wishlist.controller.ts      - Wishlist endpoints
└── wishlist.route.ts           - Wishlist routes (/wishlists)
```

#### Address Module

```
src/modules/address/
├── address.interface.ts        - Address types
├── address.model.ts            - Address schema
├── address.validation.ts       - Zod validation schemas
├── address.service.ts          - CRUD, set default
├── address.controller.ts       - Address endpoints
└── address.route.ts            - Address routes (/addresses)
```

#### Coupon Module

```
src/modules/coupon/
├── coupon.interface.ts         - Coupon types
├── coupon.model.ts             - Coupon schema
├── coupon.validation.ts        - Zod validation schemas
├── coupon.service.ts           - CRUD, validate, apply
├── coupon.controller.ts        - Coupon endpoints
└── coupon.route.ts             - Coupon routes (/coupons)
```

#### Category Module

```
src/modules/category/
├── category.interface.ts       - Category types
├── category.model.ts           - Category schema
├── category.validation.ts      - Zod validation schemas
├── category.service.ts         - CRUD operations
├── category.controller.ts      - Category endpoints
└── category.route.ts           - Category routes (/categories)
```

#### Flash Sale Module

```
src/modules/flash-sale/
├── flash-sale.interface.ts     - Flash sale types
├── flash-sale.model.ts         - Flash sale schema
├── flash-sale.validation.ts    - Zod validation schemas
├── flash-sale.service.ts       - CRUD, active sales
├── flash-sale.controller.ts    - Flash sale endpoints
└── flash-sale.route.ts         - Flash sale routes (/flash-sales)
```

#### Carousel Module

```
src/modules/carousel/
├── carousel.interface.ts       - Carousel types
├── carousel.model.ts           - Carousel schema
├── carousel.validation.ts      - Zod validation schemas
├── carousel.service.ts         - CRUD operations
├── carousel.controller.ts      - Carousel endpoints
└── carousel.route.ts           - Carousel routes (/carousel)
```

#### Payment Method Module (NEW)

```
src/modules/payment-method/
├── payment-method.interface.ts - Payment method types
├── payment-method.model.ts     - Payment method schema
├── payment-method.validation.ts- Zod validation schemas
├── payment-method.service.ts   - CRUD operations
├── payment-method.controller.ts- Payment method endpoints
└── payment-method.route.ts     - Payment method routes (/payment-methods)
```

#### Transaction Module (NEW)

```
src/modules/transaction/
├── transaction.interface.ts    - Transaction types
├── transaction.model.ts        - Transaction schema with indexes
├── transaction.validation.ts   - Zod validation schemas
├── transaction.service.ts      - CRUD, history, status updates
├── transaction.controller.ts   - Transaction endpoints
└── transaction.route.ts        - Transaction routes (/transactions)
```

#### Users Module

```
src/modules/users/
├── users.interface.ts          - User types
├── users.model.ts              - User schema
├── users.validation.ts         - Zod validation schemas
├── users.service.ts            - Profile, email verification
├── users.controller.ts         - User endpoints
└── users.route.ts              - User routes (/users)
```

#### Avatar Module

```
src/modules/avatar/
├── avatar.interface.ts         - Avatar types
├── avatar.model.ts             - Avatar schema
├── avatar.validation.ts        - Zod validation schemas
├── avatar.service.ts           - CRUD operations
├── avatar.controller.ts        - Avatar endpoints
└── avatar.route.ts             - Avatar routes (/avatars)
```

### Core Configuration Files

```
src/
├── app.ts                      - Express app setup, middleware configuration
├── server.ts                   - Server startup and connection
├── DB/index.ts                 - MongoDB connection setup
├── config/index.ts             - Configuration loader
├── constants/
│   ├── folder.constants.ts     - Folder paths and constants
│   └── status.constants.ts     - Order and payment status enums
├── errors/
│   ├── AppError.ts             - Custom error class
│   ├── handleCastError.ts      - MongoDB ObjectId errors
│   ├── handleDuplicateError.ts - Unique constraint errors
│   ├── handleValidationError.ts- Mongoose validation errors
│   └── handleZodError.ts       - Zod validation errors
├── interface/
│   ├── error.ts                - Error response types
│   └── index.d.ts              - Global type definitions
├── middlewares/
│   ├── auth.ts                 - JWT authentication
│   ├── globalErrorHandler.ts   - Error handling middleware
│   ├── notFound.ts             - 404 handler
│   └── validateRequest.ts      - Request validation middleware
├── routes/
│   └── index.ts                - Central route registry
├── types/
│   ├── express.d.ts            - Express types extension
│   └── express.ts              - Express type definitions
└── utils/
    ├── catchAsync.ts           - Async error wrapper
    ├── emailService.ts         - Email sending utility
    ├── imageUpload.ts          - Image upload helper
    ├── multer.ts               - File upload configuration
    ├── sendImageToCloudinary.ts- Cloudinary integration
    ├── sendResponse.ts         - Standardized response formatter
    └── videoUpload.ts          - Video upload helper
```

### File Statistics

- **Total Modules**: 15 (includes Avatar module)
- **Total Module Files**: 90 (6 files per module)
- **Core Files**: 20+ configuration and utility files
- **Lines of Code**: ~3,600+ (with comments and formatting)
- **Test Coverage**: Configured for unit and integration tests

---

## Postman Setup

### Import Collection

1. **Download Postman** from [postman.com](https://www.postman.com/downloads/)
2. **Import Collection**:
   - File → Import
   - Select `documentations/nursery app.postman_collection.json`
   - Click Import

### Environment Setup

Create a new environment in Postman with the following variables:

```json
{
  "baseUrl": "http://localhost:5000/api/v1",
  "token": "",
  "userId": "",
  "productId": "",
  "orderId": "",
  "cartId": "",
  "addressId": "",
  "couponCode": "SAVE20",
  "paymentMethodId": "",
  "transactionId": ""
}
```

### Pre-request Scripts

Add this to the collection's pre-request script to automatically refresh tokens:

```javascript
// Get current timestamp
var currentTimestamp = Math.floor(Date.now() / 1000);

// Check if token is about to expire (within 5 minutes)
if (pm.environment.get("tokenExpiry") && 
    pm.environment.get("tokenExpiry") - currentTimestamp < 300) {
    // Token is about to expire, get a new one
    pm.sendRequest({
        url: pm.environment.get("baseUrl") + "/auth/refresh",
        method: "POST",
        header: {
            "Authorization": "Bearer " + pm.environment.get("token")
        }
    }, function (err, response) {
        if (!err && response.code === 200) {
            var jsonData = response.json();
            pm.environment.set("token", jsonData.data.accessToken);
        }
    });
}
```

### Testing Workflows

#### 1. User Authentication Flow

```
1. POST /auth/register
   - Create new user account
   - Returns: accessToken, user details

2. POST /auth/login
   - Login with email and password
   - Save token to environment
   - Returns: accessToken, user details

3. GET /users/profile
   - Verify token is working
   - Check user profile data
```

#### 2. Product Browse Flow

```
1. GET /products
   - Get all products with pagination
   - Filter by category, price range
   - Search by name

2. GET /products/:productId
   - View product details
   - Check ratings and reviews

3. GET /categories
   - Browse product categories
```

#### 3. Shopping Flow

```
1. GET /carts
   - Retrieve current cart

2. POST /carts/add
   - Add product to cart
   - Body: { productId, quantity }

3. PATCH /carts/:productId
   - Update item quantity

4. POST /orders
   - Create order with selected products from cart
   - Body: { shippingAddressId, selectedProductIds, discountCode, paymentMethod }
   - Note: selectedProductIds is an array of product IDs to order (e.g., ["product1", "product2"])
   - Unselected products remain in cart for future purchases

5. GET /orders/:orderId
   - View order details
```

#### 4. Payment Flow

```
1. GET /payment-methods
   - Get available payment methods (public)

2. POST /transactions
   - Create transaction after manual payment
   - Body: { orderId, paymentMethodId, userProvidedTransactionId }

3. GET /transactions/history/user
   - View transaction history with pagination
```

#### 5. Admin Transaction Management

```
1. GET /transactions/history/all
   - View all transactions (admin only)
   - Pagination: ?page=1&limit=10

2. PATCH /transactions/:id/status
   - Update transaction status
   - Body: { transactionStatus, adminNotes }
   - Triggers order payment status update

3. POST /payment-methods
   - Create new payment method (admin only)
   - Body: { methodName, description, accountNumber, displayOrder }

4. PATCH /payment-methods/:id
   - Update payment method details

5. DELETE /payment-methods/:id
   - Delete payment method
```

### Common Postman Tests

Add to the Tests tab for automated verification:

```javascript
// Check response status
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Verify response structure
pm.test("Response has required fields", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("success");
    pm.expect(jsonData).to.have.property("data");
    pm.expect(jsonData).to.have.property("message");
});

// Save response data to environment
pm.test("Save token to environment", function () {
    var jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.accessToken) {
        pm.environment.set("token", jsonData.data.accessToken);
    }
});

// Validate token is JWT format
pm.test("Token is valid JWT", function () {
    var token = pm.environment.get("token");
    var jwtRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    pm.expect(token).to.match(jwtRegex);
});
```

### Running Collections as Tests

Execute automated tests:

```bash
npm install -g newman
newman run "documentations/nursery app.postman_collection.json" \
  -e "path/to/environment.json" \
  --reporters cli,json \
  --reporter-json-export "test-results.json"
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| **401 Unauthorized** | Ensure token is valid and not expired; re-login |
| **403 Forbidden** | Check user role; admin endpoints require ADMIN role |
| **404 Not Found** | Verify endpoint URL and resource ID exist |
| **400 Bad Request** | Validate request body matches schema in API docs |
| **500 Server Error** | Check server logs; verify MongoDB connection |

---

## Implementation Summary

### Architecture Pattern

This API follows a **Service-Controller-Route** (SCR) layered architecture:

- **Routes Layer**: Defines HTTP endpoints with authentication/validation middleware
- **Controller Layer**: Handles HTTP request/response, calls services
- **Service Layer**: Contains business logic and database operations
- **Model Layer**: Mongoose schemas with validation hooks
- **Interface Layer**: TypeScript types for type safety
- **Validation Layer**: Zod runtime validation schemas

### Database Design

- **MongoDB** for NoSQL document storage
- **Mongoose** for ODM with schema validation
- **Indexes** on frequently queried fields (userId, productId, status, etc.)
- **Unique constraints** for emails, product codes, transaction IDs
- **Post-hooks** for automatic error handling and data transformations

### Features Implemented

✅ User Authentication (JWT-based)
✅ Product Catalog (Browse, search, filter)
✅ Shopping Cart (Add, update, remove items)
✅ Order Management (Create, track, cancel)
✅ Payment Methods (Admin-managed)
✅ Transaction Tracking (User and admin views)
✅ Reviews & Ratings (Publish/unpublish)
✅ Wishlist (Save favorites)
✅ Coupons & Discounts (Validation and application)
✅ Address Management (Multiple addresses, defaults)
✅ Admin Dashboard (Transaction verification, payment method management)
✅ Email Notifications (Registration, password reset, order status)

### Security Implementation

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Different permissions for USER and ADMIN
- **Input Validation**: Zod schemas validate all inputs
- **Error Handling**: Secure error messages without exposing system details
- **Database Constraints**: Unique indexes, validation hooks
- **Password Hashing**: bcrypt for secure password storage
- **CORS Protection**: Configured for specific origins

### Performance Optimizations

- **Database Indexing**: Indexes on userId, productId, status fields
- **Pagination**: Limit results to improve query performance
- **Caching**: Environment-based caching for static data
- **Lazy Loading**: Product images via Cloudinary CDN
- **Connection Pooling**: MongoDB connection optimization
- **Async/Await**: Non-blocking operations

### Code Quality

- **TypeScript**: Strict type checking, no `any` types
- **Linting**: ESLint configured for code standards
- **Formatting**: Prettier for consistent code style
- **Error Handling**: Comprehensive error catching and logging
- **Comments**: Well-documented code and functions
- **Testing**: Unit and integration test configuration

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2026 | Initial release with all core features |
| | | Added payment system (payment-method & transaction modules) |
| | | Complete API documentation |
| | | Postman collection |

---

## Support & Contact

For issues, feature requests, or support:

- **Repository**: [GitHub Link]
- **Issues**: Create issue in GitHub repository
- **Email**: <support@nursery-shop.com>
- **Documentation**: See `documentations/` folder

---

**Generated**: January 2026  
**Maintained by**: Development Team  
**Last Review**: January 22, 2026
