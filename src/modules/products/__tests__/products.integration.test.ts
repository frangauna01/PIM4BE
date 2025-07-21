/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ProductsController } from '../products.controller';
import { ProductsService } from '../products.service';
import { Product } from '../entities/product.entity';
import { Category } from '../../categories/entities/category.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { AuthenticatedUserGuard } from '../../auth/guards/auth-user.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolesEnum } from '../../auth/decorators/roles.decorator';

describe('ProductsController (Integration)', () => {
  let app: INestApplication;
  let repository: Repository<Product>;
  let jwtService: JwtService;

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
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

  const mockCategory: Category = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Electronics',
    products: [],
  };

  const mockProduct: Product = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Product',
    description: 'Test Description for the product',
    price: 99.99,
    stock: 10,
    imgUrl: 'test-image.jpg',
    category: mockCategory,
    orderDetails: [],
  };

  const mockAdminUser = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'admin@example.com',
    role: RolesEnum.ADMIN,
  };

  const mockRegularUser = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'user@example.com',
    role: RolesEnum.USER,
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const request = context.switchToHttp().getRequest();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      request.user = mockAdminUser; // Set user in request
      return true;
    });

    mockRolesGuard.canActivate.mockReturnValue(true);

    // Setup default mock behaviors
    mockRepository.findAndCount.mockResolvedValue([[], 0]);
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.findOneBy.mockResolvedValue(null);
    mockRepository.create.mockReturnValue(mockProduct);
    mockRepository.save.mockResolvedValue(mockProduct);
    mockRepository.delete.mockResolvedValue({ affected: 1 });

    mockTransactionHelper.runInTransaction.mockImplementation(
      async (callback) => await callback(mockQueryRunner),
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
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
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return paginated products', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const total = 1;
      mockRepository.findAndCount.mockResolvedValue([mockProducts, total]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        data: mockProducts,
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        relations: ['category'],
      });
    });

    it('should return products with custom pagination', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const total = 25; // Enough for multiple pages with limit 10
      mockRepository.findAndCount.mockResolvedValue([mockProducts, total]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/products?page=2&limit=10')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        data: mockProducts,
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 10, // (2-1) * 10
        take: 10,
        relations: ['category'],
      });
    });

    it('should return 400 when page exceeds maximum', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const total = 5; // Only 1 page with limit 5
      mockRepository.findAndCount.mockResolvedValue([mockProducts, total]);

      // Act
      await request(app.getHttpServer())
        .get('/products?page=3&limit=5')
        .expect(400);
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProduct);

      // Act
      const response = await request(app.getHttpServer())
        .get('/products/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        data: mockProduct,
      });

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        relations: ['category'],
      });
    });

    it('should return 404 when product not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      await request(app.getHttpServer())
        .get('/products/550e8400-e29b-41d4-a716-446655440999')
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/products/invalid-uuid')
        .expect(400);
    });
  });

  describe('POST /products', () => {
    const createProductDto: CreateProductDto = {
      name: 'New Product',
      description: 'New Product Description for testing',
      price: 150.0,
      stock: 20,
      category: 'Electronics',
    };

    it('should create a new product successfully (admin)', async () => {
      // Arrange - Mock admin user
      mockRolesGuard.canActivate.mockReturnValue(true);

      const productRepo = {
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      const categoryRepo = {
        findOneBy: jest.fn(),
      };

      mockQueryRunner.manager.getRepository
        .mockReturnValueOnce(productRepo)
        .mockReturnValueOnce(categoryRepo);

      productRepo.findOneBy.mockResolvedValue(null); // No existing product
      categoryRepo.findOneBy.mockResolvedValue(mockCategory);
      productRepo.create.mockReturnValue(mockProduct);
      productRepo.save.mockResolvedValue(mockProduct);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        message: 'Product created successfully',
        data: mockProduct,
      });
    });

    it('should return 403 when non-admin tries to create product', async () => {
      // Arrange - Mock non-admin user
      mockRolesGuard.canActivate.mockReturnValue(false);

      // Act
      await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(403);
    });

    it('should return 400 when product name already exists', async () => {
      // Arrange
      const productRepo = {
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      const categoryRepo = {
        findOneBy: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockImplementation((entity) => {
        if (entity === Product) return productRepo;
        if (entity === Category) return categoryRepo;
        return productRepo; // fallback
      });

      productRepo.findOneBy.mockResolvedValue(mockProduct); // Existing product

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(400);
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const invalidProductDto = {
        name: 'Test Product',
        // description is missing
        price: 99.99,
      };

      // Act
      await request(app.getHttpServer())
        .post('/products')
        .send(invalidProductDto)
        .expect(400);
    });
  });

  describe('PUT /products/:id', () => {
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      price: 199.99,
    };

    it('should update a product successfully (admin)', async () => {
      // Arrange
      const productRepo = {
        findOneBy: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(productRepo);

      productRepo.findOneBy.mockResolvedValue(mockProduct);
      productRepo.save.mockResolvedValue({
        ...mockProduct,
        ...updateProductDto,
      });

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .put('/products/550e8400-e29b-41d4-a716-446655440000')
        .send(updateProductDto)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        message: 'Product updated successfully',
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should return 404 when product not found for update', async () => {
      // Arrange
      const productRepo = {
        findOneBy: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(productRepo);

      productRepo.findOneBy.mockResolvedValue(null); // Product not found

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .put('/products/550e8400-e29b-41d4-a716-446655440999')
        .send(updateProductDto)
        .expect(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product successfully (admin)', async () => {
      // Arrange
      const productRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(productRepo);

      productRepo.findOneBy.mockResolvedValue(mockProduct);
      productRepo.delete.mockResolvedValue({ affected: 1 });

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .delete('/products/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        message: 'Product deleted successfully',
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should return 404 when product not found for deletion', async () => {
      // Arrange
      const productRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(productRepo);

      productRepo.findOneBy.mockResolvedValue(null); // Product not found

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .delete('/products/550e8400-e29b-41d4-a716-446655440999')
        .expect(404);
    });
  });
});
