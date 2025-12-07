import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

// Validate a coupon code
router.post('/validate', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, subtotal } = req.body;
    const userId = req.user?.userId;

    if (!code) {
      throw new AppError('Coupon code is required', 400);
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon) {
      throw new AppError('Invalid coupon code', 404);
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      throw new AppError('This coupon is no longer active', 400);
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom) {
      throw new AppError('This coupon is not yet valid', 400);
    }
    if (now > coupon.validTo) {
      throw new AppError('This coupon has expired', 400);
    }

    // Check total usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new AppError('This coupon has reached its usage limit', 400);
    }

    // Check per-user limit if user is authenticated
    if (userId) {
      const userUsageCount = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId
        }
      });

      if (userUsageCount >= coupon.perUserLimit) {
        throw new AppError('You have already used this coupon', 400);
      }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && subtotal && subtotal < coupon.minOrderAmount) {
      const minAmount = (coupon.minOrderAmount / 100).toLocaleString('en-IN');
      throw new AppError(`Minimum order amount of Rs ${minAmount} required for this coupon`, 400);
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((subtotal || 0) * coupon.discountValue / 100);
      // Apply max discount cap if set
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // Fixed amount discount
      discountAmount = coupon.discountValue;
    }

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        minOrderAmount: coupon.minOrderAmount
      },
      discountAmount,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Apply coupon (record usage) - called when order is placed
router.post('/apply', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, orderId } = req.body;
    const userId = req.user!.userId;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon) {
      throw new AppError('Invalid coupon code', 404);
    }

    // Record usage
    await prisma.$transaction([
      prisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId,
          orderId
        }
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { usageCount: { increment: 1 } }
      })
    ]);

    res.json({
      success: true,
      message: 'Coupon applied to order'
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Create coupon
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      perUserLimit,
      validFrom,
      validTo
    } = req.body;

    // Validate required fields
    if (!code || !discountValue || !validTo) {
      throw new AppError('Code, discountValue, and validTo are required', 400);
    }

    // Check if code already exists
    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existing) {
      throw new AppError('Coupon code already exists', 400);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType: discountType || 'PERCENTAGE',
        discountValue,
        minOrderAmount,
        maxDiscount,
        usageLimit,
        perUserLimit: perUserLimit || 1,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validTo: new Date(validTo)
      }
    });

    res.status(201).json({
      success: true,
      coupon
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all coupons
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      coupons
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Update coupon
router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating the code
    delete updateData.code;
    delete updateData.usageCount;

    if (updateData.validFrom) {
      updateData.validFrom = new Date(updateData.validFrom);
    }
    if (updateData.validTo) {
      updateData.validTo = new Date(updateData.validTo);
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      coupon
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete coupon
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.coupon.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Coupon deleted'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
