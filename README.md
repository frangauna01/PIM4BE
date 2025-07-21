# E-commerce API

This is a RESTful API built with NestJS for an e-commerce platform. The API provides endpoints for managing users, products, categories, orders, and file uploads.

## Features

- 🔐 **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin/User)
  - Protected routes
  - User registration and login

- 👥 **User Management**
  - CRUD operations for users
  - Role-based permissions
  - Password encryption
  - Profile management

- 📦 **Product Management**
  - CRUD operations for products
  - Product categorization
  - Image upload and management via Cloudinary
  - Pagination support

- 🛍️ **Order Management**
  - Create and manage orders
  - Order history
  - Order ownership validation
  - Admin access to all orders

- 📁 **Category Management**
  - CRUD operations for categories
  - Category-product relationships

- 📤 **File Upload**
  - Image upload for products
  - File validation (size and type)
  - Cloud storage integration (Cloudinary)

## Technologies

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Documentation**: Swagger/OpenAPI
- **Validation**: Class Validator & Class Transformer

## API Documentation

The API is documented using Swagger. Once the application is running, you can access the documentation at:

```
http://localhost:3000/api
```

### Available Endpoints

- **Auth**
  - POST /auth/signup - Register new user
  - POST /auth/signin - User login

- **Users**
  - GET /users - Get all users (Admin)
  - GET /users/:id - Get user by ID
  - PUT /users/:id - Update user
  - DELETE /users/:id - Delete user

- **Products**
  - GET /products - Get all products
  - GET /products/:id - Get product by ID
  - POST /products - Create product (Admin)
  - PUT /products/:id - Update product (Admin)
  - DELETE /products/:id - Delete product (Admin)

- **Categories**
  - GET /categories - Get all categories
  - POST /categories - Create category (Admin)

- **Orders**
  - GET /orders - Get user's orders
  - GET /orders/:id - Get order by ID
  - POST /orders - Create new order
  - DELETE /orders/:id - Delete order

- **Files**
  - POST /files/upload/:id - Upload product image (Admin)

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the following variables:

```env
DB_HOST=your_db_host
DB_PORT=your_db_port
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

4. Run the database migrations:

```bash
npm run migration:run
```

5. Start the application:

```bash
npm run start:dev
```

## Security

- All sensitive routes are protected with JWT authentication
- Role-based access control for administrative functions
- Password hashing for user security
- File upload validation and sanitization
- Request validation using DTOs
- Environmental variables for sensitive data

## Error Handling

The API implements comprehensive error handling:

- Custom exception filters
- Input validation
- Proper HTTP status codes
- Detailed error messages
- Database constraint violation handling

## Database Schema

The application uses the following main entities:

- Users
- Products
- Categories
- Orders
- OrderDetails

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
