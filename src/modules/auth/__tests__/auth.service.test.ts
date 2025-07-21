/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { SignUpDto } from '../dtos/signup.dto';
import { SignInDto } from '../dtos/signin.dto';
import { RolesEnum } from '../decorators/roles.decorator';

describe('AuthService', () => {
  let service: AuthService;
  let repository: Repository<User>;
  let transactionHelper: TransactionHelper;
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

    service = module.get<AuthService>(AuthService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    transactionHelper = module.get<TransactionHelper>(TransactionHelper);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
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

      // Mock bcrypt.hash
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);

      // Act
      const result = await service.signUp(signUpDto);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: [{ email: signUpDto.email }, { phone: signUpDto.phone }],
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(signUpDto.password, 10);
      expect(userRepo.create).toHaveBeenCalledWith({
        ...signUpDto,
        password: 'hashedpassword',
      });
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw BadRequestException when user with email already exists', async () => {
      // Arrange
      const userRepo = mockQueryRunner.manager.getRepository();
      userRepo.findOne.mockResolvedValue(mockUser); // Existing user

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        'User with this email or phone number already exists',
      );
    });

    it('should throw BadRequestException when user with phone already exists', async () => {
      // Arrange
      const existingUserWithSamePhone = {
        ...mockUser,
        email: 'different@example.com',
      };
      const userRepo = mockQueryRunner.manager.getRepository();
      userRepo.findOne.mockResolvedValue(existingUserWithSamePhone);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        'User with this email or phone number already exists',
      );
    });

    it('should throw BadRequestException when password confirmation does not match', async () => {
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

      // Act & Assert
      await expect(service.signUp(invalidSignUpDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signUp(invalidSignUpDto)).rejects.toThrow(
        'Password confirmation does not match',
      );
    });

    it('should hash the password before saving', async () => {
      // Arrange
      const userRepo = mockQueryRunner.manager.getRepository();
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      const hashSpy = jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('hashedpassword' as never);

      // Act
      await service.signUp(signUpDto);

      // Assert
      expect(hashSpy).toHaveBeenCalledWith(signUpDto.password, 10);
      expect(userRepo.create).toHaveBeenCalledWith({
        ...signUpDto,
        password: 'hashedpassword',
      });
    });
  });

  describe('signIn', () => {
    const signInDto: SignInDto = {
      email: 'john@example.com',
      password: 'Password123!',
    };

    it('should sign in user successfully', async () => {
      // Arrange
      const hashedPassword = 'hashedpassword';
      const userWithHashedPassword = { ...mockUser, password: hashedPassword };

      mockRepository.findOne.mockResolvedValue(userWithHashedPassword);
      mockJwtService.sign.mockReturnValue('jwt-token');

      // Mock bcrypt.compare to return true
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act
      const result = await service.signIn(signInDto);

      // Assert
      expect(result).toEqual([userWithHashedPassword, 'jwt-token']);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        signInDto.password,
        hashedPassword,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        role: RolesEnum.USER,
      });
    });

    it('should sign in admin user successfully', async () => {
      // Arrange
      const adminUser = { ...mockUser, isAdmin: true };
      const hashedPassword = 'hashedpassword';
      const adminUserWithHashedPassword = {
        ...adminUser,
        password: hashedPassword,
      };

      mockRepository.findOne.mockResolvedValue(adminUserWithHashedPassword);
      mockJwtService.sign.mockReturnValue('admin-jwt-token');

      // Mock bcrypt.compare to return true
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act
      const result = await service.signIn(signInDto);

      // Assert
      expect(result).toEqual([adminUserWithHashedPassword, 'admin-jwt-token']);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        id: adminUser.id,
        email: adminUser.email,
        role: RolesEnum.ADMIN,
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.signIn(signInDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Email or password incorrect',
      );
    });

    it('should throw BadRequestException when password is incorrect', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return false
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.signIn(signInDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Email or password incorrect',
      );
    });

    it('should verify password correctly', async () => {
      // Arrange
      const hashedPassword = 'hashedpassword';
      const userWithHashedPassword = { ...mockUser, password: hashedPassword };

      mockRepository.findOne.mockResolvedValue(userWithHashedPassword);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const compareSpy = jest
        .spyOn(bcrypt, 'compare')
        .mockResolvedValue(true as never);

      // Act
      await service.signIn(signInDto);

      // Assert
      expect(compareSpy).toHaveBeenCalledWith(
        signInDto.password,
        hashedPassword,
      );
    });

    it('should generate JWT payload with correct role for regular user', async () => {
      // Arrange
      const regularUser = { ...mockUser, isAdmin: false };
      const hashedPassword = 'hashedpassword';
      const userWithHashedPassword = {
        ...regularUser,
        password: hashedPassword,
      };

      mockRepository.findOne.mockResolvedValue(userWithHashedPassword);
      mockJwtService.sign.mockReturnValue('jwt-token');

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act
      await service.signIn(signInDto);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        id: regularUser.id,
        email: regularUser.email,
        role: RolesEnum.USER,
      });
    });
  });
});
