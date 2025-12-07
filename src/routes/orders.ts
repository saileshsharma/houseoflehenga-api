import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';
import { generateOrderNumber } from '../utils/helpers';
import { validate, createOrderSchema, updateOrderStatusSchema } from '../utils/validation';
import { sendOrderConfirmation, sendShippingUpdate, sendDeliveryConfirmation } from '../utils/email';

const router = Router();

// Get user's orders
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 }
              }
            }
          }
        },
        shippingAddress: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
});

// Get single order
router.get('/:orderNumber', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                color: { select: { name: true } }
              }
            }
          }
        },
        shippingAddress: true,
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check ownership (unless admin)
    if (order.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new AppError('Unauthorized', 403);
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// Create order from cart
router.post('/', authenticate, validate(createOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addressId, paymentMethod, notes, couponCode, discount } = req.body;

    // Get cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user!.userId },
      include: { product: true }
    });

    if (cartItems.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: req.user!.userId
      }
    });

    if (!address) {
      throw new AppError('Address not found', 404);
    }

    // Check stock and calculate totals
    let subtotal = 0;
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        throw new AppError(`${item.product.name} only has ${item.product.stock} items in stock`, 400);
      }
      subtotal += item.product.price * item.quantity;
    }

    const shippingCost = subtotal > 500000 ? 0 : 50000; // Free shipping above ₹5000
    const discountAmount = discount || 0;
    const total = subtotal + shippingCost - discountAmount;

    // Create order
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: req.user!.userId,
          addressId,
          paymentMethod,
          notes,
          subtotal,
          shippingCost,
          discount: discountAmount,
          couponCode: couponCode || null,
          total,
          items: {
            create: cartItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price
            }))
          }
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 }
                }
              }
            }
          },
          shippingAddress: true
        }
      });

      // Update stock
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { userId: req.user!.userId }
      });

      // Record coupon usage if a coupon was applied
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() }
        });
        if (coupon) {
          await tx.couponUsage.create({
            data: {
              couponId: coupon.id,
              userId: req.user!.userId,
              orderId: newOrder.id
            }
          });
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usageCount: { increment: 1 } }
          });
        }
      }

      return newOrder;
    });

    // Send order confirmation email (async, don't wait)
    sendOrderConfirmation(order.id).catch(err => {
      console.error('Failed to send order confirmation email:', err);
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// Cancel order
router.post('/:orderNumber/cancel', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== req.user!.userId) {
      throw new AppError('Unauthorized', 403);
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new AppError('Order cannot be cancelled at this stage', 400);
    }

    // Cancel order and restore stock
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { orderNumber },
        data: { status: 'CANCELLED' }
      });

      // Restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }
    });

    res.json({
      success: true,
      message: 'Order cancelled'
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Update order status
router.patch('/:orderNumber/status', authenticate, requireAdmin, validate(updateOrderStatusSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;
    const { status, paymentStatus, trackingNumber } = req.body;

    const order = await prisma.order.update({
      where: { orderNumber },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(trackingNumber && { trackingNumber })
      },
      include: {
        items: {
          include: { product: true }
        },
        shippingAddress: true,
        user: { select: { email: true, firstName: true } }
      }
    });

    // Send email notifications based on status change
    if (status === 'SHIPPED') {
      sendShippingUpdate(order.id, trackingNumber).catch(err => {
        console.error('Failed to send shipping update email:', err);
      });
    } else if (status === 'DELIVERED') {
      sendDeliveryConfirmation(order.id).catch(err => {
        console.error('Failed to send delivery confirmation email:', err);
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all orders
router.get('/admin/all', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: { include: { product: true } },
          shippingAddress: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
