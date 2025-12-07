import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Dashboard overview
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get various stats in parallel
    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      monthlyRevenue,
      lastMonthRevenue,
      totalCustomers,
      newCustomersThisMonth,
      lowStockProducts,
      recentOrders,
      topProducts
    ] = await Promise.all([
      // Total orders
      prisma.order.count(),

      // Today's orders
      prisma.order.count({
        where: { createdAt: { gte: today } }
      }),

      // Pending orders
      prisma.order.count({
        where: { status: 'PENDING' }
      }),

      // This month's revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: thisMonth },
          paymentStatus: 'PAID'
        },
        _sum: { total: true }
      }),

      // Last month's revenue (for comparison)
      prisma.order.aggregate({
        where: {
          createdAt: { gte: lastMonth, lt: thisMonth },
          paymentStatus: 'PAID'
        },
        _sum: { total: true }
      }),

      // Total customers
      prisma.user.count({ where: { role: 'CUSTOMER' } }),

      // New customers this month
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: thisMonth }
        }
      }),

      // Low stock products (stock <= 5)
      prisma.product.count({
        where: { stock: { lte: 5 }, isActive: true }
      }),

      // Recent orders
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: { include: { product: { select: { name: true } } } }
        }
      }),

      // Top selling products this month
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { createdAt: { gte: thisMonth } }
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      })
    ]);

    // Get product details for top products
    const topProductDetails = topProducts.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: topProducts.map(p => p.productId) } },
          select: { id: true, name: true, slug: true, price: true }
        })
      : [];

    const topProductsWithDetails = topProducts.map(p => {
      const product = topProductDetails.find(pd => pd.id === p.productId);
      return {
        ...product,
        soldQuantity: p._sum.quantity
      };
    });

    // Calculate growth percentages
    const currentRevenue = monthlyRevenue._sum.total || 0;
    const previousRevenue = lastMonthRevenue._sum.total || 0;
    const revenueGrowth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : currentRevenue > 0 ? '100' : '0';

    res.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          todayOrders,
          pendingOrders,
          monthlyRevenue: currentRevenue,
          revenueGrowth: parseFloat(revenueGrowth as string),
          totalCustomers,
          newCustomersThisMonth,
          lowStockProducts
        },
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: `${order.user.firstName} ${order.user.lastName}`,
          email: order.user.email,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          itemCount: order.items.length,
          createdAt: order.createdAt
        })),
        topProducts: topProductsWithDetails
      }
    });
  } catch (error) {
    next(error);
  }
});

// Sales analytics
router.get('/analytics/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = '7d' } = req.query;

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get daily sales data
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        paymentStatus: 'PAID'
      },
      select: {
        total: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const salesByDate: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = { revenue: 0, orders: 0 };
      }
      salesByDate[dateKey].revenue += order.total;
      salesByDate[dateKey].orders += 1;
    });

    // Fill in missing dates
    const chartData: Array<{ date: string; revenue: number; orders: number }> = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split('T')[0];
      chartData.push({
        date: dateKey,
        revenue: salesByDate[dateKey]?.revenue || 0,
        orders: salesByDate[dateKey]?.orders || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue
        },
        chartData
      }
    });
  } catch (error) {
    next(error);
  }
});

// Order status breakdown
router.get('/analytics/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: true
    });

    const paymentStatusCounts = await prisma.order.groupBy({
      by: ['paymentStatus'],
      _count: true
    });

    res.json({
      success: true,
      data: {
        byStatus: statusCounts.map(s => ({
          status: s.status,
          count: s._count
        })),
        byPaymentStatus: paymentStatusCounts.map(s => ({
          status: s.paymentStatus,
          count: s._count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Category performance
router.get('/analytics/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // Get sales by category
    const categoryStats = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: thisMonth },
          paymentStatus: 'PAID'
        }
      },
      _sum: { quantity: true, price: true }
    });

    // Get product categories
    const productIds = categoryStats.map(s => s.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true }
    });

    // Get category details
    const categoryIds = [...new Set(products.map(p => p.categoryId))];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } }
    });

    // Aggregate by category
    const categoryRevenue: Record<string, { name: string; revenue: number; quantity: number }> = {};
    categoryStats.forEach(stat => {
      const product = products.find(p => p.id === stat.productId);
      if (product) {
        const category = categories.find(c => c.id === product.categoryId);
        if (category) {
          if (!categoryRevenue[category.id]) {
            categoryRevenue[category.id] = { name: category.name, revenue: 0, quantity: 0 };
          }
          categoryRevenue[category.id].revenue += (stat._sum.price || 0) * (stat._sum.quantity || 0);
          categoryRevenue[category.id].quantity += stat._sum.quantity || 0;
        }
      }
    });

    res.json({
      success: true,
      data: Object.values(categoryRevenue).sort((a, b) => b.revenue - a.revenue)
    });
  } catch (error) {
    next(error);
  }
});

// Customer analytics
router.get('/analytics/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      newThisMonth,
      customersWithOrders,
      topCustomers
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: thisMonth } }
      }),
      prisma.order.groupBy({
        by: ['userId'],
        _count: true
      }),
      prisma.order.groupBy({
        by: ['userId'],
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 10
      })
    ]);

    // Get customer details for top customers
    const topCustomerIds = topCustomers.map(c => c.userId);
    const customerDetails = await prisma.user.findMany({
      where: { id: { in: topCustomerIds } },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    const topCustomersWithDetails = topCustomers.map(c => {
      const customer = customerDetails.find(cd => cd.id === c.userId);
      return {
        id: c.userId,
        name: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
        email: customer?.email || '',
        totalSpent: c._sum.total || 0,
        orderCount: c._count
      };
    });

    res.json({
      success: true,
      data: {
        totalCustomers,
        newThisMonth,
        returningCustomers: customersWithOrders.filter(c => c._count > 1).length,
        topCustomers: topCustomersWithDetails
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update order status (enhanced version with notes)
router.patch('/orders/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, trackingNumber, notes } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(trackingNumber && { trackingNumber }),
        ...(notes && { notes })
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { product: true } },
        shippingAddress: true
      }
    });

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// Get order details for admin
router.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                category: { select: { name: true } }
              }
            }
          }
        },
        shippingAddress: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

export default router;
