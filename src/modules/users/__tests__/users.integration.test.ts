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
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { User } from '../entities/user.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { AuthenticatedUserGuard } from '../../auth/guards/auth-user.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SameUserOrAdminGuard } from '../../auth/guards/same-user.guard';
import { RolesEnum } from '../../auth/decorators/roles.decorator';
import { NextFunction, Request, Response } from 'express';
import { IAuthRequest } from '../../auth/interfaces/token.interface';

describe('UsersController (Integration)', () => {
  let app: INestApplication;
  let repository: Repository<User>;
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

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedpassword',
    phone: 1234567890,
    country: 'USA',
    city: 'New York',
    address: '123 Main St',
    createdAt: new Date('2025-07-19T16:51:18.167Z'),
    isAdmin: false,
    orders: [],
    toJSON: function () {
      const { password: _password, isAdmin: _isAdmin, ...rest } = this;
      return rest;
    },
  };

  // Expected response without password, isAdmin, and toJSON function
  const expectedUserResponse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    email: 'john@example.com',
    phone: 1234567890,
    country: 'USA',
    city: 'New York',
    address: '123 Main St',
    createdAt: '2025-07-19T16:51:18.167Z', // Date becomes string in HTTP response
    orders: [],
  };

  const mockAdminUser: User = {
    ...mockUser,
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@example.com',
    isAdmin: true,
    toJSON: function (): Omit<User, 'password' | 'isAdmin' | 'toJSON'> {
      return {
        id: this.id,
        name: this.name,
        email: this.email,
        address: this.address,
        phone: this.phone,
        country: this.country,
        city: this.city,
        createdAt: this.createdAt,
        orders: this.orders,
      };
    },
  };

  // Mock the guards with proper implementation
  const mockAuthenticatedUserGuard = {
    canActivate: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(),
  };

  const mockSameUserOrAdminGuard = {
    canActivate: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks before each test and set default behavior
    jest.clearAllMocks();

    mockAuthenticatedUserGuard.canActivate.mockReset();
    mockRolesGuard.canActivate.mockReset();
    mockSameUserOrAdminGuard.canActivate.mockReset();

    mockAuthenticatedUserGuard.canActivate.mockImplementation((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = mockAdminUser; // Set user in request
      return true;
    });

    mockRolesGuard.canActivate.mockReturnValue(true);
    mockSameUserOrAdminGuard.canActivate.mockReturnValue(true);

    // Setup default mock behaviors
    mockRepository.findAndCount.mockResolvedValue([[], 0]);
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.findOneBy.mockResolvedValue(null);
    mockRepository.create.mockReturnValue(mockUser);
    mockRepository.save.mockResolvedValue(mockUser);
    mockRepository.delete.mockResolvedValue({ affected: 1 });

    mockTransactionHelper.runInTransaction.mockImplementation(
      async (callback) => await callback(mockQueryRunner),
    );
    mockTransactionHelper.runInTransaction.mockImplementation(
      async (callback) => await callback(mockQueryRunner),
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
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
      .overrideGuard(SameUserOrAdminGuard)
      .useValue(mockSameUserOrAdminGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    repository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('should return paginated users (admin only)', async () => {
      // Arrange
      const mockUsers = [mockUser, mockAdminUser];
      const total = 2;
      mockRepository.findAndCount.mockResolvedValue([mockUsers, total]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        data: expect.arrayContaining([
          expect.not.objectContaining({ password: expect.anything() }),
          expect.not.objectContaining({ password: expect.anything() }),
        ]),
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        relations: ['orders'],
      });
    });

    it('should return users with custom pagination', async () => {
      // Arrange
      const mockUsers = [mockUser];
      const total = 25; // Enough for multiple pages with limit 10
      mockRepository.findAndCount.mockResolvedValue([mockUsers, total]);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users?page=2&limit=10')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        data: expect.any(Array),
      });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 10, // (2-1) * 10
        take: 10,
        relations: ['orders'],
      });
    });

    it('should return 400 when page exceeds maximum', async () => {
      // Arrange
      const mockUsers = [mockUser];
      const total = 5; // Only 1 page with limit 5
      mockRepository.findAndCount.mockResolvedValue([mockUsers, total]);

      // Act
      await request(app.getHttpServer())
        .get('/users?page=3&limit=5')
        .expect(400);
    });

    it('should require admin role', async () => {
      // Arrange - Mock non-admin user
      mockRolesGuard.canActivate.mockReturnValue(false);

      // Act
      await request(app.getHttpServer()).get('/users').expect(403); // Forbidden from guard
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const response = await request(app.getHttpServer())
        .get('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        data: expectedUserResponse,
      });

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        relations: ['orders.orderDetails'],
      });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      await request(app.getHttpServer())
        .get('/users/550e8400-e29b-41d4-a716-446655440999')
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      // Act
      await request(app.getHttpServer()).get('/users/invalid-uuid').expect(400);
    });

    it('should require authentication', async () => {
      // Arrange
      mockAuthenticatedUserGuard.canActivate.mockReturnValue(false);

      // Act
      await request(app.getHttpServer())
        .get('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(403);
    });
  });

  describe('PUT /users/:id', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
      city: 'Updated City',
    };

    it('should update user successfully', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      userRepo.save.mockResolvedValue({ ...mockUser, ...updateUserDto });

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .put('/users/550e8400-e29b-41d4-a716-446655440000')
        .send(updateUserDto)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        message: 'User updated successfully',
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should return 404 when user not found for update', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(null); // User not found

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .put('/users/550e8400-e29b-41d4-a716-446655440999')
        .send(updateUserDto)
        .expect(404);
    });

    it('should return 401 when user tries to update another user', async () => {
      // Arrange - Mock the SameUserOrAdminGuard to return false (unauthorized)
      mockSameUserOrAdminGuard.canActivate.mockReturnValue(false);

      const userRepo = {
        findOneBy: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .put('/users/550e8400-e29b-41d4-a716-446655440000')
        .send(updateUserDto)
        .expect(403);
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      const invalidUpdateDto = {
        name: 'AB', // Too short
      };

      // Act
      await request(app.getHttpServer())
        .put('/users/550e8400-e29b-41d4-a716-446655440000')
        .send(invalidUpdateDto)
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      userRepo.delete.mockResolvedValue({ affected: 1 });

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .delete('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        message: 'User deleted successfully',
        id: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(userRepo.findOneBy).toHaveBeenCalledWith({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(userRepo.delete).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
      );
    });

    it('should return 404 when user not found for deletion', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(null); // User not found

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .delete('/users/550e8400-e29b-41d4-a716-446655440999')
        .expect(404);
    });

    it('should return 401 when user tries to delete another user', async () => {
      // Arrange - Mock the SameUserOrAdminGuard to return false (unauthorized)
      mockSameUserOrAdminGuard.canActivate.mockReturnValue(false);

      const userRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .delete('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(403);
    });

    it('should allow admin to delete any user', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      userRepo.delete.mockResolvedValue({ affected: 1 });

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .delete('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        message: 'User deleted successfully',
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should use transaction helper correctly', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      userRepo.delete.mockResolvedValue({ affected: 1 });

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      await request(app.getHttpServer())
        .delete('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      // Assert
      expect(mockTransactionHelper.runInTransaction).toHaveBeenCalledTimes(1);
      expect(
        typeof mockTransactionHelper.runInTransaction.mock.calls[0][0],
      ).toBe('function');
    });
  });
});
