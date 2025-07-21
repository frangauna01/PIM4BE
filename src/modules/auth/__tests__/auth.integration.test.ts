/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { SignUpDto } from '../dtos/signup.dto';
import { SignInDto } from '../dtos/signin.dto';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let repository: Repository<User>;
  let jwtService: JwtService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockTransactionHelper = {
    runInTransaction: jest.fn(),
  };

  const mockQueryRunner = {
    manager: {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      }),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedpassword',
    phone: 1234567890,
    country: 'USA',
    city: 'New York',
    address: '123 Main St',
    createdAt: new Date(),
    isAdmin: false,
    orders: [],
    toJSON: function () {
      const { password: _password, isAdmin: _isAdmin, ...rest } = this;
      return rest;
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
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
      ],
    }).compile();

    app = module.createNestApplication();
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

  describe('POST /auth/signup', () => {
    const signUpDto: SignUpDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phone: 1234567890,
      country: 'USA',
      city: 'New York',
      address: '123 Main St',
    };

    it('should create a new user successfully', async () => {
      // Arrange
      const userRepo = mockQueryRunner.manager.getRepository();
      userRepo.findOne.mockResolvedValue(null); // No existing user
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        message: 'User created successfully',
        data: expect.objectContaining({
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        }),
      });

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: [{ email: signUpDto.email }, { phone: signUpDto.phone }],
      });
    });

    it('should return 400 when user with email already exists', async () => {
      // Arrange
      const userRepo = mockQueryRunner.manager.getRepository();
      userRepo.findOne.mockResolvedValue(mockUser); // Existing user

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain(
        'User with this email or phone number already exists',
      );
    });

    it('should return 400 when password confirmation does not match', async () => {
      // Arrange
      const invalidSignUpDto = {
        ...signUpDto,
        confirmPassword: 'DifferentPassword123!',
      };

      const userRepo = mockQueryRunner.manager.getRepository();
      userRepo.findOne.mockResolvedValue(null);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(invalidSignUpDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain(
        'Password confirmation does not match',
      );
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const invalidSignUpDto = {
        name: 'John Doe',
        // email is missing
        password: 'Password123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(invalidSignUpDto)
        .expect(400);

      // Assert
      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/signin', () => {
    const signInDto: SignInDto = {
      email: 'john@example.com',
      password: 'Password123!',
    };

    it('should sign in user successfully', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const userWithHashedPassword = { ...mockUser, password: hashedPassword };

      mockRepository.findOne.mockResolvedValue(userWithHashedPassword);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Mock bcrypt.compare to return true
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send(signInDto)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        message: 'User logged in successfully',
        data: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
        token: 'mock-jwt-token',
      });

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        role: 'user', // Since isAdmin is false
      });
    });

    it('should return 400 when user not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send(signInDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Email or password incorrect');
    });

    it('should return 400 when password is incorrect', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return false
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send(signInDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Email or password incorrect');
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const invalidSignInDto = {
        email: 'john@example.com',
        // password is missing
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send(invalidSignInDto)
        .expect(400);

      // Assert
      expect(response.body.message).toBeDefined();
    });

    it('should generate JWT token for admin user', async () => {
      // Arrange
      const adminUser = { ...mockUser, isAdmin: true };
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const adminUserWithHashedPassword = {
        ...adminUser,
        password: hashedPassword,
      };

      mockRepository.findOne.mockResolvedValue(adminUserWithHashedPassword);
      mockJwtService.sign.mockReturnValue('admin-jwt-token');

      // Mock bcrypt.compare to return true
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send(signInDto)
        .expect(201);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin', // Since isAdmin is true
      });

      expect(response.body.token).toBe('admin-jwt-token');
    });
  });
});
