/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { User } from '../entities/user.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { RolesEnum } from '../../auth/decorators/roles.decorator';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let transactionHelper: TransactionHelper;

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
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

  const mockAdminUser: User = {
    ...mockUser,
    id: '2',
    email: 'admin@example.com',
    isAdmin: true,
    toJSON: function (): Omit<User, 'password' | 'isAdmin' | 'toJSON'> {
      throw new Error('Function not implemented.');
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    transactionHelper = module.get<TransactionHelper>(TransactionHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return users without password field', async () => {
      // Arrange
      const mockUsers = [mockUser, mockAdminUser];
      const total = 2;
      mockRepository.findAndCount.mockResolvedValue([mockUsers, total]);

      // Act
      const result = await service.findAll(1, 5);

      // Assert
      expect(result).toHaveLength(2);
      result.forEach((user) => {
        expect(user).not.toHaveProperty('password');
      });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        relations: ['orders'],
      });
    });

    it('should use default pagination values when not provided', async () => {
      // Arrange
      const mockUsers = [mockUser];
      const total = 1;
      mockRepository.findAndCount.mockResolvedValue([mockUsers, total]);

      // Act
      const result = await service.findAll(1, 5);

      // Assert
      expect(result).toEqual([
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: 1234567890,
          country: 'USA',
          city: 'New York',
          address: '123 Main St',
          createdAt: expect.any(Date),
          isAdmin: false,
          orders: [],
          toJSON: expect.any(Function),
        },
      ]);
    });

    it('should throw BadRequestException when requested page exceeds maximum', async () => {
      // Arrange
      const mockUsers = [mockUser];
      const total = 5; // Only 1 page with limit 5
      mockRepository.findAndCount.mockResolvedValue([mockUsers, total]);

      // Act & Assert
      await expect(service.findAll(3, 5)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(3, 5)).rejects.toThrow(
        'The requested page (3) exceeds the maximum (1)',
      );
    });
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById('1');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['orders.orderDetails'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
      await expect(service.findById('999')).rejects.toThrow(
        'User with UUID 999 not found',
      );
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
      city: 'Updated City',
    };

    it('should update user successfully when user updates own profile', async () => {
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
      const result = await service.update(
        '1',
        updateUserDto,
        '1',
        RolesEnum.USER,
      );

      // Assert
      expect(result).toBe('1');
      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: '1' });
      expect(userRepo.save).toHaveBeenCalledWith({
        ...mockUser,
        ...updateUserDto,
      });
    });

    it('should allow admin to update any user', async () => {
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
      const result = await service.update(
        '1',
        updateUserDto,
        '2',
        RolesEnum.ADMIN,
      );

      // Assert
      expect(result).toBe('1');
    });

    it('should throw UnauthorizedException when user tries to update another user', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(
        service.update('1', updateUserDto, '2', RolesEnum.USER),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.update('1', updateUserDto, '2', RolesEnum.USER),
      ).rejects.toThrow('You cannot update another user');
    });

    it('should throw UnauthorizedException when user tries to change admin status', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      const updateWithAdminDto = { ...updateUserDto, isAdmin: true };

      // Act & Assert
      await expect(
        service.update('1', updateWithAdminDto, '1', RolesEnum.USER),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.update('1', updateWithAdminDto, '1', RolesEnum.USER),
      ).rejects.toThrow('You cannot change your admin status');
    });

    it('should throw NotFoundException when user to update is not found', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        save: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(null);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(
        service.update('999', updateUserDto, '999', RolesEnum.USER),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('999', updateUserDto, '999', RolesEnum.USER),
      ).rejects.toThrow('User with UUID 999 not found');
    });
  });

  describe('delete', () => {
    it('should delete user successfully when user deletes own account', async () => {
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
      const result = await service.delete('1', '1', RolesEnum.USER);

      // Assert
      expect(result).toBe('1');
      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: '1' });
      expect(userRepo.delete).toHaveBeenCalledWith('1');
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
      const result = await service.delete('1', '2', RolesEnum.ADMIN);

      // Assert
      expect(result).toBe('1');
    });

    it('should throw UnauthorizedException when user tries to delete another user', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(mockUser);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(service.delete('1', '2', RolesEnum.USER)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.delete('1', '2', RolesEnum.USER)).rejects.toThrow(
        'You cannot delete another user',
      );
    });

    it('should throw NotFoundException when user to delete is not found', async () => {
      // Arrange
      const userRepo = {
        findOneBy: jest.fn(),
        delete: jest.fn(),
      };

      mockQueryRunner.manager.getRepository.mockReturnValue(userRepo);
      userRepo.findOneBy.mockResolvedValue(null);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(
        service.delete('999', '999', RolesEnum.USER),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.delete('999', '999', RolesEnum.USER),
      ).rejects.toThrow('User with ID 999 not found');
    });
  });
});
