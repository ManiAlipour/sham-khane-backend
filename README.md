# Sham-Khane Backend

A robust e-commerce backend built with Node.js, Express, and TypeScript, featuring user authentication, product management, shopping cart functionality, and analytics.

## Features

- 🔐 **Authentication & Authorization**

  - JWT-based authentication
  - Role-based access control (Admin/User)
  - Password reset functionality
  - Email verification

- 🛍️ **Product Management**

  - CRUD operations for products
  - Product categories
  - Product reviews and ratings
  - Image upload support

- 🛒 **Shopping Cart**

  - Add/remove items
  - Update quantities
  - Price calculations
  - Discount code support

- 📊 **Analytics**
  - Sales analytics
  - User behavior tracking
  - Product performance metrics
  - Cart analytics

## Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Express Validator for input validation

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/ManiAlipour/sham-khane-backend.git
   cd sham-khane-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and add:

   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## API Documentation

### Auth Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password` - Reset password

### Product Routes

- `GET /api/products` - Get all products
- `POST /api/products` - Create a product (Admin)
- `GET /api/products/:id` - Get single product
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Cart Routes

- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:itemId` - Update cart item
- `DELETE /api/cart/:itemId` - Remove item from cart

### Analytics Routes (Admin Only)

- `GET /api/analytics/dashboard` - Get dashboard stats
- `GET /api/analytics/sales` - Get sales analytics
- `GET /api/analytics/products` - Get product analytics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
