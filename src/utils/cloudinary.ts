import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Image transformation presets for lehengas
export const ImagePresets = {
  // Product thumbnail (for grids)
  thumbnail: {
    width: 400,
    height: 500,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto',
  },
  // Product detail main image
  detail: {
    width: 800,
    height: 1000,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto',
  },
  // Full size for zoom
  zoom: {
    width: 1600,
    height: 2000,
    crop: 'limit',
    quality: 'auto:best',
    format: 'auto',
  },
  // Cart/wishlist small thumbnail
  cartThumb: {
    width: 150,
    height: 180,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto',
  },
  // Admin panel preview
  adminPreview: {
    width: 200,
    height: 250,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  },
};

// Upload image to Cloudinary
export const uploadImage = async (
  fileBuffer: Buffer,
  folder: string = 'products'
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `houseoflehenga/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:best' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Upload from URL (for migrating existing images)
export const uploadFromUrl = async (
  imageUrl: string,
  folder: string = 'products'
): Promise<{ url: string; publicId: string }> => {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: `houseoflehenga/${folder}`,
    resource_type: 'image',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

// Delete image from Cloudinary
export const deleteImage = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

// Get transformed image URL
export const getTransformedUrl = (
  publicIdOrUrl: string,
  preset: keyof typeof ImagePresets
): string => {
  const transformation = ImagePresets[preset];

  // If it's already a Cloudinary URL, transform it
  if (publicIdOrUrl.includes('cloudinary.com')) {
    // Extract public ID from URL
    const match = publicIdOrUrl.match(/\/v\d+\/(.+)\.\w+$/);
    if (match) {
      return cloudinary.url(match[1], { transformation });
    }
  }

  // If it's a public ID, generate URL
  if (!publicIdOrUrl.startsWith('http')) {
    return cloudinary.url(publicIdOrUrl, { transformation });
  }

  // For external URLs (like Unsplash), use Cloudinary fetch
  return cloudinary.url(publicIdOrUrl, {
    type: 'fetch',
    ...transformation,
  });
};

// Generate responsive image srcset
export const getResponsiveSrcSet = (publicIdOrUrl: string): string => {
  const widths = [400, 600, 800, 1200, 1600];

  return widths
    .map((w) => {
      const url = cloudinary.url(publicIdOrUrl, {
        type: publicIdOrUrl.startsWith('http') ? 'fetch' : 'upload',
        width: w,
        crop: 'scale',
        quality: 'auto',
        format: 'auto',
      });
      return `${url} ${w}w`;
    })
    .join(', ');
};

// Generate URL from public_id with a specific preset
export const getImageUrl = (publicId: string, preset: keyof typeof ImagePresets = 'detail'): string => {
  if (!publicId) return '';
  const transformation = ImagePresets[preset];
  return cloudinary.url(publicId, { transformation, secure: true });
};

// Generate all image URLs for a product image (used in API responses)
export const generateImageUrls = (publicId: string) => {
  if (!publicId) return null;
  return {
    thumbnail: getImageUrl(publicId, 'thumbnail'),
    detail: getImageUrl(publicId, 'detail'),
    zoom: getImageUrl(publicId, 'zoom'),
    cartThumb: getImageUrl(publicId, 'cartThumb'),
  };
};

// Transform a product image record to include all URLs
// Supports both publicId (preferred) and legacy url field
export const transformProductImage = (image: { id: string; publicId?: string | null; url?: string | null; alt: string | null; isPrimary: boolean; sortOrder: number }) => {
  // Prefer publicId, fallback to url for legacy data
  if (image.publicId) {
    const urls = generateImageUrls(image.publicId);
    return {
      id: image.id,
      publicId: image.publicId,
      alt: image.alt,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      urls,
    };
  }

  // Legacy: if only url is available, use it directly
  return {
    id: image.id,
    publicId: null,
    alt: image.alt,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
    urls: image.url ? {
      thumbnail: image.url,
      detail: image.url,
      zoom: image.url,
      cartThumb: image.url,
    } : null,
  };
};

// Transform multiple product images
export const transformProductImages = (images: Array<{ id: string; publicId?: string | null; url?: string | null; alt: string | null; isPrimary: boolean; sortOrder: number }>) => {
  return images.map(transformProductImage);
};

export default cloudinary;
