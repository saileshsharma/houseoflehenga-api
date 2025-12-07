import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get wishlist
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            color: { select: { name: true } },
            category: { select: { name: true, slug: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: wishlistItems
    });
  } catch (error) {
    next(error);
  }
});

// Add to wishlist
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.body;

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: req.user!.userId,
          productId
        }
      }
    });

    if (existing) {
      throw new AppError('Product already in wishlist', 400);
    }

    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId: req.user!.userId,
        productId
      },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: wishlistItem
    });
  } catch (error) {
    next(error);
  }
});

// Remove from wishlist
router.delete('/:productId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    await prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId: req.user!.userId,
          productId
        }
      }
    });

    res.json({
      success: true,
      message: 'Removed from wishlist'
    });
  } catch (error) {
    next(error);
  }
});

// Move item from wishlist to cart
router.post('/:productId/move-to-cart', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    // Check product stock
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.stock < 1) {
      throw new AppError('Product is out of stock', 400);
    }

    // Add to cart
    await prisma.cartItem.upsert({
      where: {
        userId_productId: {
          userId: req.user!.userId,
          productId
        }
      },
      update: {
        quantity: { increment: 1 }
      },
      create: {
        userId: req.user!.userId,
        productId,
        quantity: 1
      }
    });

    // Remove from wishlist
    await prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId: req.user!.userId,
          productId
        }
      }
    });

    res.json({
      success: true,
      message: 'Moved to cart'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
