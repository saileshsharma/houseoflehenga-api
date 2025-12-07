import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

// Validation schema
const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  source: z.string().max(50).optional(),
});

// Subscribe to newsletter
router.post('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, source } = subscribeSchema.parse(req.body);

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      if (existing.isActive) {
        // Already subscribed and active
        return res.json({
          success: true,
          message: "You're already subscribed to our newsletter!"
        });
      } else {
        // Reactivate subscription
        await prisma.newsletterSubscriber.update({
          where: { email: email.toLowerCase() },
          data: {
            isActive: true,
            unsubscribedAt: null,
            source: source || existing.source
          }
        });
        return res.json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.'
        });
      }
    }

    // Create new subscription
    await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        source: source || 'footer'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing! Look out for exclusive offers in your inbox.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(', ');
      return next(new AppError(message, 400));
    }
    next(error);
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!subscriber) {
      throw new AppError('Email not found in our mailing list', 404);
    }

    if (!subscriber.isActive) {
      return res.json({
        success: true,
        message: 'You have already unsubscribed from our newsletter.'
      });
    }

    await prisma.newsletterSubscriber.update({
      where: { email: email.toLowerCase() },
      data: {
        isActive: false,
        unsubscribedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: "You've been unsubscribed. We're sorry to see you go!"
    });
  } catch (error) {
    next(error);
  }
});

export default router;
