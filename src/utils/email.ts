// Email service for House of Lehenga
// Requires nodemailer to be installed: npm install nodemailer @types/nodemailer

// Note: Install nodemailer first:
// npm install nodemailer
// npm install @types/nodemailer --save-dev

// For now, this module provides the email templates and a mock sender
// Once nodemailer is installed, uncomment the transport section

import prisma from './prisma';

// Email configuration (add to .env)
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_USER=your-email@gmail.com
// SMTP_PASS=your-app-password
// SMTP_FROM=House of Lehenga <noreply@houseoflehenga.com>

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Mock email sender (logs to console in development)
async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // In production, this would use nodemailer
    // For now, log the email details
    console.log('📧 Email would be sent:', {
      to: options.to,
      subject: options.subject,
      preview: options.html.substring(0, 100) + '...'
    });

    // Uncomment when nodemailer is installed:
    /*
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    */

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Email template wrapper
function emailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>House of Lehenga</title>
      <style>
        body { font-family: 'Georgia', serif; line-height: 1.6; color: #2c1810; margin: 0; padding: 0; background-color: #fef9f3; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #8b1538 0%, #a01c44 100%); padding: 30px; text-align: center; }
        .header h1 { color: #d4af37; margin: 0; font-size: 28px; letter-spacing: 2px; }
        .header p { color: #fef9f3; margin: 5px 0 0; font-size: 12px; }
        .content { padding: 30px; }
        .footer { background-color: #2c1810; color: #fef9f3; padding: 20px; text-align: center; font-size: 12px; }
        .footer a { color: #d4af37; }
        .btn { display: inline-block; background-color: #8b1538; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .order-item { border-bottom: 1px solid #eee; padding: 15px 0; display: flex; }
        .order-item img { width: 80px; height: 100px; object-fit: cover; margin-right: 15px; }
        .price { color: #8b1538; font-weight: bold; }
        .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-confirmed { background: #e8f5e9; color: #2e7d32; }
        .status-shipped { background: #e3f2fd; color: #1565c0; }
        .status-delivered { background: #f3e5f5; color: #7b1fa2; }
        .timeline { margin: 20px 0; }
        .timeline-item { display: flex; margin-bottom: 15px; }
        .timeline-dot { width: 12px; height: 12px; border-radius: 50%; background: #d4af37; margin-right: 15px; margin-top: 5px; }
        .timeline-dot.inactive { background: #ddd; }
        .gold-text { color: #d4af37; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HOUSE OF LEHENGA</h1>
          <p>~ Where Tradition Meets Royalty ~</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Thank you for choosing House of Lehenga</p>
          <p>
            <a href="#">Shop</a> |
            <a href="#">Track Order</a> |
            <a href="#">Contact Us</a>
          </p>
          <p style="margin-top: 15px; color: #888;">
            House of Lehenga, Mumbai, India<br>
            <a href="#">Unsubscribe</a> from promotional emails
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Format price in INR
function formatPrice(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

// Order confirmation email
export async function sendOrderConfirmation(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 }
            }
          }
        }
      },
      shippingAddress: true
    }
  });

  if (!order) return false;

  const itemsHtml = order.items.map(item => `
    <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
      <table width="100%">
        <tr>
          <td width="100" style="vertical-align: top;">
            <div style="width: 80px; height: 100px; background: #f5f5f5; display: flex; align-items: center; justify-content: center;">
              ${item.product.images[0]?.publicId ? `<img src="https://res.cloudinary.com/demo/image/upload/w_80,h_100,c_fill/${item.product.images[0].publicId}" alt="${item.product.name}" style="max-width: 80px;">` : ''}
            </div>
          </td>
          <td style="vertical-align: top; padding-left: 15px;">
            <strong>${item.product.name}</strong><br>
            <span style="color: #666;">Qty: ${item.quantity}</span><br>
            <span class="price">${formatPrice(item.price)}</span>
          </td>
        </tr>
      </table>
    </div>
  `).join('');

  const content = `
    <h2 style="color: #8b1538; margin-top: 0;">Order Confirmed! 🎉</h2>

    <p>Dear ${order.user.firstName || 'Valued Customer'},</p>

    <p>Thank you for your order! We're thrilled to have you as part of the House of Lehenga family. Your order has been confirmed and our artisans are preparing your beautiful pieces with utmost care.</p>

    <div style="background: #fef9f3; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Order Number:</strong> <span class="gold-text">${order.orderNumber}</span></p>
      <p style="margin: 10px 0 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <h3 style="color: #2c1810;">Order Summary</h3>
    ${itemsHtml}

    <table width="100%" style="margin-top: 20px;">
      <tr>
        <td>Subtotal:</td>
        <td align="right">${formatPrice(order.subtotal)}</td>
      </tr>
      ${order.discount > 0 ? `
      <tr style="color: #2e7d32;">
        <td>Discount:</td>
        <td align="right">-${formatPrice(order.discount)}</td>
      </tr>
      ` : ''}
      <tr>
        <td>Shipping:</td>
        <td align="right">${order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}</td>
      </tr>
      <tr style="font-size: 18px; font-weight: bold;">
        <td style="padding-top: 10px; border-top: 2px solid #d4af37;">Total:</td>
        <td align="right" style="padding-top: 10px; border-top: 2px solid #d4af37; color: #8b1538;">${formatPrice(order.total)}</td>
      </tr>
    </table>

    <h3 style="color: #2c1810; margin-top: 30px;">Shipping Address</h3>
    <p style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
      ${order.shippingAddress?.fullName}<br>
      ${order.shippingAddress?.addressLine1}<br>
      ${order.shippingAddress?.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
      ${order.shippingAddress?.city}, ${order.shippingAddress?.state} ${order.shippingAddress?.pincode}<br>
      Phone: ${order.shippingAddress?.phone}
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:8000/orders/${order.orderNumber}" class="btn">Track Your Order</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      <strong>What's Next?</strong><br>
      • We'll notify you when your order ships<br>
      • You'll receive tracking details via email<br>
      • Expected delivery: 7-10 business days
    </p>
  `;

  return sendEmail({
    to: order.user.email,
    subject: `Order Confirmed! #${order.orderNumber} - House of Lehenga`,
    html: emailTemplate(content)
  });
}

// Shipping update email
export async function sendShippingUpdate(orderId: string, trackingNumber?: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          product: true
        }
      },
      shippingAddress: true
    }
  });

  if (!order) return false;

  const content = `
    <h2 style="color: #8b1538; margin-top: 0;">Your Order is On Its Way! 📦</h2>

    <p>Dear ${order.user.firstName || 'Valued Customer'},</p>

    <p>Great news! Your order <strong>#${order.orderNumber}</strong> has been shipped and is on its way to you.</p>

    ${trackingNumber ? `
    <div style="background: #fef9f3; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #666;">Tracking Number</p>
      <p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #d4af37; letter-spacing: 2px;">${trackingNumber}</p>
    </div>
    ` : ''}

    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div>
          <strong>Order Placed</strong><br>
          <span style="color: #666; font-size: 14px;">${new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div>
          <strong>Order Confirmed</strong><br>
          <span style="color: #666; font-size: 14px;">Processing complete</span>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot" style="background: #8b1538;"></div>
        <div>
          <strong style="color: #8b1538;">Shipped</strong><br>
          <span style="color: #666; font-size: 14px;">On the way</span>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot inactive"></div>
        <div>
          <strong style="color: #999;">Delivered</strong><br>
          <span style="color: #666; font-size: 14px;">Expected in 3-5 days</span>
        </div>
      </div>
    </div>

    <h3 style="color: #2c1810;">Delivery Address</h3>
    <p style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
      ${order.shippingAddress?.fullName}<br>
      ${order.shippingAddress?.addressLine1}<br>
      ${order.shippingAddress?.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
      ${order.shippingAddress?.city}, ${order.shippingAddress?.state} ${order.shippingAddress?.pincode}
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:8000/orders/${order.orderNumber}" class="btn">Track Package</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      If you have any questions about your delivery, please don't hesitate to contact our customer support team.
    </p>
  `;

  return sendEmail({
    to: order.user.email,
    subject: `Your Order Has Shipped! #${order.orderNumber} - House of Lehenga`,
    html: emailTemplate(content)
  });
}

// Delivery confirmation email
export async function sendDeliveryConfirmation(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!order) return false;

  const content = `
    <h2 style="color: #8b1538; margin-top: 0;">Your Order Has Been Delivered! 🎊</h2>

    <p>Dear ${order.user.firstName || 'Valued Customer'},</p>

    <p>We're delighted to inform you that your order <strong>#${order.orderNumber}</strong> has been successfully delivered!</p>

    <div style="background: linear-gradient(135deg, #8b1538 0%, #a01c44 100%); padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; color: white;">
      <p style="margin: 0; font-size: 24px;">✓ Delivered</p>
      <p style="margin: 10px 0 0; opacity: 0.9;">We hope you love your new pieces!</p>
    </div>

    <h3 style="color: #2c1810;">Your Items</h3>
    <ul>
      ${order.items.map(item => `<li>${item.product.name} x${item.quantity}</li>`).join('')}
    </ul>

    <div style="background: #fef9f3; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 16px;">We'd love to hear from you!</p>
      <p style="margin: 10px 0;">Share your experience and help other brides find their perfect lehenga.</p>
      <a href="http://localhost:8000/product/${order.items[0]?.product.slug}#reviews" class="btn" style="margin-top: 10px;">Write a Review</a>
    </div>

    <h3 style="color: #2c1810;">Care Instructions</h3>
    <ul style="color: #666; font-size: 14px;">
      <li>Dry clean only for best results</li>
      <li>Store in a cool, dry place</li>
      <li>Keep away from direct sunlight</li>
      <li>Use muslin cloth for storage</li>
    </ul>

    <p>Thank you for choosing House of Lehenga. We hope you cherish these pieces for years to come!</p>

    <p style="color: #666; font-size: 14px;">
      Questions or concerns? Reply to this email or contact us at <a href="mailto:support@houseoflehenga.com">support@houseoflehenga.com</a>
    </p>
  `;

  return sendEmail({
    to: order.user.email,
    subject: `Your Order Has Been Delivered! #${order.orderNumber} - House of Lehenga`,
    html: emailTemplate(content)
  });
}

