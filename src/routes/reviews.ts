import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';
import { validate, createReviewSchema } from '../utils/validation';

const router = Router();

// Get reviews for a product
router.get('/product/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { page = '1', limit = '10', sort = 'recent' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 50);
    const skip = (pageNum - 1) * limitNum;

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'highest') orderBy = { rating: 'desc' };
    if (sort === 'lowest') orderBy = { rating: 'asc' };
    if (sort === 'helpful') orderBy = { createdAt: 'desc' }; // Could add helpfulCount later

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          productId,
          isApproved: true
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.review.count({
        where: {
          productId,
          isApproved: true
        }
      })
    ]);

    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        isApproved: true
      },
      _count: true
    });

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDistribution.forEach(r => {
      distribution[r.rating] = r._count;
    });

    res.json({
      success: true,
      reviews: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        images: review.images,
        isVerified: review.isVerified,
        createdAt: review.createdAt,
        user: {
          name: `${review.user.firstName} ${review.user.lastName?.charAt(0) || ''}.`,
          initials: `${review.user.firstName?.charAt(0) || ''}${review.user.lastName?.charAt(0) || ''}`
        }
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      distribution
    });
  } catch (error) {
    next(error);
  }
});

// Create a review (authenticated)
router.post('/', authenticate, validate(createReviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user!.userId;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existingReview) {
      throw new AppError('You have already reviewed this product', 400);
    }

    // Check if user has purchased this product (for verified badge)
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: {
            in: ['DELIVERED', 'SHIPPED', 'PROCESSING']
          }
        }
      }
    });

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        title: title || null,
        comment,
        images: images || [],
        isVerified: !!hasPurchased,
        isApproved: false // Requires admin approval
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after approval.',
      review: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        images: review.images,
        isVerified: review.isVerified,
        createdAt: review.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update a review (owner only)
router.put('/:reviewId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user!.userId;

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    if (review.userId !== userId) {
      throw new AppError('You can only edit your own reviews', 403);
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: rating !== undefined ? rating : review.rating,
        title: title !== undefined ? title : review.title,
        comment: comment !== undefined ? comment : review.comment,
        images: images !== undefined ? images : review.images,
        isApproved: false // Re-approval needed after edit
      }
    });

    res.json({
      success: true,
      message: 'Review updated. It will be visible after re-approval.',
      review: updatedReview
    });
  } catch (error) {
    next(error);
  }
});

// Delete a review (owner or admin)
router.delete('/:reviewId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    if (review.userId !== userId && !isAdmin) {
      throw new AppError('You can only delete your own reviews', 403);
    }

    // Delete the review
    await prisma.review.delete({
      where: { id: reviewId }
    });

    // Update product rating
    await updateProductRating(review.productId);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Approve a review
router.post('/:reviewId/approve', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { isApproved: true }
    });

    // Update product rating after approval
    await updateProductRating(review.productId);

    res.json({
      success: true,
      message: 'Review approved',
      review
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get pending reviews
router.get('/admin/pending', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { isApproved: false },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        product: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to update product rating
async function updateProductRating(productId: string) {
  const aggregation = await prisma.review.aggregate({
    where: {
      productId,
      isApproved: true
    },
    _avg: { rating: true },
    _count: true
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: aggregation._avg.rating || 0,
      reviewCount: aggregation._count
    }
  });
}

// Get user's review for a product
router.get('/user/:productId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.userId;

    const review = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    res.json({
      success: true,
      review: review || null,
      hasReviewed: !!review
    });
  } catch (error) {
    next(error);
  }
});

export default router;
