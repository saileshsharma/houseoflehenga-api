import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';
import { transformProductImages, getImageUrl } from '../utils/cloudinary';
import { validate, createProductSchema, updateProductSchema } from '../utils/validation';

const router = Router();

// Helper to transform product with image URLs
const transformProduct = (product: any) => {
  const primaryImg = product.images?.[0];
  let primaryImage = null;

  if (primaryImg?.publicId) {
    primaryImage = getImageUrl(primaryImg.publicId, 'thumbnail');
  } else if (primaryImg?.url) {
    primaryImage = primaryImg.url; // Legacy fallback
  }

  return {
    ...product,
    images: product.images ? transformProductImages(product.images) : [],
    primaryImage,
  };
};

// Helper to transform array of products
const transformProducts = (products: any[]) => {
  return products.map(transformProduct);
};

// Get all products with filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      category,
      color,
      minPrice,
      maxPrice,
      sort = 'featured',
      featured,
      newArrival,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { isActive: true };

    if (category) {
      where.category = { slug: category };
    }

    if (color) {
      where.color = { name: color };
    }

    if (minPrice) {
      where.price = { ...where.price, gte: parseInt(minPrice as string) * 100 };
    }

    if (maxPrice) {
      where.price = { ...where.price, lte: parseInt(maxPrice as string) * 100 };
    }

    if (featured === 'true') {
      where.featured = true;
    }

    if (newArrival === 'true') {
      where.newArrival = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sort) {
      case 'price_low':
        orderBy = { price: 'asc' };
        break;
      case 'price_high':
        orderBy = { price: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      default:
        orderBy = { featured: 'desc' };
    }

    // Get products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          category: { select: { name: true, slug: true } },
          color: { select: { name: true, hexCode: true } },
          images: {
            where: { isPrimary: true },
            take: 1
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        products: transformProducts(products),
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

// Get product recommendations - MUST be before /:slug to avoid conflicts
router.get('/recommendations/home', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get trending (featured products)
    const trending = await prisma.product.findMany({
      where: { isActive: true, featured: true },
      take: 8,
      orderBy: { rating: 'desc' },
      include: {
        category: { select: { name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 }
      }
    });

    // Get new arrivals
    const newArrivals = await prisma.product.findMany({
      where: { isActive: true, newArrival: true },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 }
      }
    });

    // Get best sellers (products with most orders)
    const bestSellersRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8
    });

    const bestSellerIds = bestSellersRaw.map(item => item.productId);
    const bestSellers = bestSellerIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: bestSellerIds }, isActive: true },
          include: {
            category: { select: { name: true, slug: true } },
            images: { where: { isPrimary: true }, take: 1 }
          }
        })
      : [];

    // Sort best sellers by order count
    const sortedBestSellers = bestSellerIds.map(id =>
      bestSellers.find(p => p.id === id)
    ).filter(Boolean);

    res.json({
      success: true,
      data: {
        trending: transformProducts(trending),
        newArrivals: transformProducts(newArrivals),
        bestSellers: transformProducts(sortedBestSellers as any[])
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get personalized recommendations based on viewed products
router.post('/recommendations/personalized', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { viewedProductIds = [], limit = 8 } = req.body;

    if (!viewedProductIds.length) {
      // Return trending if no history
      const trending = await prisma.product.findMany({
        where: { isActive: true, featured: true },
        take: limit,
        orderBy: { rating: 'desc' },
        include: {
          category: { select: { name: true, slug: true } },
          images: { where: { isPrimary: true }, take: 1 }
        }
      });

      return res.json({
        success: true,
        data: {
          recommendations: transformProducts(trending),
          source: 'trending'
        }
      });
    }

    // Get categories and price range from viewed products
    const viewedProducts = await prisma.product.findMany({
      where: { id: { in: viewedProductIds } },
      select: { categoryId: true, price: true, colorId: true }
    });

    const categoryIds = [...new Set(viewedProducts.map(p => p.categoryId))];
    const colorIds = [...new Set(viewedProducts.map(p => p.colorId).filter(Boolean))];
    const prices = viewedProducts.map(p => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceRange = { min: avgPrice * 0.5, max: avgPrice * 1.5 };

    // Get similar products based on category and price range
    const recommendations = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { notIn: viewedProductIds },
        OR: [
          { categoryId: { in: categoryIds } },
          { colorId: { in: colorIds as string[] } },
          { price: { gte: priceRange.min, lte: priceRange.max } }
        ]
      },
      take: limit,
      orderBy: [
        { featured: 'desc' },
        { rating: 'desc' }
      ],
      include: {
        category: { select: { name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 }
      }
    });

    res.json({
      success: true,
      data: {
        recommendations: transformProducts(recommendations),
        source: 'personalized'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get "You May Also Like" recommendations for a specific product
router.get('/recommendations/similar/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 4;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, price: true, colorId: true, occasion: true }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Get similar products based on multiple factors
    const similar = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: productId },
        OR: [
          { categoryId: product.categoryId },
          { colorId: product.colorId },
          { occasion: product.occasion },
          {
            price: {
              gte: product.price * 0.7,
              lte: product.price * 1.3
            }
          }
        ]
      },
      take: limit * 2, // Get more to filter
      orderBy: [
        { featured: 'desc' },
        { rating: 'desc' }
      ],
      include: {
        category: { select: { name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 }
      }
    });

    // Score and sort by similarity
    const scored = similar.map(p => {
      let score = 0;
      if (p.categoryId === product.categoryId) score += 3;
      if (p.colorId === product.colorId) score += 2;
      if (p.occasion === product.occasion) score += 2;
      const priceDiff = Math.abs(p.price - product.price) / product.price;
      if (priceDiff < 0.2) score += 2;
      else if (priceDiff < 0.5) score += 1;
      return { ...p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topSimilar = scored.slice(0, limit);

    res.json({
      success: true,
      data: transformProducts(topSimilar)
    });
  } catch (error) {
    next(error);
  }
});

// Get single product by slug
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        color: true,
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { isApproved: true },
          include: {
            user: { select: { firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Get related products
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true
      },
      take: 4,
      include: {
        images: { where: { isPrimary: true }, take: 1 }
      }
    });

    res.json({
      success: true,
      data: {
        product: transformProduct(product),
        relatedProducts: transformProducts(relatedProducts)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Create product
router.post('/', authenticate, requireAdmin, validate(createProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      originalPrice,
      categoryId,
      colorId,
      fabric,
      work,
      occasion,
      stock,
      featured,
      newArrival,
      images
    } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: price * 100, // Convert to paise
        originalPrice: originalPrice ? originalPrice * 100 : null,
        categoryId,
        colorId,
        fabric,
        work,
        occasion,
        stock,
        featured: featured || false,
        newArrival: newArrival || false,
        images: {
          create: images?.map((img: any, index: number) => ({
            publicId: img.publicId,
            alt: img.alt || name,
            isPrimary: index === 0,
            sortOrder: index
          })) || []
        }
      },
      include: {
        category: true,
        color: true,
        images: true
      }
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Update product
router.patch('/:id', authenticate, requireAdmin, validate(updateProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert prices to paise if provided
    if (updateData.price) {
      updateData.price = updateData.price * 100;
    }
    if (updateData.originalPrice) {
      updateData.originalPrice = updateData.originalPrice * 100;
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        color: true,
        images: true
      }
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete product
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Product deleted'
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get inventory status (low stock products)
router.get('/admin/inventory', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { threshold = '5' } = req.query;
    const stockThreshold = parseInt(threshold as string);

    // Get products grouped by stock status
    const [outOfStock, lowStock, inStock] = await Promise.all([
      prisma.product.findMany({
        where: { stock: 0, isActive: true },
        include: {
          category: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.product.findMany({
        where: {
          stock: { gt: 0, lte: stockThreshold },
          isActive: true
        },
        include: {
          category: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 }
        },
        orderBy: { stock: 'asc' }
      }),
      prisma.product.count({
        where: { stock: { gt: stockThreshold }, isActive: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        outOfStock: outOfStock.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          stock: p.stock,
          category: p.category.name,
          image: p.images[0]?.publicId || null
        })),
        lowStock: lowStock.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          stock: p.stock,
          category: p.category.name,
          image: p.images[0]?.publicId || null
        })),
        summary: {
          outOfStockCount: outOfStock.length,
          lowStockCount: lowStock.length,
          inStockCount: inStock
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Update stock for a product
router.patch('/:id/stock', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { stock, adjustment } = req.body;

    // Either set absolute stock value or make an adjustment
    let updateData: { stock: number | { increment: number } };

    if (typeof stock === 'number') {
      if (stock < 0) {
        throw new AppError('Stock cannot be negative', 400);
      }
      updateData = { stock };
    } else if (typeof adjustment === 'number') {
      // Get current stock to validate adjustment
      const product = await prisma.product.findUnique({
        where: { id },
        select: { stock: true }
      });
      if (!product) {
        throw new AppError('Product not found', 404);
      }
      if (product.stock + adjustment < 0) {
        throw new AppError('Adjustment would result in negative stock', 400);
      }
      updateData = { stock: { increment: adjustment } };
    } else {
      throw new AppError('Provide either stock (absolute) or adjustment value', 400);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        stock: true
      }
    });

    res.json({
      success: true,
      data: product,
      message: `Stock updated to ${product.stock}`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
