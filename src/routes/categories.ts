import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, createCategorySchema, updateCategorySchema } from '../utils/validation';

const router = Router();

// Get all categories
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

// Get category by slug with products
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            color: { select: { name: true } }
          },
          orderBy: { featured: 'desc' }
        }
      }
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// Get all colors
router.get('/meta/colors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const colors = await prisma.color.findMany({
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: colors
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Create category
router.post('/', authenticate, requireAdmin, validate(createCategorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, imagePublicId } = req.body;

    const category = await prisma.category.create({
      data: { name, slug, description, imagePublicId }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

export default router;
