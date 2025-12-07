/**
 * Migration script to upload existing product images to Cloudinary
 * and update the database with publicId
 *
 * Run with: npx tsx scripts/migrate-images-to-cloudinary.ts
 */

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(imageUrl: string, folder: string): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `houseoflehenga/${folder}`,
      resource_type: 'image',
    });
    return result.public_id;
  } catch (error) {
    console.error(`Failed to upload ${imageUrl}:`, error);
    return null;
  }
}

async function migrateProductImages() {
  console.log('Starting product image migration to Cloudinary...\n');

  // Get all images that have url but no publicId
  const imagesToMigrate = await prisma.productImage.findMany({
    where: {
      url: { not: null },
      publicId: null,
    },
    include: {
      product: {
        select: { slug: true },
      },
    },
  });

  console.log(`Found ${imagesToMigrate.length} images to migrate\n`);

  let success = 0;
  let failed = 0;

  for (const image of imagesToMigrate) {
    if (!image.url) continue;

    const folder = `products/${image.product.slug}`;
    console.log(`Migrating: ${image.url.substring(0, 60)}...`);

    const publicId = await uploadToCloudinary(image.url, folder);

    if (publicId) {
      await prisma.productImage.update({
        where: { id: image.id },
        data: { publicId },
      });
      console.log(`  ✓ Migrated to: ${publicId}`);
      success++;
    } else {
      console.log(`  ✗ Failed`);
      failed++;
    }

    // Rate limiting - wait 100ms between uploads
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n--- Migration Complete ---`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

async function migrateCategoryImages() {
  console.log('\nStarting category image migration to Cloudinary...\n');

  // Get all categories that have image but no imagePublicId
  const categoriesToMigrate = await prisma.category.findMany({
    where: {
      image: { not: null },
      imagePublicId: null,
    },
  });

  console.log(`Found ${categoriesToMigrate.length} category images to migrate\n`);

  let success = 0;
  let failed = 0;

  for (const category of categoriesToMigrate) {
    if (!category.image) continue;

    console.log(`Migrating category: ${category.name}`);

    const publicId = await uploadToCloudinary(category.image, `categories`);

    if (publicId) {
      await prisma.category.update({
        where: { id: category.id },
        data: { imagePublicId: publicId },
      });
      console.log(`  ✓ Migrated to: ${publicId}`);
      success++;
    } else {
      console.log(`  ✗ Failed`);
      failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n--- Category Migration Complete ---`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

async function main() {
  try {
    await migrateProductImages();
    await migrateCategoryImages();
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
