# House of Lehenga - API

RESTful API backend for the House of Lehenga e-commerce platform, built with Node.js, Express, TypeScript, and Prisma.

![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.7-purple?logo=prisma)
![Express](https://img.shields.io/badge/Express-4.18-lightgrey?logo=express)

## Overview

This is the backend API for House of Lehenga, a premium bridal e-commerce platform. It provides RESTful endpoints for user management, product catalog, shopping cart, wishlist, orders, and more.

## Features

### Authentication & Users
- JWT-based authentication
- User registration & login
- Password reset functionality
- Profile management
- Address book

### Products
- Product catalog with categories
- Advanced filtering & search
- Product variants (size, color)
- Image management via Cloudinary
- Reviews & ratings

### Shopping
- Shopping cart management
- Wishlist functionality
- Inventory tracking
- Price calculations

### Orders
- Order creation & management
- Order status tracking
- Payment integration
- Invoice generation

### Admin
- Product management
- Order management
- User management
- Analytics dashboard

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **File Upload**: Multer + Cloudinary
- **Password Hashing**: bcryptjs

## Project Structure

```
houseoflehenga-api/
├── src/
│   ├── index.ts           # Application entry point
│   ├── routes/
│   │   ├── auth.ts        # Authentication routes
│   │   ├── users.ts       # User management
│   │   ├── products.ts    # Product catalog
│   │   ├── cart.ts        # Shopping cart
│   │   ├── wishlist.ts    # Wishlist
│   │   ├── orders.ts      # Order management
│   │   └── admin.ts       # Admin routes
│   ├── middleware/
│   │   ├── auth.ts        # JWT authentication
│   │   ├── admin.ts       # Admin authorization
│   │   └── errorHandler.ts# Error handling
│   ├── utils/
│   │   ├── prisma.ts      # Prisma client
│   │   └── helpers.ts     # Utility functions
│   └── types/
│       └── index.ts       # TypeScript types
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Database seeding
│   └── migrations/        # Database migrations
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

## Installation

### Prerequisites
- Node.js 20 or higher
- PostgreSQL 14+
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/houseoflehenga-api.git
   cd houseoflehenga-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Run migrations
   npm run db:migrate

   # Seed database (optional)
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **API available at**
   ```
   http://localhost:3001
   ```

### Using Docker

1. **Build the image**
   ```bash
   docker build -t houseoflehenga-api .
   ```

2. **Run with Docker Compose**
   ```bash
   cd ..
   docker-compose up -d
   ```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment | No (default: development) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | For uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key | For uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | For uploads |

### Example .env
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/houseoflehenga"
JWT_SECRET="your-super-secret-key"
PORT=3001
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get product by ID |
| GET | `/api/products/category/:category` | Products by category |
| GET | `/api/products/search` | Search products |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get user's cart |
| POST | `/api/cart` | Add item to cart |
| PUT | `/api/cart/:id` | Update cart item |
| DELETE | `/api/cart/:id` | Remove from cart |
| DELETE | `/api/cart` | Clear cart |

### Wishlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wishlist` | Get user's wishlist |
| POST | `/api/wishlist` | Add to wishlist |
| DELETE | `/api/wishlist/:id` | Remove from wishlist |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get user's orders |
| GET | `/api/orders/:id` | Get order by ID |
| POST | `/api/orders` | Create new order |
| PUT | `/api/orders/:id/cancel` | Cancel order |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get profile |
| PUT | `/api/users/profile` | Update profile |
| GET | `/api/users/addresses` | Get addresses |
| POST | `/api/users/addresses` | Add address |
| PUT | `/api/users/addresses/:id` | Update address |
| DELETE | `/api/users/addresses/:id` | Delete address |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health status |

## Database Schema

### Main Models
- **User** - Customer accounts
- **Product** - Product catalog
- **Category** - Product categories
- **Cart** - Shopping carts
- **CartItem** - Cart line items
- **Wishlist** - User wishlists
- **Order** - Customer orders
- **OrderItem** - Order line items
- **Address** - Shipping addresses
- **Review** - Product reviews

### Database Commands
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# Push schema changes (dev)
npm run db:push

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [...]
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

## Deployment

### Railway
```bash
railway up
```

### Heroku
```bash
heroku create
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku run npm run db:migrate
```

### Docker
```bash
docker build -t houseoflehenga-api .
docker run -p 3001:3001 --env-file .env houseoflehenga-api
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Contact

- **Website**: [houseoflehenga.com](https://houseoflehenga.com)
- **Email**: api-support@houseoflehenga.com

---

Built with Node.js, Express, TypeScript & Prisma
