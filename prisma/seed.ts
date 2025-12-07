import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const LEHENGA_IMAGES = [
  'photo-1610030469983-98e550d6193c',
  'photo-1583391733956-3750e0ff4e8b',
  'photo-1594463750939-ebb28c3f7f75',
  'photo-1614252369475-531eba835eb1',
  'photo-1609748340878-f98848e3aa81',
  'photo-1595777457583-95e059d581b8',
  'photo-1604607053595-ef12e85e0c45',
  'photo-1602216056096-3b40cc0c9944',
  'photo-1610030469629-3d7bb2b9a2ae',
  'photo-1617627143233-1df662c96a76',
  'photo-1619411281042-30e6b0825546',
  'photo-1622398925373-3f91b1e275f2',
  'photo-1518495973542-4542c06a5843',
  'photo-1519741497674-611481863552',
  'photo-1515372039744-b8f02a3ae446',
  'photo-1502635385003-ee1e6a1a742d',
  'photo-1469334031218-e382a71b716b',
  'photo-1490114538077-0a7f8cb49891',
  'photo-1485968579169-27d4b3e99426',
  'photo-1507003211169-0a1dd7228f2d'
];

const getImageUrl = (index: number, size = '400&h=500') => {
  const imgId = LEHENGA_IMAGES[index % LEHENGA_IMAGES.length];
  return `https://images.unsplash.com/${imgId}?w=${size}&fit=crop`;
};

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.color.deleteMany();
  await prisma.category.deleteMany();

  console.log('✅ Cleared existing data');

  // Create categories
  const categoriesData = [
    { name: 'Bridal Lehengas', slug: 'bridal', description: 'Exquisite bridal collection for your special day' },
    { name: 'Wedding Guest', slug: 'wedding', description: 'Perfect outfits for wedding guests' },
    { name: 'Reception Wear', slug: 'reception', description: 'Glamorous reception collection' },
    { name: 'Festive Collection', slug: 'festive', description: 'Celebrate in style' },
    { name: 'Designer Picks', slug: 'designer', description: 'Curated designer collection' },
    { name: 'Sangeet Special', slug: 'sangeet', description: 'Dance the night away' },
    { name: 'Mehendi Collection', slug: 'mehendi', description: 'Fresh and vibrant' },
    { name: 'Engagement', slug: 'engagement', description: 'Say yes in style' }
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    categories[cat.slug] = await prisma.category.create({ data: cat });
  }
  console.log(`✅ Created ${Object.keys(categories).length} categories`);

  // Create colors
  const colorsData = [
    { name: 'Red', hexCode: '#DC143C' },
    { name: 'Pink', hexCode: '#FF69B4' },
    { name: 'Maroon', hexCode: '#800000' },
    { name: 'Gold', hexCode: '#FFD700' },
    { name: 'Green', hexCode: '#228B22' },
    { name: 'Blue', hexCode: '#4169E1' },
    { name: 'Purple', hexCode: '#800080' },
    { name: 'Peach', hexCode: '#FFDAB9' },
    { name: 'Yellow', hexCode: '#FFD700' },
    { name: 'Orange', hexCode: '#FF8C00' },
    { name: 'Ivory', hexCode: '#FFFFF0' },
    { name: 'Wine', hexCode: '#722F37' },
    { name: 'Teal', hexCode: '#008080' },
    { name: 'Coral', hexCode: '#FF7F50' },
    { name: 'Magenta', hexCode: '#FF00FF' }
  ];

  const colors: Record<string, any> = {};
  for (const color of colorsData) {
    colors[color.name] = await prisma.color.create({ data: color });
  }
  console.log(`✅ Created ${Object.keys(colors).length} colors`);

  // All 100 products
  const productsData = [
    // ========== BRIDAL COLLECTION (15 products) ==========
    { name: 'Royal Crimson Bridal Lehenga', slug: 'royal-crimson-bridal-lehenga', price: 18500000, originalPrice: 22000000, category: 'bridal', color: 'Red', fabric: 'Raw Silk & Velvet', work: 'Zardozi, Kundan, Sequins', occasion: 'Wedding', stock: 3, rating: 4.9, reviewCount: 127, featured: true, newArrival: false, imageIndex: 0, description: 'Exquisite handcrafted bridal lehenga in rich crimson red with intricate zardozi work, sequins, and kundan embellishments. Features a heavily embroidered choli and matching dupatta with gold border.' },
    { name: 'Maroon Velvet Heritage Lehenga', slug: 'maroon-velvet-heritage-lehenga', price: 22500000, originalPrice: 27500000, category: 'bridal', color: 'Maroon', fabric: 'Pure Velvet', work: 'Dabka, Zardozi, Stones', occasion: 'Wedding, Bridal', stock: 2, rating: 5.0, reviewCount: 89, featured: true, newArrival: false, imageIndex: 5, description: 'Luxurious maroon velvet lehenga with royal heritage design. Hand-embroidered with real gold threads, precious stones, and intricate Mughal patterns passed down through generations.' },
    { name: 'Blush Pink Dreamy Bridal Lehenga', slug: 'blush-pink-dreamy-bridal', price: 16500000, originalPrice: 19500000, category: 'bridal', color: 'Pink', fabric: 'Organza & Net', work: 'Thread Work, Pearls, Sequins', occasion: 'Wedding', stock: 4, rating: 4.8, reviewCount: 156, featured: true, newArrival: true, imageIndex: 1, description: 'Dreamy blush pink lehenga with delicate floral threadwork and pearl embellishments. Perfect for the modern bride who loves subtle elegance with a contemporary twist.' },
    { name: 'Wine Red Royal Bridal Lehenga', slug: 'wine-red-royal-bridal', price: 19500000, originalPrice: 24000000, category: 'bridal', color: 'Wine', fabric: 'Banarasi Silk', work: 'Kundan, Meenakari, Zari', occasion: 'Wedding', stock: 2, rating: 4.9, reviewCount: 78, featured: true, newArrival: false, imageIndex: 0, description: 'Magnificent wine red bridal lehenga featuring traditional Rajasthani craftsmanship with modern silhouettes.' },
    { name: 'Deep Red Traditional Bridal Set', slug: 'deep-red-traditional-bridal', price: 17500000, originalPrice: 21000000, category: 'bridal', color: 'Red', fabric: 'Raw Silk', work: 'Hand Embroidery, Beads', occasion: 'Wedding', stock: 3, rating: 4.7, reviewCount: 94, featured: false, newArrival: false, imageIndex: 5, description: 'Classic deep red bridal lehenga with all-over heavy embroidery featuring over 10,000 hours of handwork.' },
    { name: 'Ivory Gold Bridal Lehenga', slug: 'ivory-gold-bridal-lehenga', price: 20500000, originalPrice: 25000000, category: 'bridal', color: 'Ivory', fabric: 'Silk Tissue', work: 'Gold Thread, Sequins', occasion: 'Wedding', stock: 3, rating: 4.9, reviewCount: 112, featured: true, newArrival: true, imageIndex: 11, description: 'Elegant ivory lehenga with intricate gold embroidery. Perfect for brides who want to break away from traditional red.' },
    { name: 'Scarlet Empress Bridal Lehenga', slug: 'scarlet-empress-bridal', price: 24500000, originalPrice: 29500000, category: 'bridal', color: 'Red', fabric: 'Pure Silk & Velvet', work: 'Antique Zardozi, Stones', occasion: 'Wedding', stock: 1, rating: 5.0, reviewCount: 43, featured: true, newArrival: false, imageIndex: 0, description: 'The ultimate bridal statement piece in scarlet red with double dupatta and antique gold zardozi.' },
    { name: 'Peach Blossom Bridal Lehenga', slug: 'peach-blossom-bridal', price: 15500000, originalPrice: 18500000, category: 'bridal', color: 'Peach', fabric: 'Net & Organza', work: '3D Flowers, Pearls', occasion: 'Wedding', stock: 5, rating: 4.8, reviewCount: 87, featured: false, newArrival: true, imageIndex: 6, description: 'Delicate peach bridal lehenga with 3D floral appliqué and pearl drops. Perfect for summer weddings.' },
    { name: 'Coral Sunset Bridal Lehenga', slug: 'coral-sunset-bridal', price: 16800000, originalPrice: 20000000, category: 'bridal', color: 'Coral', fabric: 'Georgette & Satin', work: 'Ombre Dye, Embroidery', occasion: 'Wedding', stock: 4, rating: 4.7, reviewCount: 65, featured: false, newArrival: true, imageIndex: 11, description: 'Stunning coral lehenga with modern ombre effect and traditional craftsmanship.' },
    { name: 'Magenta Royale Bridal Lehenga', slug: 'magenta-royale-bridal', price: 18800000, originalPrice: 22500000, category: 'bridal', color: 'Magenta', fabric: 'Raw Silk', work: 'Resham, Zari, Mirrors', occasion: 'Wedding', stock: 3, rating: 4.8, reviewCount: 52, featured: false, newArrival: false, imageIndex: 1, description: 'Vibrant magenta bridal lehenga with contrasting turquoise accents. Bold choice for confident brides.' },
    { name: 'Burgundy Dreams Bridal Lehenga', slug: 'burgundy-dreams-bridal', price: 19800000, originalPrice: 24000000, category: 'bridal', color: 'Maroon', fabric: 'Velvet & Silk', work: 'Dual Tone Embroidery', occasion: 'Wedding', stock: 2, rating: 4.9, reviewCount: 73, featured: true, newArrival: false, imageIndex: 5, description: 'Rich burgundy lehenga with gold and silver dual-tone embroidery. Timeless elegance.' },
    { name: 'Rose Gold Glamour Bridal Set', slug: 'rose-gold-glamour-bridal', price: 21500000, originalPrice: 26000000, category: 'bridal', color: 'Pink', fabric: 'Tissue & Net', work: 'Sequins, Crystals', occasion: 'Wedding', stock: 3, rating: 4.8, reviewCount: 98, featured: true, newArrival: true, imageIndex: 1, description: 'Trendy rose gold bridal lehenga with contemporary cuts and cape-style dupatta.' },
    { name: 'Rust Orange Bridal Lehenga', slug: 'rust-orange-bridal', price: 17200000, originalPrice: 20500000, category: 'bridal', color: 'Orange', fabric: 'Chanderi Silk', work: 'Phulkari, Gota', occasion: 'Wedding', stock: 4, rating: 4.6, reviewCount: 61, featured: false, newArrival: false, imageIndex: 8, description: 'Unique rust orange bridal lehenga with traditional Phulkari work. Punjabi-Rajasthani fusion.' },
    { name: 'Cherry Red Couture Bridal', slug: 'cherry-red-couture-bridal', price: 26500000, originalPrice: 32000000, category: 'bridal', color: 'Red', fabric: 'French Lace & Silk', work: 'Couture Embroidery', occasion: 'Wedding', stock: 1, rating: 5.0, reviewCount: 28, featured: true, newArrival: true, imageIndex: 0, description: 'Haute couture cherry red bridal masterpiece with European silhouette. Limited edition.' },
    { name: 'Traditional Sindoori Bridal Set', slug: 'traditional-sindoori-bridal', price: 18200000, originalPrice: 21800000, category: 'bridal', color: 'Red', fabric: 'Pure Silk', work: 'Temple Zardozi', occasion: 'Wedding', stock: 3, rating: 4.9, reviewCount: 145, featured: false, newArrival: false, imageIndex: 5, description: 'Classic sindoori red bridal lehenga honoring traditional North Indian aesthetics.' },

    // ========== RECEPTION WEAR (12 products) ==========
    { name: 'Midnight Blue Reception Lehenga', slug: 'midnight-blue-reception', price: 9800000, originalPrice: 12000000, category: 'reception', color: 'Blue', fabric: 'Silk & Tulle', work: 'Crystal, Silver Thread', occasion: 'Reception, Cocktail', stock: 5, rating: 4.9, reviewCount: 89, featured: true, newArrival: false, imageIndex: 3, description: 'Elegant midnight blue lehenga with silver and crystal embroidery. A showstopper for your reception.' },
    { name: 'Champagne Gold Reception Set', slug: 'champagne-gold-reception', price: 10800000, originalPrice: 13000000, category: 'reception', color: 'Gold', fabric: 'Tissue & Shimmer Net', work: 'Cutdana, Sequins', occasion: 'Reception', stock: 4, rating: 4.8, reviewCount: 76, featured: true, newArrival: true, imageIndex: 10, description: 'Sophisticated champagne gold lehenga with contemporary design and subtle shimmer.' },
    { name: 'Silver Stardust Reception Lehenga', slug: 'silver-stardust-reception', price: 11200000, originalPrice: 13500000, category: 'reception', color: 'Ivory', fabric: 'Metallic Net', work: 'Sequins, Crystals', occasion: 'Reception', stock: 3, rating: 4.7, reviewCount: 54, featured: false, newArrival: true, imageIndex: 10, description: 'Dazzling silver lehenga that catches light from every angle. Perfect for evening receptions.' },
    { name: 'Teal Elegance Reception Set', slug: 'teal-elegance-reception', price: 9200000, originalPrice: 11200000, category: 'reception', color: 'Teal', fabric: 'Georgette', work: 'Gold Thread, Beads', occasion: 'Reception', stock: 6, rating: 4.6, reviewCount: 67, featured: false, newArrival: false, imageIndex: 2, description: 'Stunning teal lehenga with gold thread embroidery. Perfect blend of tradition and contemporary style.' },
    { name: 'Navy Blue Cocktail Lehenga', slug: 'navy-blue-cocktail', price: 8500000, originalPrice: 10500000, category: 'reception', color: 'Blue', fabric: 'Satin & Net', work: 'Minimal Sequins', occasion: 'Reception, Cocktail', stock: 7, rating: 4.5, reviewCount: 82, featured: false, newArrival: false, imageIndex: 3, description: 'Chic navy blue lehenga with minimal yet impactful embroidery. Modern cut for cocktail receptions.' },
    { name: 'Rose Quartz Reception Lehenga', slug: 'rose-quartz-reception', price: 9500000, originalPrice: 11800000, category: 'reception', color: 'Pink', fabric: 'Organza', work: 'Crystal, Pearls', occasion: 'Reception', stock: 5, rating: 4.8, reviewCount: 91, featured: true, newArrival: true, imageIndex: 1, description: 'Delicate rose quartz pink lehenga with crystal embellishments. Feminine and romantic.' },
    { name: 'Wine Glamour Reception Set', slug: 'wine-glamour-reception', price: 10200000, originalPrice: 12500000, category: 'reception', color: 'Wine', fabric: 'Velvet & Net', work: 'Gold Thread, Sequins', occasion: 'Reception', stock: 4, rating: 4.7, reviewCount: 58, featured: false, newArrival: false, imageIndex: 5, description: 'Deep wine lehenga with gold accents. Dramatic and glamorous for statement lovers.' },
    { name: 'Lavender Dreams Reception Lehenga', slug: 'lavender-dreams-reception', price: 8800000, originalPrice: 10800000, category: 'reception', color: 'Purple', fabric: 'Tulle & Satin', work: 'Silver Thread', occasion: 'Reception', stock: 6, rating: 4.6, reviewCount: 45, featured: false, newArrival: true, imageIndex: 7, description: 'Soft lavender lehenga with silver thread work. Light and airy for outdoor evening receptions.' },
    { name: 'Emerald Night Reception Set', slug: 'emerald-night-reception', price: 11500000, originalPrice: 14000000, category: 'reception', color: 'Green', fabric: 'Silk Satin', work: 'Antique Embroidery', occasion: 'Reception', stock: 3, rating: 4.9, reviewCount: 72, featured: true, newArrival: false, imageIndex: 2, description: 'Rich emerald green lehenga with antique gold embroidery. Regal and sophisticated.' },
    { name: 'Dusty Rose Reception Lehenga', slug: 'dusty-rose-reception', price: 7800000, originalPrice: 9500000, category: 'reception', color: 'Pink', fabric: 'Georgette', work: 'Floral Embroidery', occasion: 'Reception', stock: 8, rating: 4.5, reviewCount: 63, featured: false, newArrival: false, imageIndex: 11, description: 'Trendy dusty rose lehenga with contemporary floral patterns. Perfect for intimate receptions.' },
    { name: 'Platinum Shimmer Reception Set', slug: 'platinum-shimmer-reception', price: 12500000, originalPrice: 15000000, category: 'reception', color: 'Ivory', fabric: 'Shimmer Net', work: 'Full Sequins', occasion: 'Reception', stock: 2, rating: 4.9, reviewCount: 38, featured: true, newArrival: true, imageIndex: 10, description: 'Ultra-glamorous platinum shimmer lehenga. All-over sequin work with crystal detailing.' },
    { name: 'Sage Green Modern Reception', slug: 'sage-green-modern-reception', price: 8200000, originalPrice: 10000000, category: 'reception', color: 'Green', fabric: 'Crepe & Organza', work: 'Minimal Embroidery', occasion: 'Reception', stock: 5, rating: 4.4, reviewCount: 49, featured: false, newArrival: false, imageIndex: 2, description: 'Contemporary sage green lehenga with minimalist design. Clean lines for modern brides.' },

    // ========== SANGEET SPECIAL (12 products) ==========
    { name: 'Hot Pink Sangeet Lehenga', slug: 'hot-pink-sangeet', price: 6200000, originalPrice: 7800000, category: 'sangeet', color: 'Pink', fabric: 'Georgette', work: 'Sequins, Mirrors', occasion: 'Sangeet', stock: 8, rating: 4.7, reviewCount: 124, featured: true, newArrival: false, imageIndex: 1, description: 'Vibrant hot pink lehenga perfect for sangeet night. Lightweight with all-over sequin work.' },
    { name: 'Electric Blue Dance Lehenga', slug: 'electric-blue-dance', price: 5500000, originalPrice: 6800000, category: 'sangeet', color: 'Blue', fabric: 'Georgette', work: 'Mirror Work, Sequins', occasion: 'Sangeet', stock: 10, rating: 4.6, reviewCount: 98, featured: false, newArrival: true, imageIndex: 3, description: 'Electric blue lehenga designed for dancing. Flowy silhouette with twirl-friendly skirt.' },
    { name: 'Purple Party Lehenga', slug: 'purple-party', price: 5800000, originalPrice: 7200000, category: 'sangeet', color: 'Purple', fabric: 'Crepe', work: 'Tassels, Sequins', occasion: 'Sangeet', stock: 7, rating: 4.5, reviewCount: 76, featured: false, newArrival: false, imageIndex: 7, description: 'Fun purple lehenga with playful tassel details. Perfect for brides who want to party.' },
    { name: 'Orange Sunshine Sangeet Set', slug: 'orange-sunshine-sangeet', price: 5200000, originalPrice: 6500000, category: 'sangeet', color: 'Orange', fabric: 'Georgette', work: 'Mirror Work', occasion: 'Sangeet', stock: 9, rating: 4.4, reviewCount: 67, featured: false, newArrival: false, imageIndex: 9, description: 'Bright orange lehenga that brings sunshine to your sangeet. Cheerful with mirror embellishments.' },
    { name: 'Fuchsia Fun Sangeet Lehenga', slug: 'fuchsia-fun-sangeet', price: 6500000, originalPrice: 8000000, category: 'sangeet', color: 'Magenta', fabric: 'Satin & Net', work: 'Sequins, Cutdana', occasion: 'Sangeet', stock: 6, rating: 4.8, reviewCount: 112, featured: true, newArrival: true, imageIndex: 1, description: 'Bold fuchsia lehenga with contemporary crop top style. Instagram-worthy and dance-floor ready.' },
    { name: 'Turquoise Twist Sangeet Set', slug: 'turquoise-twist-sangeet', price: 4800000, originalPrice: 6000000, category: 'sangeet', color: 'Teal', fabric: 'Chanderi', work: 'Gota Patti', occasion: 'Sangeet', stock: 8, rating: 4.5, reviewCount: 84, featured: false, newArrival: false, imageIndex: 2, description: 'Refreshing turquoise lehenga with golden thread work. Light for hours of dancing.' },
    { name: 'Coral Carnival Sangeet Lehenga', slug: 'coral-carnival-sangeet', price: 5600000, originalPrice: 7000000, category: 'sangeet', color: 'Coral', fabric: 'Georgette', work: 'Multi-Thread Work', occasion: 'Sangeet', stock: 7, rating: 4.6, reviewCount: 59, featured: false, newArrival: true, imageIndex: 11, description: 'Festive coral lehenga with multicolor thread embroidery. Carnival vibes for your sangeet.' },
    { name: 'Lime Green Glow Sangeet Set', slug: 'lime-green-glow-sangeet', price: 4500000, originalPrice: 5600000, category: 'sangeet', color: 'Green', fabric: 'Net & Satin', work: 'Mirrors, Neon Sequins', occasion: 'Sangeet', stock: 6, rating: 4.3, reviewCount: 45, featured: false, newArrival: false, imageIndex: 2, description: 'Eye-catching lime green lehenga that glows under party lights. Neon accents with traditional mirrors.' },
    { name: 'Red Ruffles Sangeet Lehenga', slug: 'red-ruffles-sangeet', price: 6800000, originalPrice: 8500000, category: 'sangeet', color: 'Red', fabric: 'Organza', work: 'Ruffles, Sequins', occasion: 'Sangeet', stock: 5, rating: 4.7, reviewCount: 93, featured: true, newArrival: false, imageIndex: 0, description: 'Dramatic red lehenga with cascading ruffles. Bold statement on the dance floor.' },
    { name: 'Gold Glitter Sangeet Set', slug: 'gold-glitter-sangeet', price: 7200000, originalPrice: 8800000, category: 'sangeet', color: 'Gold', fabric: 'Shimmer Net', work: 'All-Over Sequins', occasion: 'Sangeet', stock: 4, rating: 4.8, reviewCount: 78, featured: true, newArrival: true, imageIndex: 4, description: 'All-gold glitter lehenga that makes you the star of the night. Full sparkle mode!' },
    { name: 'Peach Pop Sangeet Lehenga', slug: 'peach-pop-sangeet', price: 4900000, originalPrice: 6200000, category: 'sangeet', color: 'Peach', fabric: 'Georgette', work: 'Scattered Sequins', occasion: 'Sangeet', stock: 9, rating: 4.4, reviewCount: 52, featured: false, newArrival: false, imageIndex: 6, description: 'Sweet peach lehenga with pop of sequins. Girly and fun for pre-wedding celebrations.' },
    { name: 'Multicolor Fiesta Sangeet Set', slug: 'multicolor-fiesta-sangeet', price: 5800000, originalPrice: 7200000, category: 'sangeet', color: 'Pink', fabric: 'Art Silk', work: 'Multi-Color Embroidery', occasion: 'Sangeet', stock: 5, rating: 4.6, reviewCount: 71, featured: false, newArrival: true, imageIndex: 8, description: 'Rainbow-inspired multicolor lehenga. Each panel features different colored embroidery.' },

    // ========== MEHENDI COLLECTION (12 products) ==========
    { name: 'Classic Green Mehendi Lehenga', slug: 'classic-green-mehendi', price: 4200000, originalPrice: 5200000, category: 'mehendi', color: 'Green', fabric: 'Georgette', work: 'Gota Patti, Mirrors', occasion: 'Mehendi', stock: 12, rating: 4.7, reviewCount: 156, featured: true, newArrival: false, imageIndex: 2, description: 'Traditional green lehenga perfect for mehendi ceremony. Gota patti work with mirror embellishments.' },
    { name: 'Yellow Sunshine Mehendi Set', slug: 'yellow-sunshine-mehendi', price: 3800000, originalPrice: 4800000, category: 'mehendi', color: 'Yellow', fabric: 'Chanderi', work: 'Gota Work, Lace', occasion: 'Mehendi, Haldi', stock: 15, rating: 4.6, reviewCount: 189, featured: true, newArrival: false, imageIndex: 8, description: 'Bright yellow lehenga that symbolizes new beginnings. Light and cheerful for the mehendi ritual.' },
    { name: 'Parrot Green Festive Lehenga', slug: 'parrot-green-festive', price: 4500000, originalPrice: 5500000, category: 'mehendi', color: 'Green', fabric: 'Banarasi Georgette', work: 'Bandhani, Gota', occasion: 'Mehendi', stock: 10, rating: 4.5, reviewCount: 134, featured: false, newArrival: true, imageIndex: 2, description: 'Vibrant parrot green lehenga with traditional Rajasthani work. Authentic cultural vibes.' },
    { name: 'Lemon Yellow Mehendi Lehenga', slug: 'lemon-yellow-mehendi', price: 3500000, originalPrice: 4400000, category: 'mehendi', color: 'Yellow', fabric: 'Cotton Silk', work: 'Thread Work', occasion: 'Mehendi', stock: 14, rating: 4.4, reviewCount: 98, featured: false, newArrival: false, imageIndex: 8, description: 'Fresh lemon yellow lehenga with delicate floral embroidery. Comfortable for hours of mehendi application.' },
    { name: 'Mint Green Contemporary Mehendi', slug: 'mint-green-contemporary-mehendi', price: 4800000, originalPrice: 6000000, category: 'mehendi', color: 'Green', fabric: 'Crepe', work: 'Sequins, Beads', occasion: 'Mehendi', stock: 8, rating: 4.6, reviewCount: 87, featured: false, newArrival: true, imageIndex: 2, description: 'Modern mint green lehenga with contemporary styling. Crop top blouse with high-waisted skirt.' },
    { name: 'Olive Green Boho Mehendi Set', slug: 'olive-green-boho-mehendi', price: 5200000, originalPrice: 6500000, category: 'mehendi', color: 'Green', fabric: 'Muslin', work: 'Tassels, Crochet', occasion: 'Mehendi', stock: 6, rating: 4.5, reviewCount: 65, featured: false, newArrival: false, imageIndex: 2, description: 'Bohemian olive green lehenga with tassel details. Perfect for garden mehendi celebrations.' },
    { name: 'Lime & Gold Mehendi Lehenga', slug: 'lime-gold-mehendi', price: 5500000, originalPrice: 6800000, category: 'mehendi', color: 'Green', fabric: 'Silk', work: 'Heavy Gota Patti', occasion: 'Mehendi', stock: 5, rating: 4.8, reviewCount: 112, featured: true, newArrival: false, imageIndex: 2, description: 'Striking lime green lehenga with heavy gold gota patti. A royal look for your mehendi.' },
    { name: 'Forest Green Mehendi Set', slug: 'forest-green-mehendi', price: 4600000, originalPrice: 5800000, category: 'mehendi', color: 'Green', fabric: 'Velvet & Net', work: 'Antique Embroidery', occasion: 'Mehendi', stock: 7, rating: 4.6, reviewCount: 78, featured: false, newArrival: true, imageIndex: 2, description: 'Deep forest green lehenga with antique gold embroidery. Rich and elegant for evening mehendi.' },
    { name: 'Pistachio Green Light Mehendi', slug: 'pistachio-green-light-mehendi', price: 3200000, originalPrice: 4000000, category: 'mehendi', color: 'Green', fabric: 'Cotton Blend', work: 'Light Embroidery', occasion: 'Mehendi', stock: 12, rating: 4.3, reviewCount: 56, featured: false, newArrival: false, imageIndex: 2, description: 'Light pistachio green lehenga for summer mehendi. Breathable fabric with minimal embroidery.' },
    { name: 'Saffron Yellow Mehendi Lehenga', slug: 'saffron-yellow-mehendi', price: 4000000, originalPrice: 5000000, category: 'mehendi', color: 'Yellow', fabric: 'Art Silk', work: 'Traditional Embroidery', occasion: 'Mehendi, Haldi', stock: 10, rating: 4.5, reviewCount: 94, featured: false, newArrival: false, imageIndex: 8, description: 'Auspicious saffron yellow lehenga with traditional motifs. Perfect blend of tradition and comfort.' },
    { name: 'Emerald Luxe Mehendi Set', slug: 'emerald-luxe-mehendi', price: 6200000, originalPrice: 7800000, category: 'mehendi', color: 'Green', fabric: 'Silk Brocade', work: 'Kundan, Zari', occasion: 'Mehendi', stock: 4, rating: 4.9, reviewCount: 67, featured: true, newArrival: true, imageIndex: 2, description: 'Luxurious emerald green lehenga with kundan and zari work. Grand statement at your mehendi.' },
    { name: 'Chartreuse Modern Mehendi', slug: 'chartreuse-modern-mehendi', price: 4400000, originalPrice: 5500000, category: 'mehendi', color: 'Green', fabric: 'Georgette', work: 'Peplum Style', occasion: 'Mehendi', stock: 6, rating: 4.4, reviewCount: 43, featured: false, newArrival: true, imageIndex: 2, description: 'Trendy chartreuse lehenga with western influences. Peplum blouse with flared skirt.' },

    // ========== ENGAGEMENT (12 products) ==========
    { name: 'Powder Pink Engagement Lehenga', slug: 'powder-pink-engagement', price: 6800000, originalPrice: 8500000, category: 'engagement', color: 'Pink', fabric: 'Net & Satin', work: 'Pearl Work, Sequins', occasion: 'Engagement', stock: 6, rating: 4.8, reviewCount: 134, featured: true, newArrival: false, imageIndex: 1, description: 'Elegant powder pink lehenga perfect for engagement ceremonies. Subtle yet stunning with pearl detailing.' },
    { name: 'Peach Dream Engagement Set', slug: 'peach-dream-engagement', price: 7200000, originalPrice: 9000000, category: 'engagement', color: 'Peach', fabric: 'Organza', work: '3D Flowers', occasion: 'Engagement', stock: 5, rating: 4.7, reviewCount: 98, featured: false, newArrival: true, imageIndex: 6, description: 'Romantic peach lehenga with 3D floral appliqué. Perfect for the bride-to-be who loves florals.' },
    { name: 'Mauve Sophistication Engagement', slug: 'mauve-sophistication-engagement', price: 7500000, originalPrice: 9200000, category: 'engagement', color: 'Purple', fabric: 'Crepe Silk', work: 'Minimal Embroidery', occasion: 'Engagement', stock: 4, rating: 4.6, reviewCount: 76, featured: false, newArrival: false, imageIndex: 7, description: 'Sophisticated mauve lehenga with contemporary design. Clean lines with strategic embellishments.' },
    { name: 'Blush Rose Engagement Lehenga', slug: 'blush-rose-engagement', price: 8200000, originalPrice: 10000000, category: 'engagement', color: 'Pink', fabric: 'Tulle & Silk', work: 'Rose Gold Thread', occasion: 'Engagement', stock: 5, rating: 4.9, reviewCount: 112, featured: true, newArrival: true, imageIndex: 1, description: 'Delicate blush rose lehenga with rose gold embroidery. Feminine and elegant for your special day.' },
    { name: 'Sky Blue Engagement Set', slug: 'sky-blue-engagement', price: 6500000, originalPrice: 8000000, category: 'engagement', color: 'Blue', fabric: 'Organza', work: 'Silver Thread', occasion: 'Engagement', stock: 7, rating: 4.5, reviewCount: 67, featured: false, newArrival: false, imageIndex: 3, description: 'Fresh sky blue lehenga for day engagements. Light and airy with silver thread work.' },
    { name: 'Ivory Elegance Engagement Lehenga', slug: 'ivory-elegance-engagement', price: 8800000, originalPrice: 10800000, category: 'engagement', color: 'Ivory', fabric: 'Raw Silk', work: 'Zari, Sequins', occasion: 'Engagement', stock: 4, rating: 4.8, reviewCount: 89, featured: true, newArrival: false, imageIndex: 10, description: 'Classic ivory lehenga with gold zari work. Timeless elegance for the traditional bride-to-be.' },
    { name: 'Lilac Love Engagement Set', slug: 'lilac-love-engagement', price: 5800000, originalPrice: 7200000, category: 'engagement', color: 'Purple', fabric: 'Georgette', work: 'Thread Work', occasion: 'Engagement', stock: 8, rating: 4.4, reviewCount: 54, featured: false, newArrival: true, imageIndex: 7, description: 'Sweet lilac lehenga with dreamy embroidery. Perfect for intimate engagement ceremonies.' },
    { name: 'Coral Charm Engagement Lehenga', slug: 'coral-charm-engagement', price: 6200000, originalPrice: 7800000, category: 'engagement', color: 'Coral', fabric: 'Net', work: 'Cape Style', occasion: 'Engagement', stock: 6, rating: 4.6, reviewCount: 71, featured: false, newArrival: false, imageIndex: 11, description: 'Charming coral lehenga with contemporary styling. Features a stylish cape dupatta.' },
    { name: 'Champagne Toast Engagement Set', slug: 'champagne-toast-engagement', price: 9200000, originalPrice: 11500000, category: 'engagement', color: 'Gold', fabric: 'Tissue', work: 'Crystals, Sequins', occasion: 'Engagement', stock: 3, rating: 4.9, reviewCount: 92, featured: true, newArrival: true, imageIndex: 10, description: 'Luxurious champagne lehenga with crystal embellishments. For the bride who loves sparkle.' },
    { name: 'Mint Fresh Engagement Lehenga', slug: 'mint-fresh-engagement', price: 5500000, originalPrice: 6800000, category: 'engagement', color: 'Green', fabric: 'Organza', work: 'Light Embroidery', occasion: 'Engagement', stock: 7, rating: 4.5, reviewCount: 63, featured: false, newArrival: false, imageIndex: 2, description: 'Refreshing mint lehenga for morning engagements. Light, comfortable, and Instagram-perfect.' },
    { name: 'Rose Petal Engagement Set', slug: 'rose-petal-engagement', price: 7800000, originalPrice: 9500000, category: 'engagement', color: 'Pink', fabric: 'Satin & Net', work: 'Petal Appliqué', occasion: 'Engagement', stock: 5, rating: 4.7, reviewCount: 84, featured: false, newArrival: true, imageIndex: 1, description: 'Romantic rose-inspired lehenga with petal detailing. Enchanting for garden engagements.' },
    { name: 'Silver Lining Engagement Lehenga', slug: 'silver-lining-engagement', price: 8500000, originalPrice: 10500000, category: 'engagement', color: 'Ivory', fabric: 'Metallic Net', work: 'All-Over Shimmer', occasion: 'Engagement', stock: 4, rating: 4.8, reviewCount: 78, featured: true, newArrival: false, imageIndex: 10, description: 'Stunning silver lehenga that shimmers beautifully. Modern and glamorous for evening engagements.' },

    // ========== FESTIVE COLLECTION (12 products) ==========
    { name: 'Red Festive Celebration Lehenga', slug: 'red-festive-celebration', price: 4800000, originalPrice: 6000000, category: 'festive', color: 'Red', fabric: 'Art Silk', work: 'Zari Border', occasion: 'Festive, Diwali', stock: 15, rating: 4.6, reviewCount: 167, featured: true, newArrival: false, imageIndex: 0, description: 'Traditional red festive lehenga for Diwali and other celebrations. Classic design with modern comfort.' },
    { name: 'Orange Marigold Festive Set', slug: 'orange-marigold-festive', price: 4200000, originalPrice: 5200000, category: 'festive', color: 'Orange', fabric: 'Chanderi', work: 'Floral Embroidery', occasion: 'Festive', stock: 12, rating: 4.5, reviewCount: 134, featured: false, newArrival: false, imageIndex: 9, description: 'Vibrant orange lehenga inspired by marigold flowers. Perfect for puja and festive gatherings.' },
    { name: 'Maroon Elegance Festive Lehenga', slug: 'maroon-elegance-festive', price: 5500000, originalPrice: 6800000, category: 'festive', color: 'Maroon', fabric: 'Silk', work: 'Heavy Border', occasion: 'Festive, Karwa Chauth', stock: 8, rating: 4.7, reviewCount: 98, featured: false, newArrival: true, imageIndex: 5, description: 'Rich maroon lehenga for grand festive occasions. Heavy border with light body work.' },
    { name: 'Golden Diwali Special Lehenga', slug: 'golden-diwali-special', price: 6200000, originalPrice: 7800000, category: 'festive', color: 'Gold', fabric: 'Tissue Silk', work: 'Shimmer, Zari', occasion: 'Diwali, Festive', stock: 6, rating: 4.8, reviewCount: 145, featured: true, newArrival: true, imageIndex: 4, description: 'Shimmering gold lehenga perfect for Diwali celebrations. All-over shimmer with traditional motifs.' },
    { name: 'Pink Celebration Festive Set', slug: 'pink-celebration-festive', price: 4500000, originalPrice: 5600000, category: 'festive', color: 'Pink', fabric: 'Georgette', work: 'Thread Work', occasion: 'Festive', stock: 10, rating: 4.4, reviewCount: 89, featured: false, newArrival: false, imageIndex: 1, description: 'Pretty pink festive lehenga for all your celebrations. Light and comfortable for long events.' },
    { name: 'Teal Tradition Festive Lehenga', slug: 'teal-tradition-festive', price: 5200000, originalPrice: 6500000, category: 'festive', color: 'Teal', fabric: 'Banarasi', work: 'Traditional Weave', occasion: 'Festive', stock: 7, rating: 4.6, reviewCount: 76, featured: false, newArrival: false, imageIndex: 2, description: 'Beautiful teal lehenga with traditional patterns. Perfect balance of color and elegance.' },
    { name: 'Purple Royal Festive Set', slug: 'purple-royal-festive', price: 5800000, originalPrice: 7200000, category: 'festive', color: 'Purple', fabric: 'Silk Blend', work: 'Gold Embroidery', occasion: 'Festive', stock: 6, rating: 4.7, reviewCount: 67, featured: true, newArrival: true, imageIndex: 7, description: 'Royal purple lehenga for special festive occasions. Rich color with gold embroidery.' },
    { name: 'Cream Classic Festive Lehenga', slug: 'cream-classic-festive', price: 4800000, originalPrice: 6000000, category: 'festive', color: 'Ivory', fabric: 'Art Silk', work: 'Minimal Embroidery', occasion: 'Festive', stock: 9, rating: 4.5, reviewCount: 112, featured: false, newArrival: false, imageIndex: 10, description: 'Elegant cream lehenga that goes with every occasion. Versatile and timelessly beautiful.' },
    { name: 'Coral Charm Festive Set', slug: 'coral-charm-festive', price: 4400000, originalPrice: 5500000, category: 'festive', color: 'Coral', fabric: 'Georgette', work: 'Light Work', occasion: 'Festive', stock: 11, rating: 4.4, reviewCount: 58, featured: false, newArrival: true, imageIndex: 11, description: 'Fresh coral lehenga for daytime festive events. Light, pretty, and comfortable.' },
    { name: 'Blue Sapphire Festive Lehenga', slug: 'blue-sapphire-festive', price: 5600000, originalPrice: 7000000, category: 'festive', color: 'Blue', fabric: 'Silk Satin', work: 'Zardozi', occasion: 'Festive', stock: 5, rating: 4.8, reviewCount: 94, featured: true, newArrival: false, imageIndex: 3, description: 'Deep sapphire blue lehenga for evening festivities. Rich and regal appearance.' },
    { name: 'Magenta Magic Festive Set', slug: 'magenta-magic-festive', price: 5000000, originalPrice: 6200000, category: 'festive', color: 'Magenta', fabric: 'Chanderi', work: 'Gota Patti', occasion: 'Festive', stock: 8, rating: 4.5, reviewCount: 73, featured: false, newArrival: false, imageIndex: 1, description: 'Vibrant magenta lehenga that stands out. Bold and beautiful for festive celebrations.' },
    { name: 'Peach Glow Festive Lehenga', slug: 'peach-glow-festive', price: 4600000, originalPrice: 5800000, category: 'festive', color: 'Peach', fabric: 'Net & Silk', work: 'Sequin Scatter', occasion: 'Festive', stock: 10, rating: 4.6, reviewCount: 81, featured: false, newArrival: true, imageIndex: 6, description: 'Soft peach lehenga with a subtle glow. Perfect for intimate festive gatherings.' },

    // ========== DESIGNER PICKS (13 products) ==========
    { name: 'Couture Rose Designer Lehenga', slug: 'couture-rose-designer', price: 12500000, originalPrice: 15500000, category: 'designer', color: 'Pink', fabric: 'French Net', work: 'Couture Embroidery', occasion: 'Wedding, Reception', stock: 2, rating: 4.9, reviewCount: 45, featured: true, newArrival: true, imageIndex: 1, description: 'Haute couture rose lehenga from our designer collection. Unique silhouette with artistic embroidery.' },
    { name: 'Abstract Art Designer Set', slug: 'abstract-art-designer', price: 13500000, originalPrice: 16800000, category: 'designer', color: 'Purple', fabric: 'Organza', work: 'Abstract Patterns', occasion: 'Reception, Events', stock: 2, rating: 4.8, reviewCount: 32, featured: true, newArrival: false, imageIndex: 7, description: 'Contemporary abstract design lehenga. Artistic patterns that make a unique style statement.' },
    { name: 'Geometric Glam Designer Lehenga', slug: 'geometric-glam-designer', price: 11800000, originalPrice: 14500000, category: 'designer', color: 'Blue', fabric: 'Satin', work: 'Geometric Embroidery', occasion: 'Events', stock: 3, rating: 4.7, reviewCount: 28, featured: false, newArrival: true, imageIndex: 3, description: 'Bold geometric patterns in a stunning lehenga. Modern art meets traditional craft.' },
    { name: 'Minimalist Chic Designer Set', slug: 'minimalist-chic-designer', price: 9500000, originalPrice: 11800000, category: 'designer', color: 'Ivory', fabric: 'Crepe', work: 'Minimal', occasion: 'Wedding, Reception', stock: 4, rating: 4.6, reviewCount: 54, featured: false, newArrival: false, imageIndex: 10, description: 'Clean lines and minimal embellishments for the modern minimalist. Less is more elegance.' },
    { name: 'Bohemian Dreams Designer Lehenga', slug: 'bohemian-dreams-designer', price: 10800000, originalPrice: 13500000, category: 'designer', color: 'Peach', fabric: 'Chiffon', work: 'Boho Elements', occasion: 'Destination Wedding', stock: 3, rating: 4.8, reviewCount: 41, featured: true, newArrival: true, imageIndex: 6, description: 'Free-spirited bohemian design with flowing silhouettes. For the unconventional bride.' },
    { name: 'Victorian Romance Designer Set', slug: 'victorian-romance-designer', price: 14500000, originalPrice: 18000000, category: 'designer', color: 'Pink', fabric: 'Lace & Silk', work: 'Victorian Style', occasion: 'Wedding', stock: 2, rating: 4.9, reviewCount: 36, featured: true, newArrival: false, imageIndex: 1, description: 'Victorian-inspired design with Indian craftsmanship. Romantic ruffles and delicate lace.' },
    { name: 'Structured Elegance Designer Lehenga', slug: 'structured-elegance-designer', price: 11500000, originalPrice: 14200000, category: 'designer', color: 'Maroon', fabric: 'Taffeta', work: 'Structured Design', occasion: 'Reception', stock: 3, rating: 4.7, reviewCount: 29, featured: false, newArrival: true, imageIndex: 5, description: 'Architectural silhouette with structured bodice. For the bold bride who loves drama.' },
    { name: 'Pastel Fantasy Designer Set', slug: 'pastel-fantasy-designer', price: 10200000, originalPrice: 12800000, category: 'designer', color: 'Purple', fabric: 'Organza', work: 'Watercolor Print', occasion: 'Day Wedding', stock: 4, rating: 4.6, reviewCount: 47, featured: false, newArrival: false, imageIndex: 7, description: 'Dreamy pastel palette lehenga with watercolor effects. Ethereal and otherworldly.' },
    { name: 'Metallic Marvel Designer Lehenga', slug: 'metallic-marvel-designer', price: 12800000, originalPrice: 15800000, category: 'designer', color: 'Gold', fabric: 'Metallic Tissue', work: 'Metallic Finish', occasion: 'Reception', stock: 2, rating: 4.8, reviewCount: 23, featured: true, newArrival: true, imageIndex: 4, description: 'Futuristic metallic finish with traditional elements. A bold statement piece.' },
    { name: 'Floral Paradise Designer Set', slug: 'floral-paradise-designer', price: 11200000, originalPrice: 14000000, category: 'designer', color: 'Peach', fabric: 'Tulle', work: '3D Florals', occasion: 'Garden Wedding', stock: 3, rating: 4.9, reviewCount: 58, featured: true, newArrival: false, imageIndex: 6, description: 'Garden-inspired floral extravaganza. 3D flowers and botanical embroidery throughout.' },
    { name: 'Midnight Glamour Designer Lehenga', slug: 'midnight-glamour-designer', price: 13800000, originalPrice: 17200000, category: 'designer', color: 'Blue', fabric: 'Velvet & Net', work: 'Celestial Motifs', occasion: 'Night Reception', stock: 2, rating: 4.8, reviewCount: 34, featured: false, newArrival: true, imageIndex: 3, description: 'Dramatic midnight blue with celestial embroidery. Stars and moon motifs throughout.' },
    { name: 'Earthy Tones Designer Set', slug: 'earthy-tones-designer', price: 9800000, originalPrice: 12200000, category: 'designer', color: 'Orange', fabric: 'Organic Silk', work: 'Natural Dyes', occasion: 'Eco Wedding', stock: 4, rating: 4.7, reviewCount: 42, featured: false, newArrival: false, imageIndex: 9, description: 'Organic color palette with natural embroidery. Sustainable and ethically crafted.' },
    { name: 'Statement Sleeves Designer Lehenga', slug: 'statement-sleeves-designer', price: 12200000, originalPrice: 15200000, category: 'designer', color: 'Red', fabric: 'Silk Blend', work: 'Dramatic Sleeves', occasion: 'Fashion Wedding', stock: 2, rating: 4.9, reviewCount: 31, featured: true, newArrival: true, imageIndex: 0, description: 'Dramatic statement sleeves with fitted silhouette. Fashion-forward bridal wear.' },

    // ========== WEDDING GUEST (12 products) ==========
    { name: 'Elegant Guest Pink Lehenga', slug: 'elegant-guest-pink', price: 3500000, originalPrice: 4400000, category: 'wedding', color: 'Pink', fabric: 'Georgette', work: 'Light Embroidery', occasion: 'Wedding Guest', stock: 15, rating: 4.5, reviewCount: 178, featured: true, newArrival: false, imageIndex: 1, description: 'Perfect pink lehenga for wedding guests. Elegant yet not overpowering the bride.' },
    { name: 'Teal Guest Lehenga Set', slug: 'teal-guest-lehenga', price: 3800000, originalPrice: 4800000, category: 'wedding', color: 'Teal', fabric: 'Art Silk', work: 'Zari Border', occasion: 'Wedding Guest', stock: 12, rating: 4.4, reviewCount: 145, featured: false, newArrival: true, imageIndex: 2, description: 'Beautiful teal lehenga appropriate for wedding functions. Stylish yet respectful.' },
    { name: 'Wine Guest Special Lehenga', slug: 'wine-guest-special', price: 4200000, originalPrice: 5200000, category: 'wedding', color: 'Wine', fabric: 'Velvet & Net', work: 'Embroidery', occasion: 'Wedding Guest', stock: 10, rating: 4.6, reviewCount: 132, featured: false, newArrival: false, imageIndex: 5, description: 'Rich wine colored lehenga for wedding guests. Stand out without outdoing the bride.' },
    { name: 'Pastel Blue Guest Set', slug: 'pastel-blue-guest', price: 3200000, originalPrice: 4000000, category: 'wedding', color: 'Blue', fabric: 'Chanderi', work: 'Light Work', occasion: 'Wedding Guest', stock: 14, rating: 4.3, reviewCount: 98, featured: false, newArrival: false, imageIndex: 3, description: 'Soft pastel blue perfect for daytime weddings. Light and comfortable for all-day events.' },
    { name: 'Coral Guest Lehenga', slug: 'coral-guest', price: 3600000, originalPrice: 4500000, category: 'wedding', color: 'Coral', fabric: 'Georgette', work: 'Scattered Sequins', occasion: 'Wedding Guest', stock: 11, rating: 4.5, reviewCount: 87, featured: false, newArrival: true, imageIndex: 11, description: 'Fresh coral lehenga for summer weddings. Cheerful and festive appearance.' },
    { name: 'Mustard Gold Guest Set', slug: 'mustard-gold-guest', price: 4000000, originalPrice: 5000000, category: 'wedding', color: 'Yellow', fabric: 'Silk Blend', work: 'Gold Thread', occasion: 'Wedding Guest', stock: 9, rating: 4.6, reviewCount: 76, featured: true, newArrival: false, imageIndex: 8, description: 'Trendy mustard gold lehenga for modern wedding guests. Photographs beautifully.' },
    { name: 'Olive Green Guest Lehenga', slug: 'olive-green-guest', price: 3400000, originalPrice: 4200000, category: 'wedding', color: 'Green', fabric: 'Crepe', work: 'Minimal Embroidery', occasion: 'Wedding Guest', stock: 13, rating: 4.4, reviewCount: 65, featured: false, newArrival: false, imageIndex: 2, description: 'Sophisticated olive green for wedding guests. Understated elegance that impresses.' },
    { name: 'Lavender Dream Guest Set', slug: 'lavender-dream-guest', price: 3800000, originalPrice: 4800000, category: 'wedding', color: 'Purple', fabric: 'Net & Satin', work: 'Thread Work', occasion: 'Wedding Guest', stock: 10, rating: 4.5, reviewCount: 92, featured: false, newArrival: true, imageIndex: 7, description: 'Dreamy lavender lehenga for romantic weddings. Soft and feminine appearance.' },
    { name: 'Peach Perfect Guest Lehenga', slug: 'peach-perfect-guest', price: 3500000, originalPrice: 4400000, category: 'wedding', color: 'Peach', fabric: 'Georgette', work: 'Sequins', occasion: 'Wedding Guest', stock: 12, rating: 4.6, reviewCount: 104, featured: true, newArrival: false, imageIndex: 6, description: 'Sweet peach lehenga ideal for being the perfect wedding guest. Flattering on all skin tones.' },
    { name: 'Maroon Traditional Guest Set', slug: 'maroon-traditional-guest', price: 4500000, originalPrice: 5600000, category: 'wedding', color: 'Maroon', fabric: 'Art Silk', work: 'Traditional Embroidery', occasion: 'Wedding Guest', stock: 8, rating: 4.7, reviewCount: 118, featured: false, newArrival: false, imageIndex: 5, description: 'Classic maroon for traditional weddings. Respects customs while looking stunning.' },
    { name: 'Ivory Elegance Guest Lehenga', slug: 'ivory-elegance-guest', price: 4200000, originalPrice: 5200000, category: 'wedding', color: 'Ivory', fabric: 'Silk', work: 'Subtle Embroidery', occasion: 'Wedding Guest', stock: 7, rating: 4.5, reviewCount: 83, featured: false, newArrival: true, imageIndex: 10, description: 'Elegant ivory lehenga for sophisticated wedding guests. Timeless and graceful.' },
    { name: 'Royal Blue Guest Set', slug: 'royal-blue-guest', price: 4800000, originalPrice: 6000000, category: 'wedding', color: 'Blue', fabric: 'Silk Satin', work: 'Gold Embroidery', occasion: 'Wedding Guest', stock: 6, rating: 4.8, reviewCount: 95, featured: true, newArrival: false, imageIndex: 3, description: 'Stunning royal blue lehenga for evening weddings. Rich and regal appearance.' },
  ];

  // Create products
  let productCount = 0;
  for (const product of productsData) {
    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        categoryId: categories[product.category].id,
        colorId: colors[product.color].id,
        fabric: product.fabric,
        work: product.work,
        occasion: product.occasion,
        stock: product.stock,
        rating: product.rating,
        reviewCount: product.reviewCount,
        featured: product.featured,
        newArrival: product.newArrival,
        images: {
          create: [
            { url: getImageUrl(product.imageIndex, '800&h=1000'), isPrimary: true, sortOrder: 0 },
            { url: getImageUrl((product.imageIndex + 1) % 20, '800&h=1000'), isPrimary: false, sortOrder: 1 },
            { url: getImageUrl((product.imageIndex + 2) % 20, '800&h=1000'), isPrimary: false, sortOrder: 2 },
          ]
        }
      }
    });
    productCount++;
  }
  console.log(`✅ Created ${productCount} products`);

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 12);
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@houseoflehenga.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+91 98765 43210',
      role: 'ADMIN'
    }
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'priya.sharma@email.com',
        password: hashedPassword,
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+91 98765 11111',
        role: 'CUSTOMER'
      }
    }),
    prisma.user.create({
      data: {
        email: 'anjali.patel@email.com',
        password: hashedPassword,
        firstName: 'Anjali',
        lastName: 'Patel',
        phone: '+91 98765 22222',
        role: 'CUSTOMER'
      }
    }),
    prisma.user.create({
      data: {
        email: 'meera.reddy@email.com',
        password: hashedPassword,
        firstName: 'Meera',
        lastName: 'Reddy',
        phone: '+91 98765 33333',
        role: 'CUSTOMER'
      }
    }),
    prisma.user.create({
      data: {
        email: 'sakshi.gupta@email.com',
        password: hashedPassword,
        firstName: 'Sakshi',
        lastName: 'Gupta',
        phone: '+91 98765 44444',
        role: 'CUSTOMER'
      }
    }),
    prisma.user.create({
      data: {
        email: 'neha.singh@email.com',
        password: hashedPassword,
        firstName: 'Neha',
        lastName: 'Singh',
        phone: '+91 98765 55555',
        role: 'CUSTOMER'
      }
    }),
  ]);

  console.log(`✅ Created ${users.length + 1} users (including admin)`);

  // Create addresses for users
  const addressesData = [
    { userId: users[0].id, fullName: 'Priya Sharma', phone: '+91 98765 11111', addressLine1: '42 Park Street', addressLine2: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', isDefault: true },
    { userId: users[0].id, fullName: 'Priya Sharma', phone: '+91 98765 11111', addressLine1: '15 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001', isDefault: false },
    { userId: users[1].id, fullName: 'Anjali Patel', phone: '+91 98765 22222', addressLine1: '78 CG Road', addressLine2: 'Navrangpura', city: 'Ahmedabad', state: 'Gujarat', pincode: '380009', isDefault: true },
    { userId: users[2].id, fullName: 'Meera Reddy', phone: '+91 98765 33333', addressLine1: '23 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500033', isDefault: true },
    { userId: users[3].id, fullName: 'Sakshi Gupta', phone: '+91 98765 44444', addressLine1: '56 Vasant Kunj', addressLine2: 'Sector B', city: 'New Delhi', state: 'Delhi', pincode: '110070', isDefault: true },
    { userId: users[4].id, fullName: 'Neha Singh', phone: '+91 98765 55555', addressLine1: '89 Koramangala', addressLine2: '5th Block', city: 'Bangalore', state: 'Karnataka', pincode: '560095', isDefault: true },
  ];

  for (const address of addressesData) {
    await prisma.address.create({ data: address });
  }
  console.log(`✅ Created ${addressesData.length} addresses`);

  // Get some products for reviews and orders
  const sampleProducts = await prisma.product.findMany({ take: 20 });

  // Create reviews
  const reviewTexts = [
    { title: 'Absolutely Stunning!', text: 'The craftsmanship is impeccable and the colors are even more beautiful in person. Received so many compliments on my wedding day!' },
    { title: 'Perfect Quality', text: 'The quality exceeded my expectations. The embroidery work is exquisite and the fit was perfect. House of Lehenga truly delivers luxury.' },
    { title: 'Beautiful Detail Work', text: 'Beautiful lehenga with amazing detail work. Shipping was quick and the packaging was premium. Would definitely recommend!' },
    { title: 'Felt Like Royalty', text: 'I felt like royalty wearing this lehenga! The fabric quality is outstanding and the colors dont fade even after multiple wearings.' },
    { title: 'Worth Every Penny', text: 'Worth every penny! The attention to detail is remarkable. My bridal lehenga was everything I dreamed of and more.' },
    { title: 'Exceptional Service', text: 'Not only is the lehenga gorgeous, but the customer service was exceptional. They helped me with customizations.' },
    { title: 'Perfect Fit', text: 'The size guide was accurate and the lehenga fit perfectly. The color matched exactly what was shown on the website.' },
    { title: 'Stunning Design', text: 'Such a stunning design! I wore this to my best friends wedding and everyone asked where I got it from.' },
  ];

  const userPhotos = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop',
    'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=60&h=60&fit=crop',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=60&h=60&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop',
  ];

  let reviewCount = 0;
  for (let i = 0; i < Math.min(sampleProducts.length, 15); i++) {
    const product = sampleProducts[i];
    const user = users[i % users.length];
    const reviewData = reviewTexts[i % reviewTexts.length];

    await prisma.review.create({
      data: {
        userId: user.id,
        productId: product.id,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        title: reviewData.title,
        comment: reviewData.text,
        images: i % 3 === 0 ? [getImageUrl(i, '300&h=400')] : [],
        isVerified: true,
        isApproved: true,
      }
    });
    reviewCount++;
  }
  console.log(`✅ Created ${reviewCount} reviews`);

  // Create sample orders
  const addresses = await prisma.address.findMany();

  const orderStatuses = ['DELIVERED', 'SHIPPED', 'PROCESSING', 'CONFIRMED', 'PENDING'];
  const paymentStatuses = ['PAID', 'PAID', 'PAID', 'PENDING', 'PENDING'];

  let orderCount = 0;
  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length];
    const address = addresses.find(a => a.userId === user.id);
    if (!address) continue;

    const orderProducts = sampleProducts.slice(i * 2, i * 2 + 2);
    const subtotal = orderProducts.reduce((sum, p) => sum + p.price, 0);
    const shippingCost = subtotal > 500000 ? 0 : 50000;

    await prisma.order.create({
      data: {
        orderNumber: `HOL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        userId: user.id,
        addressId: address.id,
        status: orderStatuses[i] as any,
        paymentStatus: paymentStatuses[i] as any,
        paymentMethod: 'Card',
        subtotal,
        shippingCost,
        total: subtotal + shippingCost,
        items: {
          create: orderProducts.map(p => ({
            productId: p.id,
            quantity: 1,
            price: p.price,
          }))
        }
      }
    });
    orderCount++;
  }
  console.log(`✅ Created ${orderCount} orders`);

  // Add some items to carts
  for (let i = 0; i < 3; i++) {
    const user = users[i];
    const product = sampleProducts[i + 10];
    await prisma.cartItem.create({
      data: {
        userId: user.id,
        productId: product.id,
        quantity: 1,
      }
    });
  }
  console.log(`✅ Created 3 cart items`);

  // Add some items to wishlists
  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length];
    const product = sampleProducts[i + 5];
    await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        productId: product.id,
      }
    });
  }
  console.log(`✅ Created 5 wishlist items`);

  console.log('\n🎉 Database seeding completed!');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin: admin@houseoflehenga.com / admin123');
  console.log('   User:  priya.sharma@email.com / password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
