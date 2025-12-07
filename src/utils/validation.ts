import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

// ===============================
// Validation Middleware
// ===============================

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new AppError(`Validation error: ${messages}`, 400));
      } else {
        next(error);
      }
    }
  };
};

// ===============================
// Category Schemas
// ===============================

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().max(500).optional(),
  imagePublicId: z.string().max(200).optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ===============================
// Product Schemas
// ===============================

export const productImageSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
  alt: z.string().max(200).optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  price: z.number().positive('Price must be positive').max(10000000, 'Price too high'),
  originalPrice: z.number().positive().max(10000000).optional().nullable(),
  categoryId: z.string().cuid('Invalid category ID'),
  colorId: z.string().cuid('Invalid color ID'),
  fabric: z.string().min(2).max(100),
  work: z.string().min(2).max(100),
  occasion: z.string().min(2).max(100),
  stock: z.number().int().min(0).max(10000).default(0),
  featured: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  images: z.array(productImageSchema).max(20).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().positive().max(10000000).optional(),
  originalPrice: z.number().positive().max(10000000).optional().nullable(),
  categoryId: z.string().cuid().optional(),
  colorId: z.string().cuid().optional(),
  fabric: z.string().min(2).max(100).optional(),
  work: z.string().min(2).max(100).optional(),
  occasion: z.string().min(2).max(100).optional(),
  stock: z.number().int().min(0).max(10000).optional(),
  featured: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ===============================
// Color Schemas
// ===============================

export const createColorSchema = z.object({
  name: z.string().min(2).max(50),
  hexCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color code').optional(),
});

// ===============================
// Order Schemas
// ===============================

export const createOrderSchema = z.object({
  addressId: z.string().cuid('Invalid address ID'),
  paymentMethod: z.enum(['COD', 'ONLINE', 'UPI']).optional(),
  notes: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional().nullable(),
  discount: z.number().int().min(0).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']),
});

// ===============================
// Review Schemas
// ===============================

export const createReviewSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().min(10, 'Review must be at least 10 characters').max(2000),
  images: z.array(z.string().url()).max(5).optional(),
});

// ===============================
// Address Schemas
// ===============================

export const createAddressSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits'),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

// ===============================
// Image Upload Schema
// ===============================

export const uploadImageSchema = z.object({
  folder: z.string().max(100).optional(),
});
