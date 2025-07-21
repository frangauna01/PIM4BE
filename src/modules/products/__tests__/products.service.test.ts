/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products.service';
import { Product } from '../entities/product.entity';
import { Category } from '../../categories/entities/category.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;
  let transactionHelper: TransactionHelper;

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

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Reset the queryRunner mock before each test
    mockQueryRunner.manager.getRepository = jest.fn();
  });

  const mockCategory: Category = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Electronics',
    products: [],
  };

  const mockProduct: Product = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    stock: 10,
    imgUrl: 'test-image.jpg',
    category: mockCategory,
    orderDetails: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
    transactionHelper = module.get<TransactionHelper>(TransactionHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return products with pagination', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const total = 1;
      mockRepository.findAndCount.mockResolvedValue([mockProducts, total]);

      // Act
      const result = await service.findAll(1, 5);

      // Assert
      expect(result).toEqual(mockProducts);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        relations: ['category'],
      });
    });

    it('should use default values when page and limit are not provided', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const total = 1;
      mockRepository.findAndCount.mockResolvedValue([mockProducts, total]);

      // Act
      const result = await service.findAll(1, 5);

      // Assert
      expect(result).toEqual(mockProducts);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        relations: ['category'],
      });
    });

    it('should throw BadRequestException when requested page exceeds maximum', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const total = 5; // Only 1 page with limit 5
      mockRepository.findAndCount.mockResolvedValue([mockProducts, total]);

      // Act & Assert
      await expect(service.findAll(3, 5)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(3, 5)).rejects.toThrow(
        'The requested page (3) exceeds the maximum (1)',
      );
    });

    it('should handle invalid page and limit values', async () => {
      // Arrange
      const mockProducts = [mockProduct];
      const total = 1;
      mockRepository.findAndCount.mockResolvedValue([mockProducts, total]);

      // Act
      const result = await service.findAll(-1, 0);

      // Assert
      expect(result).toEqual(mockProducts);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0, // (1 - 1) * 5 = 0
        take: 5, // default limit
        relations: ['category'],
      });
    });
  });

  describe('findById', () => {
    it('should return a product when found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProduct);

      // Act
      const result = await service.findById('1');

      // Assert
      expect(result).toEqual(mockProduct);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['category'],
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
      await expect(service.findById('999')).rejects.toThrow(
        'Product with UUID 999 not found',
      );
    });
  });

  describe('save', () => {
    const createProductDto: CreateProductDto = {
      name: 'New Product',
      description: 'New Product Description',
      price: 150.0,
      stock: 20,
      category: 'Electronics',
    };

    it('should create and save a new product successfully', async () => {
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
        return null;
      });

      productRepo.findOneBy.mockResolvedValue(null); // No existing product
      categoryRepo.findOneBy.mockResolvedValue(mockCategory);
      productRepo.create.mockReturnValue(mockProduct);
      productRepo.save.mockResolvedValue(mockProduct);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act
      const result = await service.save(createProductDto);

      // Assert
      expect(result).toEqual(mockProduct);
      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        name: createProductDto.name,
      });
      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({
        name: createProductDto.category,
      });
    });

    it('should throw BadRequestException when product name already exists', async () => {
      // Arrange
      const productRepo = {
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      const categoryRepo = {
        findOneBy: jest.fn(),
      };

      // Reset the mock before setting up new behavior
      mockQueryRunner.manager.getRepository.mockReset();
      mockQueryRunner.manager.getRepository.mockImplementation((entity) => {
        if (entity === Product) return productRepo;
        if (entity === Category) return categoryRepo;
        return null;
      });

      productRepo.findOneBy.mockResolvedValue(mockProduct); // Existing product

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(service.save(createProductDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.save(createProductDto)).rejects.toThrow(
        'Product with this name already exists',
      );
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      const productRepo = {
        findOneBy: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      const categoryRepo = {
        findOneBy: jest.fn(),
      };

      // Reset and setup the mock properly
      mockQueryRunner.manager.getRepository.mockReset();
      mockQueryRunner.manager.getRepository.mockImplementation((entity) => {
        if (entity === Product) return productRepo;
        if (entity === Category) return categoryRepo;
        return null;
      });

      productRepo.findOneBy.mockResolvedValue(null); // No existing product
      categoryRepo.findOneBy.mockResolvedValue(null); // Category not found

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(mockQueryRunner),
      );

      // Act & Assert
      await expect(service.save(createProductDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.save(createProductDto)).rejects.toThrow(
        `Category ${createProductDto.category} not found`,
      );
    });
  });

  describe('update', () => {
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      price: 199.99,
    };

    it('should update a product successfully', async () => {
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
      const result = await service.update(
        '550e8400-e29b-41d4-a716-446655440000',
        updateProductDto,
      );

      // Assert
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(productRepo.findOneBy).toHaveBeenCalledWith({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(productRepo.save).toHaveBeenCalledWith({
        ...mockProduct,
        ...updateProductDto,
      });
    });

    it('should throw NotFoundException when product not found for update', async () => {
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

      // Act & Assert
      await expect(service.update('999', updateProductDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('999', updateProductDto)).rejects.toThrow(
        'Product with UUID 999 not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete a product successfully', async () => {
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
      const result = await service.delete('1');

      // Assert
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000'); // Should return the product's UUID, not the input ID
      expect(productRepo.findOneBy).toHaveBeenCalledWith({ id: '1' });
      expect(productRepo.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when product not found for deletion', async () => {
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

      // Act & Assert
      await expect(service.delete('999')).rejects.toThrow(NotFoundException);
      await expect(service.delete('999')).rejects.toThrow(
        'Product with ID 999 not found',
      );
    });
  });
});
