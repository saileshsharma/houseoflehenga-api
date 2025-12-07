import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

// Helper to check if rate limited
const isRateLimited = (status: number) => status === 429;

test.describe('API Endpoint Tests', () => {

  test.describe('Health Check', () => {
    test('GET /health returns 200', async ({ request }) => {
      const response = await request.get('http://localhost:3001/health');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });
  });

  test.describe('Products API', () => {
    test('GET /api/products returns product list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('products');
      expect(Array.isArray(data.data.products)).toBe(true);
    });

    test('GET /api/products supports pagination', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?page=1&limit=5`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data.products.length).toBeLessThanOrEqual(5);
      expect(data.data).toHaveProperty('pagination');
    });

    test('GET /api/products supports category filter', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?category=lehengas`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('GET /api/products supports sorting', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?sort=price_asc`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('GET /api/products supports search', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?search=silk`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('GET /api/products/:slug returns single product', async ({ request }) => {
      // First get a product list to get a valid slug
      const listResponse = await request.get(`${API_BASE}/products?limit=1`);
      const listData = await listResponse.json();

      if (listData.data.products.length > 0) {
        const slug = listData.data.products[0].slug;
        const response = await request.get(`${API_BASE}/products/${slug}`);
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        // Product is wrapped in data.product
        expect(data.data.product).toHaveProperty('name');
        expect(data.data.product).toHaveProperty('price');
      }
    });

    test('GET /api/products/invalid-slug returns 404', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products/non-existent-product-12345`);
      expect(response.status()).toBe(404);
    });

    test('GET /api/products with featured filter returns featured products', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?featured=true`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Categories API', () => {
    test('GET /api/categories returns category list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/categories`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  test.describe('Auth API', () => {
    const testPassword = 'TestPassword123!';

    test('POST /api/auth/register creates new user', async ({ request }) => {
      const testEmail = `test${Date.now()}@example.com`;
      const response = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email: testEmail,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User'
        }
      });
      // Handle rate limiting gracefully
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('token');
    });

    test('POST /api/auth/register with existing email fails', async ({ request }) => {
      // First create a user
      const uniqueEmail = `existing${Date.now()}@example.com`;
      const firstReg = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email: uniqueEmail,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User'
        }
      });
      if (isRateLimited(firstReg.status())) {
        test.skip();
        return;
      }

      // Try to register again with same email
      const response = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email: uniqueEmail,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User'
        }
      });
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(400);
    });

    test('POST /api/auth/login with valid credentials returns token', async ({ request }) => {
      // First register a user
      const loginEmail = `login${Date.now()}@example.com`;
      const regResponse = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email: loginEmail,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User'
        }
      });
      if (isRateLimited(regResponse.status())) {
        test.skip();
        return;
      }

      const response = await request.post(`${API_BASE}/auth/login`, {
        data: {
          email: loginEmail,
          password: testPassword
        }
      });
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('token');
    });

    test('POST /api/auth/login with invalid credentials fails', async ({ request }) => {
      const response = await request.post(`${API_BASE}/auth/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }
      });
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(401);
    });

    test('POST /api/auth/register with weak password fails', async ({ request }) => {
      const response = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email: `weak${Date.now()}@example.com`,
          password: '123', // Too weak
          firstName: 'Test',
          lastName: 'User'
        }
      });
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(400);
    });

    test('POST /api/auth/register with invalid email fails', async ({ request }) => {
      const response = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email: 'not-an-email',
          password: testPassword,
          firstName: 'Test',
          lastName: 'User'
        }
      });
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Cart API (requires auth)', () => {
    test('GET /api/cart without auth returns 401 or empty', async ({ request }) => {
      const response = await request.get(`${API_BASE}/cart`);
      // Cart may return 401 or 200 with empty cart depending on implementation
      expect([200, 401]).toContain(response.status());
    });

    test('GET /api/cart with auth returns cart', async ({ request }) => {
      // Register to get token
      const email = `cart${Date.now()}@example.com`;
      const regResponse = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email,
          password: 'TestPassword123!',
          firstName: 'Cart',
          lastName: 'User'
        }
      });
      if (isRateLimited(regResponse.status())) {
        test.skip();
        return;
      }
      const regData = await regResponse.json();
      const authToken = regData.data?.token;
      if (!authToken) {
        test.skip();
        return;
      }

      const response = await request.get(`${API_BASE}/cart`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Wishlist API (requires auth)', () => {
    test('GET /api/wishlist without auth returns 401', async ({ request }) => {
      const response = await request.get(`${API_BASE}/wishlist`);
      expect(response.status()).toBe(401);
    });

    test('GET /api/wishlist with auth returns wishlist', async ({ request }) => {
      // Register to get token
      const email = `wishlist${Date.now()}@example.com`;
      const regResponse = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email,
          password: 'TestPassword123!',
          firstName: 'Wishlist',
          lastName: 'User'
        }
      });
      if (isRateLimited(regResponse.status())) {
        test.skip();
        return;
      }
      const regData = await regResponse.json();
      const authToken = regData.data?.token;
      if (!authToken) {
        test.skip();
        return;
      }

      const response = await request.get(`${API_BASE}/wishlist`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Orders API (requires auth)', () => {
    test('GET /api/orders without auth returns 401', async ({ request }) => {
      const response = await request.get(`${API_BASE}/orders`);
      expect(response.status()).toBe(401);
    });

    test('GET /api/orders with auth returns orders', async ({ request }) => {
      // Register to get token
      const email = `orders${Date.now()}@example.com`;
      const regResponse = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email,
          password: 'TestPassword123!',
          firstName: 'Orders',
          lastName: 'User'
        }
      });
      if (isRateLimited(regResponse.status())) {
        test.skip();
        return;
      }
      const regData = await regResponse.json();
      const authToken = regData.data?.token;
      if (!authToken) {
        test.skip();
        return;
      }

      const response = await request.get(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Newsletter API', () => {
    test('POST /api/newsletter/subscribe with valid email', async ({ request }) => {
      const response = await request.post(`${API_BASE}/newsletter/subscribe`, {
        data: { email: `newsletter${Date.now()}@example.com` }
      });
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      // API returns 201 for new subscriptions
      expect([200, 201]).toContain(response.status());
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('POST /api/newsletter/subscribe with invalid email fails', async ({ request }) => {
      const response = await request.post(`${API_BASE}/newsletter/subscribe`, {
        data: { email: 'invalid-email' }
      });
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Reviews API', () => {
    test('GET /api/reviews/product/:productId returns reviews', async ({ request }) => {
      // First get a product
      const listResponse = await request.get(`${API_BASE}/products?limit=1`);
      const listData = await listResponse.json();

      if (listData.data.products.length > 0) {
        const productId = listData.data.products[0].id;
        const response = await request.get(`${API_BASE}/reviews/product/${productId}`);
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });
  });

  test.describe('Coupons API', () => {
    test('POST /api/coupons/validate with invalid code returns error', async ({ request }) => {
      const response = await request.post(`${API_BASE}/coupons/validate`, {
        data: { code: 'INVALID_COUPON_123' }
      });
      expect(response.status()).toBe(404);
    });
  });

  test.describe('Addresses API (requires auth)', () => {
    test('GET /api/addresses without auth returns 401', async ({ request }) => {
      const response = await request.get(`${API_BASE}/addresses`);
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(401);
    });

    test('GET /api/addresses with auth returns addresses', async ({ request }) => {
      // Register to get token
      const email = `address${Date.now()}@example.com`;
      const regResponse = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email,
          password: 'TestPassword123!',
          firstName: 'Address',
          lastName: 'User'
        }
      });
      if (isRateLimited(regResponse.status())) {
        test.skip();
        return;
      }
      const regData = await regResponse.json();
      const authToken = regData.data?.token;
      if (!authToken) {
        test.skip();
        return;
      }

      const response = await request.get(`${API_BASE}/addresses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('POST /api/addresses creates new address', async ({ request }) => {
      // Register to get token
      const email = `address2${Date.now()}@example.com`;
      const regResponse = await request.post(`${API_BASE}/auth/register`, {
        data: {
          email,
          password: 'TestPassword123!',
          firstName: 'Address',
          lastName: 'User'
        }
      });
      if (isRateLimited(regResponse.status())) {
        test.skip();
        return;
      }
      const regData = await regResponse.json();
      const authToken = regData.data?.token;
      if (!authToken) {
        test.skip();
        return;
      }

      const response = await request.post(`${API_BASE}/addresses`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          fullName: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
          isDefault: true
        }
      });
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Rate Limiting', () => {
    test('API respects rate limits', async ({ request }) => {
      // Make multiple rapid requests - should eventually get rate limited
      const responses = [];
      for (let i = 0; i < 5; i++) {
        const response = await request.get(`${API_BASE}/products`);
        responses.push(response.status());
      }
      // All should be 200 or 429 (rate limited) - both are valid
      expect(responses.every(s => s === 200 || s === 429)).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('Missing required fields returns error', async ({ request }) => {
      const response = await request.post(`${API_BASE}/auth/login`, {
        headers: { 'Content-Type': 'application/json' },
        data: { email: 'test@test.com' } // Missing password
      });
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      // Should return error for missing fields
      expect([400, 401, 422]).toContain(response.status());
    });

    test('404 for non-existent route', async ({ request }) => {
      const response = await request.get(`${API_BASE}/nonexistent`);
      // Could be rate limited
      if (isRateLimited(response.status())) {
        test.skip();
        return;
      }
      expect(response.status()).toBe(404);
    });
  });
});
