/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { CategoriesController } from '../categories.controller';
import { CategoriesService } from '../categories.service';
import { Category } from '../entities/category.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { AuthenticatedUserGuard } from '../../auth/guards/auth-user.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolesEnum } from '../../auth/decorators/roles.decorator';

describe('CategoriesController (Integration)', () => {
  let app: INestApplication;
  let repository: Repository<Category>;
  let jwtService: JwtService;

  const mockRepository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
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

  const mockCategory: Category = {
    id: '1',
    name: 'Electronics',
    products: [],
  };

  const mockAdminUser = {
    id: '1',
    email: 'admin@example.com',
    role: RolesEnum.ADMIN,
  };

  const mockRegularUser = {
    id: '2',
    email: 'user@example.com',
    role: RolesEnum.USER,
  };

  // Mock the guards with proper exception handling
  const mockAuthenticatedUserGuard = {
    canActivate: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks before each test and set default behavior
    mockAuthenticatedUserGuard.canActivate.mockReset();
    mockRolesGuard.canActivate.mockReset();

    mockAuthenticatedUserGuard.canActivate.mockImplementation((context) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const request = context.switchToHttp().getRequest();
      request.user = mockAdminUser; // Set user in request
      return true;
    });
    mockRolesGuard.canActivate.mockReturnValue(true);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
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

    repository = module.get<Repository<Category>>(getRepositoryToken(Category));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    // Only clear repository and service mocks, not guard mocks
    mockRepository.find.mockReset();
    mockRepository.findAndCount.mockReset();
    mockRepository.findOne.mockReset();
    mockRepository.create.mockReset();
    mockRepository.save.mockReset();
    mockTransactionHelper.runInTransaction.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /categories', () => {
    it('should return all categories', async () => {
      // Arrange
      const mockCategories = [
        mockCategory,
        { id: '2', name: 'Books', products: [] },
      ];
      mockRepository.findAndCount.mockResolvedValue([mockCategories, 2]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        data: mockCategories,
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
      });
    });

    it('should return empty array when no categories found', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        data: [],
      });
    });

    it('should require authentication', async () => {
      // Arrange
      mockAuthenticatedUserGuard.canActivate.mockReturnValue(false);

      // Act
      await request(app.getHttpServer()).get('/categories').expect(403);
    });
  });

  describe('POST /categories', () => {
    const createCategoryDto: CreateCategoryDto = {
      name: 'New Category',
    };

    it('should create a new category successfully (admin)', async () => {
      // Arrange - Mock admin user
      mockRolesGuard.canActivate.mockReturnValue(true);

      const categoryRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(categoryRepo);

      categoryRepo.findOne.mockResolvedValue(null); // No existing category
      categoryRepo.create.mockReturnValue(mockCategory);
      categoryRepo.save.mockResolvedValue(mockCategory);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        message: 'Category created successfully',
        data: mockCategory,
      });

      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: { name: createCategoryDto.name },
      });
      expect(categoryRepo.create).toHaveBeenCalledWith({
        name: createCategoryDto.name,
      });
      expect(categoryRepo.save).toHaveBeenCalledWith(mockCategory);
    });

    it('should return 403 when non-admin tries to create category', async () => {
      // Arrange - Mock forbidden access
      mockRolesGuard.canActivate.mockReturnValue(false);

      // Act
      await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(403);
    });

    it('should return 400 when category already exists', async () => {
      // Arrange
      const categoryRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(categoryRepo);

      categoryRepo.findOne.mockResolvedValue(mockCategory); // Existing category

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(400);
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const invalidCategoryDto = {};

      // Act
      await request(app.getHttpServer())
        .post('/categories')
        .send(invalidCategoryDto)
        .expect(400);
    });

    it('should return 400 when name is too short', async () => {
      // Arrange
      const invalidCategoryDto = {
        name: 'AB', // Less than 3 characters
      };

      // Act
      await request(app.getHttpServer())
        .post('/categories')
        .send(invalidCategoryDto)
        .expect(400);
    });

    it('should return 400 when name is too long', async () => {
      // Arrange
      const invalidCategoryDto = {
        name: 'A'.repeat(51), // More than 50 characters
      };

      // Act
      await request(app.getHttpServer())
        .post('/categories')
        .send(invalidCategoryDto)
        .expect(400);
    });

    it('should require authentication for category creation', async () => {
      // Arrange
      mockAuthenticatedUserGuard.canActivate.mockReturnValue(false);

      // Act
      await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(403);
    });

    it('should use transaction helper correctly', async () => {
      // Arrange
      const categoryRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(categoryRepo);

      categoryRepo.findOne.mockResolvedValue(null);
      categoryRepo.create.mockReturnValue(mockCategory);
      categoryRepo.save.mockResolvedValue(mockCategory);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(201);

      // Assert
      expect(mockTransactionHelper.runInTransaction).toHaveBeenCalledTimes(1);
      expect(
        typeof mockTransactionHelper.runInTransaction.mock.calls[0][0],
      ).toBe('function');
    });
  });
});
