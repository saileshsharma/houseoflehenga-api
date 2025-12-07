import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

// Validation schema
const addressSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  addressLine1: z.string().min(5, 'Address must be at least 5 characters'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Pincode must be 6 digits').max(6),
  isDefault: z.boolean().optional(),
});

// Get all addresses for user
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    next(error);
  }
});

// Get single address
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const addressId = req.params.id;

    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId
      }
    });

    if (!address) {
      throw new AppError('Address not found', 404);
    }

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    next(error);
  }
});

// Create new address
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const data = addressSchema.parse(req.body);

    // If this is the first address or marked as default, set it as default
    const addressCount = await prisma.address.count({ where: { userId } });
    const isDefault = data.isDefault || addressCount === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        fullName: data.fullName,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        isDefault
      }
    });

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: address
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(', ');
      return next(new AppError(message, 400));
    }
    next(error);
  }
});

// Update address
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const addressId = req.params.id;
    const data = addressSchema.parse(req.body);

    // Check if address belongs to user
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!existing) {
      throw new AppError('Address not found', 404);
    }

    // If setting as default, unset other defaults
    if (data.isDefault && !existing.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        isDefault: data.isDefault ?? existing.isDefault
      }
    });

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(', ');
      return next(new AppError(message, 400));
    }
    next(error);
  }
});

// Set address as default
router.patch('/:id/default', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const addressId = req.params.id;

    // Check if address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!address) {
      throw new AppError('Address not found', 404);
    }

    // Unset all defaults
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false }
    });

    // Set this as default
    const updated = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true }
    });

    res.json({
      success: true,
      message: 'Default address updated',
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

// Delete address
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const addressId = req.params.id;

    // Check if address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!address) {
      throw new AppError('Address not found', 404);
    }

    // Check if address is used in any orders
    const ordersWithAddress = await prisma.order.count({
      where: { addressId }
    });

    if (ordersWithAddress > 0) {
      throw new AppError('Cannot delete address that has been used in orders', 400);
    }

    await prisma.address.delete({
      where: { id: addressId }
    });

    // If deleted address was default, set another as default
    if (address.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true }
        });
      }
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
