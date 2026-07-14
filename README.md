# Yuricart Backend API

Express + MongoDB API for the Yuricart ecommerce platform.

## Setup

```bash
cd backend
cp .env.example .env
# Set MONGODB_URI and JWT_SECRET (min 16 chars)

npm install
npm run seed:admin
npm run dev
```

Base URL (local): `http://localhost:5000/api/v1`

## Response format

**Success**
```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

**Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {}
}
```

---

## Public APIs (storefront)

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List active products |
| GET | `/products/:slug` | Single product by slug |
| GET | `/products/:slug/related` | Related products |
| GET | `/categories/:slug/products` | Products in category |

**Query params for `/products` and `/categories/:slug/products`**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Text search (title, description, tags) |
| `category` | string | Category ID or slug |
| `brand` | string | Brand ID or slug |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `featured` | boolean | `true` / `false` |
| `newArrival` | boolean | `true` / `false` |
| `bestSeller` | boolean | `true` / `false` |
| `tags` | string | Comma-separated tags |
| `sort` | string | `createdAt_desc`, `createdAt_asc`, `price_asc`, `price_desc`, `title_asc`, `title_desc` |
| `page` | number | Page number (default 1) |
| `limit` | number | Items per page (default 20, max 100) |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List active categories |
| GET | `/categories/:slug` | Single category |

**Query params:** `q`, `sort`, `page`, `limit`

### Brands
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/brands` | List active brands |
| GET | `/brands/:slug` | Single brand |

**Query params:** `q`, `sort`, `page`, `limit`

### Banners
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/banners` | List active banners |
| GET | `/banners/:slug` | Single banner |

**Query params:** `placement` (`hero` \| `promo`), `sort`, `page`, `limit`

### Customer Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Customer registration (sets `customer_token` cookie) |
| POST | `/auth/login` | Customer login |
| POST | `/auth/logout` | Clear customer cookie |
| GET | `/auth/me` | Current customer profile (auth required) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders` | Create order (guest or optional `customer_token` auth) |
| GET | `/orders/track/:orderNumber?email=` | Guest order tracking |
| GET | `/orders/my` | Customer order history (auth required) |

**Create order body:** `customerName`, `email`, `phone`, `address`, `city`, `items[]`, `paymentMethod` (`cod` \| `whatsapp` \| `mpesa` \| `card`), optional `county`, `postalCode`, `couponCode`, `notes`, `shippingRegion`

### Coupons
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/coupons/validate` | Validate coupon code and return discount |

**Body:** `code`, `subtotal`

---

## Admin APIs (JWT required)

Login first to get a token, then pass `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/auth/login` | Admin login |
| POST | `/admin/auth/logout` | Logout |
| GET | `/admin/auth/me` | Current admin |

### Products CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/products` | List products (all statuses) |
| GET | `/admin/products/:id` | Get by ID |
| POST | `/admin/products` | Create product |
| PATCH | `/admin/products/:id` | Update product |
| DELETE | `/admin/products/:id` | Delete product |

**Admin list filters:** all public filters + `status` (`draft`, `active`, `archived`)

### Categories CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/categories` | List categories |
| GET | `/admin/categories/:id` | Get by ID |
| POST | `/admin/categories` | Create category |
| PATCH | `/admin/categories/:id` | Update category |
| DELETE | `/admin/categories/:id` | Delete category |

### Brands CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/brands` | List brands |
| GET | `/admin/brands/:id` | Get by ID |
| POST | `/admin/brands` | Create brand |
| PATCH | `/admin/brands/:id` | Update brand |
| DELETE | `/admin/brands/:id` | Delete brand |

### Banners CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/banners` | List banners |
| GET | `/admin/banners/:id` | Get by ID |
| POST | `/admin/banners` | Create banner |
| PATCH | `/admin/banners/:id` | Update banner |
| DELETE | `/admin/banners/:id` | Delete banner |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Stats: orders, revenue, products, customers |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/orders` | List orders with filters |
| GET | `/admin/orders/:id` | Order detail |
| PATCH | `/admin/orders/:id` | Update status, tracking, payment |

**Admin list filters:** `q`, `orderStatus`, `paymentStatus`, `paymentMethod`, `from`, `to`, `sort`, `page`, `limit`

### Coupons CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/coupons` | List coupons |
| GET | `/admin/coupons/:id` | Get by ID |
| POST | `/admin/coupons` | Create coupon |
| PATCH | `/admin/coupons/:id` | Update coupon |
| DELETE | `/admin/coupons/:id` | Delete coupon |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/customers` | List customers |
| PATCH | `/admin/customers/:id` | Block/unblock customer (`status`: `active` \| `blocked`) |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/settings?group=` | Get settings (all groups or by group) |
| PATCH | `/admin/settings` | Upsert settings array |

