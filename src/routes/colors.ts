import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// Get all colors
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const colors = await prisma.color.findMany({
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

export default router;
