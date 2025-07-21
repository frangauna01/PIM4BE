/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories.service';
import { Category } from '../entities/category.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { CreateCategoryDto } from '../dtos/create-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: Repository<Category>;
  let transactionHelper: TransactionHelper;

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
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get<Repository<Category>>(getRepositoryToken(Category));
    transactionHelper = module.get<TransactionHelper>(TransactionHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      // Arrange
      const mockCategories: Category[] = [
        { id: '1', name: 'Electronics', products: [] },
        { id: '2', name: 'Books', products: [] },
      ];

      mockRepository.findAndCount.mockResolvedValue([mockCategories, 2]);

      // Act
      const result = await service.findAll(1, 5);

      // Assert
      expect(result).toEqual(mockCategories);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
      });
    });

    it('should throw BadRequestException when page exceeds maximum', async () => {
      // Arrange
      const mockCategories: Category[] = [
        { id: '1', name: 'Electronics', products: [] },
      ];

      mockRepository.findAndCount.mockResolvedValue([mockCategories, 1]);

      // Act & Assert
      await expect(service.findAll(3, 5)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(3, 5)).rejects.toThrow(
        'The requested page (3) exceeds the maximum (1)',
      );
    });
  });

  describe('save', () => {
    const createCategoryDto: CreateCategoryDto = {
      name: 'New Category',
    };

    it('should create and save a new category successfully', async () => {
      // Arrange
      const newCategory: Category = {
        id: '1',
        name: 'New Category',
        products: [],
      };

      const categoryRepo = mockQueryRunner.manager.getRepository();
      categoryRepo.findOne.mockResolvedValue(null);
      categoryRepo.create.mockReturnValue(newCategory);
      categoryRepo.save.mockResolvedValue(newCategory);

      mockTransactionHelper.runInTransaction.mockImplementation((callback) =>
        callback(mockQueryRunner),
      );

      // Act
      const result = await service.save(createCategoryDto);

      // Assert
      expect(result).toEqual(newCategory);
      expect(mockTransactionHelper.runInTransaction).toHaveBeenCalledTimes(1);
      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: { name: createCategoryDto.name },
      });
      expect(categoryRepo.create).toHaveBeenCalledWith({
        name: createCategoryDto.name,
      });
      expect(categoryRepo.save).toHaveBeenCalledWith(newCategory);
    });

    it('should throw BadRequestException when category already exists', async () => {
      // Arrange
      const existingCategory: Category = {
        id: '1',
        name: 'New Category',
        products: [],
      };

      const categoryRepo = mockQueryRunner.manager.getRepository();
      categoryRepo.findOne.mockResolvedValue(existingCategory);

      mockTransactionHelper.runInTransaction.mockImplementation((callback) =>
        callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(service.save(createCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.save(createCategoryDto)).rejects.toThrow(
        'This category already exists',
      );
    });

    it('should call TransactionHelper.runInTransaction with correct parameters', async () => {
      // Arrange
      const categoryRepo = mockQueryRunner.manager.getRepository();
      categoryRepo.findOne.mockResolvedValue(null);
      categoryRepo.create.mockReturnValue({
        id: '1',
        name: 'New Category',
        products: [],
      });
      categoryRepo.save.mockResolvedValue({
        id: '1',
        name: 'New Category',
        products: [],
      });

      mockTransactionHelper.runInTransaction.mockImplementation((callback) =>
        callback(mockQueryRunner),
      );

      // Act
      await service.save(createCategoryDto);

      // Assert
      expect(mockTransactionHelper.runInTransaction).toHaveBeenCalledTimes(1);
      expect(
        typeof mockTransactionHelper.runInTransaction.mock.calls[0][0],
      ).toBe('function');
    });
  });
});