### Shipping CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/shipping` | List shipping rules |
| GET | `/admin/shipping/:id` | Get by ID |
| POST | `/admin/shipping` | Create shipping rule |
| PATCH | `/admin/shipping/:id` | Update shipping rule |
| DELETE | `/admin/shipping/:id` | Delete shipping rule |

---

## Slug generation

If `slug` is omitted on create, it is auto-generated from `title` or `name`. Duplicate slugs get a numeric suffix (`laptop`, `laptop-1`, …).

## Images

Store image URLs directly in `images[]` (products), `image` (categories/banners), or `logo` (brands). Cloudinary upload is optional and will be added later.

---

## Test commands (curl)

Replace `TOKEN` after admin login.

```bash
# Health
curl http://localhost:5000/api/v1/health

# Admin login
curl -X POST http://localhost:5000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@yuricart.com\",\"password\":\"ChangeMe123!\"}"

# Save token from response, then:
export TOKEN="your-jwt-token"

# Create category
curl -X POST http://localhost:5000/api/v1/admin/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Phones\",\"status\":\"active\",\"sortOrder\":1}"

# Create brand
curl -X POST http://localhost:5000/api/v1/admin/brands \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Samsung\",\"status\":\"active\"}"

# Create product (replace CATEGORY_ID and BRAND_ID)
curl -X POST http://localhost:5000/api/v1/admin/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Samsung Galaxy A15\",\"price\":25000,\"stock\":10,\"status\":\"active\",\"category\":\"CATEGORY_ID\",\"brand\":\"BRAND_ID\",\"images\":[{\"url\":\"https://example.com/phone.jpg\",\"isPrimary\":true}],\"featured\":true}"

# Create banner
curl -X POST http://localhost:5000/api/v1/admin/banners \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Summer Sale\",\"image\":\"https://example.com/banner.jpg\",\"placement\":\"hero\",\"status\":\"active\",\"sortOrder\":1}"

# Public list products
curl "http://localhost:5000/api/v1/products?page=1&limit=10&sort=price_asc"

# Public search
curl "http://localhost:5000/api/v1/products?q=samsung&featured=true"

# Public category products
curl "http://localhost:5000/api/v1/categories/phones/products"

# Public single product
curl http://localhost:5000/api/v1/products/samsung-galaxy-a15

# Public categories
curl http://localhost:5000/api/v1/categories

# Public banners (hero only)
curl "http://localhost:5000/api/v1/banners?placement=hero"

# Admin list with filters
curl "http://localhost:5000/api/v1/admin/products?status=active&page=1" \
  -H "Authorization: Bearer $TOKEN"

# Customer register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jane Doe\",\"email\":\"jane@example.com\",\"password\":\"SecurePass1!\"}"

# Create order (guest)
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d "{\"customerName\":\"Jane Doe\",\"email\":\"jane@example.com\",\"phone\":\"0712345678\",\"address\":\"123 Main St\",\"city\":\"Nairobi\",\"items\":[{\"productId\":\"PRODUCT_ID\",\"quantity\":1}],\"paymentMethod\":\"cod\"}"

# Track order
curl "http://localhost:5000/api/v1/orders/track/YC-20250613-0001?email=jane@example.com"

# Validate coupon
curl -X POST http://localhost:5000/api/v1/coupons/validate \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"SAVE10\",\"subtotal\":5000}"

# Admin dashboard
curl http://localhost:5000/api/v1/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Production server |
| `npm run seed:admin` | Create initial admin user |

## PM2

```bash
npm run build
pm2 start ecosystem.config.js
```

## Notes

- Wix storefront is **unchanged** — these APIs run in parallel until frontend migration.
- Customer auth uses `customer_token` HTTP-only cookie (or `Authorization: Bearer` header).
- Order numbers are auto-generated as `YC-YYYYMMDD-####`.
- Admin UI at `/admin` will be built after backend verification.
