// Set environment to test for all test suites
process.env.NODE_ENV = 'test';

// Mock environment variables needed for tests
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PORT = '3001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
