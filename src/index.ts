import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import colorRoutes from './routes/colors';
import cartRoutes from './routes/cart';
import wishlistRoutes from './routes/wishlist';
import orderRoutes from './routes/orders';
import imageRoutes from './routes/images';
import reviewRoutes from './routes/reviews';
import couponRoutes from './routes/coupons';
import newsletterRoutes from './routes/newsletter';
import addressRoutes from './routes/addresses';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter, authLimiter, apiLimiter, uploadLimiter } from './middleware/rateLimit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes with specific rate limits
app.use('/api/auth', authLimiter, authRoutes);           // Strict limit for auth
app.use('/api/products', apiLimiter, productRoutes);     // API limit
app.use('/api/categories', apiLimiter, categoryRoutes);  // API limit
app.use('/api/colors', apiLimiter, colorRoutes);         // Colors API
app.use('/api/cart', apiLimiter, cartRoutes);            // API limit
app.use('/api/wishlist', apiLimiter, wishlistRoutes);    // API limit
app.use('/api/orders', apiLimiter, orderRoutes);         // API limit
app.use('/api/images', uploadLimiter, imageRoutes);      // Upload limit
app.use('/api/reviews', apiLimiter, reviewRoutes);       // Reviews API
app.use('/api/coupons', apiLimiter, couponRoutes);       // Coupons API
app.use('/api/newsletter', apiLimiter, newsletterRoutes); // Newsletter API
app.use('/api/addresses', apiLimiter, addressRoutes);     // Addresses API
app.use('/api/admin', apiLimiter, adminRoutes);            // Admin API

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 House of Lehenga API running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
