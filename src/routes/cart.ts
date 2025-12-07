import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get cart
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user!.userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            color: { select: { name: true } }
          }
        }
      }
    });

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    res.json({
      success: true,
      data: {
        items: cartItems,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        shipping: subtotal > 500000 ? 0 : 50000, // Free shipping above ₹5000
        total: subtotal + (subtotal > 500000 ? 0 : 50000)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Add to cart
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Check product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.stock < quantity) {
      throw new AppError(`Only ${product.stock} items available`, 400);
    }

    // Upsert cart item
    const cartItem = await prisma.cartItem.upsert({
      where: {
        userId_productId: {
          userId: req.user!.userId,
          productId
        }
      },
      update: {
        quantity: { increment: quantity }
      },
      create: {
        userId: req.user!.userId,
        productId,
        quantity
      },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 }
          }
        }
      }
    });

    // Check if updated quantity exceeds stock
    if (cartItem.quantity > product.stock) {
      await prisma.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity: product.stock }
      });
      throw new AppError(`Only ${product.stock} items available`, 400);
    }

    res.json({
      success: true,
      data: cartItem
    });
  } catch (error) {
    next(error);
  }
});

// Update cart item quantity
router.patch('/:productId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      // Remove item if quantity is 0 or less
      await prisma.cartItem.delete({
        where: {
          userId_productId: {
            userId: req.user!.userId,
            productId
          }
        }
      });

      return res.json({
        success: true,
        message: 'Item removed from cart'
      });
    }

    // Check stock
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (product.stock < quantity) {
      throw new AppError(`Only ${product.stock} items available`, 400);
    }

    const cartItem = await prisma.cartItem.update({
      where: {
        userId_productId: {
          userId: req.user!.userId,
          productId
        }
      },
      data: { quantity },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 }
          }
        }
      }
    });

    res.json({
      success: true,
      data: cartItem
    });
  } catch (error) {
    next(error);
  }
});

// Remove from cart
router.delete('/:productId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;

    await prisma.cartItem.delete({
      where: {
        userId_productId: {
          userId: req.user!.userId,
          productId
        }
      }
    });

    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    next(error);
  }
});

// Clear cart
router.delete('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user!.userId }
    });

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
