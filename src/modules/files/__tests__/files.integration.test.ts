/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { FilesController } from '../files.controller';
import { FilesService } from '../files.service';
import { Product } from '../../products/entities/product.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { AuthenticatedUserGuard } from '../../auth/guards/auth-user.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolesEnum } from '../../auth/decorators/roles.decorator';
import { v2 as cloudinary } from 'cloudinary';

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload: jest.fn(),
    },
  },
}));

// Mock envs config
jest.mock('../../../configs/envs.config', () => ({
  envs: {
    cloudinary: {
      cloudName: 'test-cloud',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    },
  },
}));

describe('FilesController (Integration)', () => {
  let app: INestApplication;
  let repository: Repository<Product>;
  let jwtService: JwtService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockTransactionHelper = {
    runInTransaction: jest.fn(),
  };

  const mockQueryRunner = {
    manager: {
      getRepository: jest.fn(),
    },
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockProduct: Product = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    stock: 10,
    imgUrl: 'old-image.jpg',
    category: {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Electronics',
      products: [],
    },
    orderDetails: [],
  };

  const mockAdminUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@example.com',
    role: RolesEnum.ADMIN,
  };

  // Mock the guards with proper implementation
  const mockAuthenticatedUserGuard = {
    canActivate: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks before each test and set default behavior
    jest.clearAllMocks();

    mockAuthenticatedUserGuard.canActivate.mockReset();
    mockRolesGuard.canActivate.mockReset();

    mockAuthenticatedUserGuard.canActivate.mockImplementation((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = mockAdminUser; // Set user in request
      return true;
    });

    mockRolesGuard.canActivate.mockReturnValue(true);

    // Setup default mock behaviors

    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue(mockProduct);

    mockTransactionHelper.runInTransaction.mockImplementation(
      async (callback) => await callback(mockQueryRunner),
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
        {
          provide: TransactionHelper,
          useValue: mockTransactionHelper,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        Reflector,
      ],
    })
      .overrideGuard(AuthenticatedUserGuard)
      .useValue(mockAuthenticatedUserGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    // Only clear specific mocks, not all
    mockRepository.findOne.mockReset();
    mockRepository.save.mockReset();
    mockTransactionHelper.runInTransaction.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /files/upload/:id', () => {
    it('should upload image and update product successfully (admin)', async () => {
      // Arrange
      const mockCloudinaryResult = {
        secure_url: 'https://cloudinary.com/new-image.jpg',
        public_id: 'ecommerce-products/test123',
      };

      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue({
        ...mockProduct,
        imgUrl: mockCloudinaryResult.secure_url,
      });

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockCloudinaryResult,
      );

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(),
      );

      // Create a fake image buffer
      const imageBuffer = Buffer.from('fake-image-data');

      // Act
      const response = await request(app.getHttpServer())
        .post('/files/upload/550e8400-e29b-41d4-a716-446655440000')
        .attach('image', imageBuffer, 'test.jpg')
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        message: 'Image upload successfully',
        data: expect.objectContaining({
          id: '550e8400-e29b-41d4-a716-446655440000',
          imgUrl: mockCloudinaryResult.secure_url,
        }),
      });

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        expect.stringContaining('data:'),
        {
          folder: 'ecommerce-products',
        },
      );
    });

    it('should return 404 when product not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(),
      );

      const imageBuffer = Buffer.from('fake-image-data');

      // Act
      await request(app.getHttpServer())
        .post('/files/upload/550e8400-e29b-41d4-a716-446655440999')
        .attach('image', imageBuffer, 'test.jpg')
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      // Act
      const imageBuffer = Buffer.from('fake-image-data');

      await request(app.getHttpServer())
        .post('/files/upload/invalid-uuid')
        .attach('image', imageBuffer, 'test.jpg')
        .expect(400);
    });

    it('should return 403 when non-admin tries to upload', async () => {
      // Arrange - Mock non-admin user
      mockRolesGuard.canActivate.mockReturnValue(false);

      const imageBuffer = Buffer.from('fake-image-data');

      // Act
      await request(app.getHttpServer())
        .post('/files/upload/550e8400-e29b-41d4-a716-446655440000')
        .attach('image', imageBuffer, 'test.jpg')
        .expect(403); // Forbidden from guard
    });

    it('should require authentication for file upload', async () => {
      // Arrange
      mockAuthenticatedUserGuard.canActivate.mockReturnValue(false);

      const imageBuffer = Buffer.from('fake-image-data');

      // Act
      await request(app.getHttpServer())
        .post('/files/upload/550e8400-e29b-41d4-a716-446655440000')
        .attach('image', imageBuffer, 'test.jpg')
        .expect(403);
    });

    it('should return 503 when cloudinary is unavailable', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProduct);
      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(null);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(),
      );

      const imageBuffer = Buffer.from('fake-image-data');

      // Act
      await request(app.getHttpServer())
        .post('/files/upload/550e8400-e29b-41d4-a716-446655440000')
        .attach('image', imageBuffer, 'test.jpg')
        .expect(503);
    });

    it('should return 400 when no file is uploaded', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/files/upload/550e8400-e29b-41d4-a716-446655440000')
        .expect(400);
    });

    it('should use transaction helper correctly', async () => {
      // Arrange
      const mockCloudinaryResult = {
        secure_url: 'https://cloudinary.com/new-image.jpg',
      };

      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue({
        ...mockProduct,
        imgUrl: mockCloudinaryResult.secure_url,
      });

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockCloudinaryResult,
      );

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(),
      );

      const imageBuffer = Buffer.from('fake-image-data');

      // Act
      await request(app.getHttpServer())
        .post('/files/upload/550e8400-e29b-41d4-a716-446655440000')
        .attach('image', imageBuffer, 'test.jpg')
        .expect(201);

      // Assert
      expect(mockTransactionHelper.runInTransaction).toHaveBeenCalledTimes(1);
      expect(
        typeof mockTransactionHelper.runInTransaction.mock.calls[0][0],
      ).toBe('function');
    });

    it('should convert file to base64 correctly', async () => {
      // Arrange
      const mockCloudinaryResult = {
        secure_url: 'https://cloudinary.com/new-image.jpg',
      };

      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue(mockProduct);
      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockCloudinaryResult,
      );

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(),
      );

      const imageBuffer = Buffer.from('fake-image-data');

      // Act
      await request(app.getHttpServer())
        .post('/files/upload/550e8400-e29b-41d4-a716-446655440000')
        .attach('image', imageBuffer, 'test.jpg')
        .expect(201);

      // Assert
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        expect.stringContaining('data:'),
        {
          folder: 'ecommerce-products',
        },
      );

      const uploadCall = (cloudinary.uploader.upload as jest.Mock).mock
        .calls[0];
      expect(uploadCall[0]).toMatch(/^data:.*\/.*;base64,/);
    });
  });
});