// Welcome email for new users
export async function sendWelcomeEmail(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) return false;

  const content = `
    <h2 style="color: #8b1538; margin-top: 0;">Welcome to House of Lehenga! 👑</h2>

    <p>Dear ${user.firstName || 'Valued Customer'},</p>

    <p>Welcome to the House of Lehenga family! We're honored to have you join us on this beautiful journey of celebrating Indian heritage and craftsmanship.</p>

    <div style="background: linear-gradient(135deg, #8b1538 0%, #a01c44 100%); padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; color: white;">
      <p style="margin: 0; font-size: 20px; color: #d4af37;">Special Welcome Gift</p>
      <p style="margin: 10px 0 0; font-size: 32px; font-weight: bold;">10% OFF</p>
      <p style="margin: 5px 0 0; opacity: 0.9;">on your first order</p>
      <p style="margin: 15px 0 0; font-size: 18px; letter-spacing: 3px; color: #d4af37;">WELCOME10</p>
    </div>

    <h3 style="color: #2c1810;">Why Choose Us?</h3>
    <ul>
      <li><strong>Master Craftsmanship:</strong> Each piece is handcrafted by skilled artisans</li>
      <li><strong>Premium Fabrics:</strong> Only the finest silks, velvets, and brocades</li>
      <li><strong>Heritage Designs:</strong> Blending traditional art with contemporary style</li>
      <li><strong>Perfect Fit:</strong> Customization available for all our pieces</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:8000/shop" class="btn">Start Shopping</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      Follow us on social media for bridal inspiration, styling tips, and exclusive offers!
    </p>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome to House of Lehenga - Here\'s 10% Off! 👑',
    html: emailTemplate(content)
  });
}

// Password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `http://localhost:8000/reset-password?token=${resetToken}`;

  const content = `
    <h2 style="color: #8b1538; margin-top: 0;">Reset Your Password</h2>

    <p>We received a request to reset your password for your House of Lehenga account.</p>

    <p>Click the button below to create a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      This link will expire in 1 hour for security reasons.
    </p>

    <p style="color: #666; font-size: 14px;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>

    <p style="color: #999; font-size: 12px; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #8b1538; word-break: break-all;">${resetUrl}</a>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - House of Lehenga',
    html: emailTemplate(content)
  });
}

export default {
  sendOrderConfirmation,
  sendShippingUpdate,
  sendDeliveryConfirmation,
  sendWelcomeEmail,
  sendPasswordResetEmail
};
