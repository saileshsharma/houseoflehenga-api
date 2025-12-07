import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const stores: { [key: string]: RateLimitStore } = {};

/**
 * Simple in-memory rate limiting middleware
 * For production, use Redis-based solution
 */
export const createRateLimiter = (options: {
  windowMs: number;      // Time window in milliseconds
  max: number;           // Max requests per window
  message?: string;      // Error message
  keyGenerator?: (req: Request) => string;  // Custom key generator
  name?: string;         // Store name for different limits
}) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => req.ip || 'unknown',
    name = 'default'
  } = options;

  // Initialize store for this limiter
  if (!stores[name]) {
    stores[name] = {};
  }
  const store = stores[name];

  // Clean up expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const key in store) {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      store[key].count++;
    }

    const remaining = Math.max(0, max - store[key].count);
    const resetTime = Math.ceil(store[key].resetTime / 1000);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (store[key].count > max) {
      res.setHeader('Retry-After', Math.ceil((store[key].resetTime - now) / 1000));
      return res.status(429).json({
        success: false,
        error: message
      });
    }

    next();
  };
};

// Pre-configured rate limiters for different use cases
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per 15 minutes
  name: 'general',
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 login attempts per 15 minutes (increased for development)
  name: 'auth',
  message: 'Too many login attempts, please try again later'
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,       // 1 minute
  max: 60,                    // 60 requests per minute
  name: 'api',
  message: 'API rate limit exceeded, please slow down'
});

export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,                    // 20 uploads per hour
  name: 'upload',
  message: 'Upload limit exceeded, please try again later'
});
