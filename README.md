# E-commerce Store API

A comprehensive RESTful API for an e-commerce store built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Product management
- Shopping cart functionality
- Discount code system
- Order processing
- Analytics tracking
- Email notifications

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Nodemailer for emails
- Express Validator for input validation
- Multer for file uploads

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd sham-khane
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sham-khane
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
NODE_ENV=development
```

4. Start the server:

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgotpassword` - Request password reset
- `PUT /api/auth/resetpassword/:resettoken` - Reset password
- `PUT /api/auth/updatepassword` - Update password
- `GET /api/auth/verify-email/:token` - Verify email

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `POST /api/products/:id/images` - Upload product images (Admin)
- `GET /api/products/search/:query` - Search products
- `GET /api/products/featured` - Get featured products

### Cart

- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:itemId` - Update cart item
- `DELETE /api/cart/items/:itemId` - Remove item from cart
- `DELETE /api/cart` - Clear cart
- `POST /api/cart/discount` - Apply discount code

### Discounts

- `GET /api/discounts` - Get all discounts (Admin)
- `GET /api/discounts/:id` - Get single discount (Admin)
- `POST /api/discounts` - Create new discount (Admin)
- `PUT /api/discounts/:id` - Update discount (Admin)
- `DELETE /api/discounts/:id` - Delete discount (Admin)
- `POST /api/discounts/validate` - Validate discount code

### Analytics (Admin only)

- `GET /api/analytics/dashboard` - Get dashboard statistics
- `GET /api/analytics/sales` - Get sales analytics
- `GET /api/analytics/products` - Get product analytics
- `GET /api/analytics/users` - Get user analytics
- `GET /api/analytics/traffic` - Get traffic analytics
- `GET /api/analytics/cart` - Get cart analytics
- `GET /api/analytics/discounts` - Get discount analytics
- `POST /api/analytics/track/pageview` - Track page view
- `POST /api/analytics/track/product/:id` - Track product view
- `POST /api/analytics/track/cart/:action` - Track cart action

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected routes, include the JWT token in the Authorization header:

```http
Authorization: Bearer <your_token_here>
```

## Error Handling

The API returns consistent error responses in the following format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Each IP is limited to 100 requests per 15 minutes.

## File Upload

Product images can be uploaded using multipart/form-data. The API accepts up to 5 images per product, with a size limit of 1MB per image.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
