// Format price from paise to rupees string
export const formatPrice = (priceInPaise: number): string => {
  const rupees = priceInPaise / 100;
  return `₹${rupees.toLocaleString('en-IN')}`;
};

// Calculate discount percentage
export const discountPercent = (original: number, current: number): number => {
  return Math.round(((original - current) / original) * 100);
};

// Generate order number
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HOL-${timestamp}-${random}`;
};

// Slugify text
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
