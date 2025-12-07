import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { uploadImage, deleteImage, uploadFromUrl, getTransformedUrl, ImagePresets } from '../utils/cloudinary';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Extend Express Request type for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and AVIF are allowed.'));
    }
  },
});

// Upload single image (Admin only)
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  upload.single('image'),
  async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const folder = req.body.folder || 'products';
      const result = await uploadImage(req.file.buffer, folder);

      res.json({
        success: true,
        data: {
          url: result.url,
          publicId: result.publicId,
          // Pre-generated transformed URLs
          thumbnailUrl: getTransformedUrl(result.url, 'thumbnail'),
          detailUrl: getTransformedUrl(result.url, 'detail'),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Upload multiple images (Admin only)
router.post(
  '/upload-multiple',
  authenticate,
  requireAdmin,
  upload.array('images', 10), // Max 10 images
  async (req: MulterRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No image files provided' });
      }

      const folder = req.body.folder || 'products';
      const results = await Promise.all(
        files.map((file) => uploadImage(file.buffer, folder))
      );

      res.json({
        success: true,
        data: results.map((result) => ({
          url: result.url,
          publicId: result.publicId,
          thumbnailUrl: getTransformedUrl(result.url, 'thumbnail'),
          detailUrl: getTransformedUrl(result.url, 'detail'),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Upload from URL (Admin only) - useful for migrating existing images
router.post(
  '/upload-url',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { imageUrl, folder = 'products' } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ success: false, error: 'Image URL is required' });
      }

      const result = await uploadFromUrl(imageUrl, folder);

      res.json({
        success: true,
        data: {
          url: result.url,
          publicId: result.publicId,
          thumbnailUrl: getTransformedUrl(result.url, 'thumbnail'),
          detailUrl: getTransformedUrl(result.url, 'detail'),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Delete image (Admin only)
router.delete(
  '/:publicId',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Public ID might contain slashes, so decode it
      const publicId = decodeURIComponent(req.params.publicId);
      const success = await deleteImage(publicId);

      if (success) {
        res.json({ success: true, message: 'Image deleted successfully' });
      } else {
        res.status(400).json({ success: false, error: 'Failed to delete image' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Add image to product (Admin only)
router.post(
  '/product/:productId',
  authenticate,
  requireAdmin,
  upload.single('image'),
  async (req: MulterRequest, res: Response) => {
    try {
      const { productId } = req.params;
      const { isPrimary = false, sortOrder = 0 } = req.body;

      // Check if product exists
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      // Upload to Cloudinary
      const result = await uploadImage(req.file.buffer, `products/${product.slug}`);

      // If this is primary, unset other primary images
      if (isPrimary === 'true' || isPrimary === true) {
        await prisma.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      // Save to database (only publicId, not URL)
      const productImage = await prisma.productImage.create({
        data: {
          productId,
          publicId: result.publicId,
          alt: req.body.alt || product.name,
          isPrimary: isPrimary === 'true' || isPrimary === true,
          sortOrder: parseInt(sortOrder) || 0,
        },
      });

      res.json({
        success: true,
        data: {
          id: productImage.id,
          publicId: productImage.publicId,
          alt: productImage.alt,
          isPrimary: productImage.isPrimary,
          sortOrder: productImage.sortOrder,
          urls: {
            thumbnail: getTransformedUrl(result.publicId, 'thumbnail'),
            detail: getTransformedUrl(result.publicId, 'detail'),
            zoom: getTransformedUrl(result.publicId, 'zoom'),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Delete product image (Admin only)
router.delete(
  '/product/:productId/:imageId',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { productId, imageId } = req.params;

      const image = await prisma.productImage.findFirst({
        where: { id: imageId, productId },
      });

      if (!image) {
        return res.status(404).json({ success: false, error: 'Image not found' });
      }

      // Delete from Cloudinary using stored publicId
      if (image.publicId) {
        await deleteImage(image.publicId);
      }

      // Delete from database
      await prisma.productImage.delete({ where: { id: imageId } });

      res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Get transformed URL for any image
router.get('/transform', async (req: Request, res: Response) => {
  try {
    const { url, preset = 'thumbnail' } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const validPresets = Object.keys(ImagePresets);
    if (!validPresets.includes(preset as string)) {
      return res.status(400).json({
        success: false,
        error: `Invalid preset. Valid options: ${validPresets.join(', ')}`,
      });
    }

    const transformedUrl = getTransformedUrl(url, preset as keyof typeof ImagePresets);

    res.json({
      success: true,
      data: { originalUrl: url, transformedUrl, preset },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
