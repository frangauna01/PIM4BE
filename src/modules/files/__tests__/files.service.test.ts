/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { FilesService } from '../files.service';
import { Product } from '../../products/entities/product.entity';
import { TransactionHelper } from '../../utils/helpers/transaction.helper';
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

describe('FilesService', () => {
  let service: FilesService;
  let repository: Repository<Product>;
  let transactionHelper: TransactionHelper;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockTransactionHelper = {
    runInTransaction: jest.fn(),
  };

  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    stock: 10,
    imgUrl: 'old-image.jpg',
    category: {
      id: '1',
      name: 'Electronics',
      products: [],
    },
    orderDetails: [],
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'image',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-data'),
    size: 1024,
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
    transactionHelper = module.get<TransactionHelper>(TransactionHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload image and update product successfully', async () => {
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

      // Act
      const result = await service.upload('1', mockFile);

      // Assert
      expect(result.imgUrl).toBe(mockCloudinaryResult.secure_url);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        expect.stringContaining('data:image/jpeg;base64,'),
        {
          folder: 'ecommerce-products',
        },
      );
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockProduct,
        imgUrl: mockCloudinaryResult.secure_url,
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(),
      );

      // Act & Assert
      await expect(service.upload('999', mockFile)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.upload('999', mockFile)).rejects.toThrow(
        'Product with ID 999 not found',
      );
    });

    it('should throw ServiceUnavailableException when cloudinary upload fails', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockProduct);
      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(null);

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(),
      );

      // Act & Assert
      await expect(service.upload('1', mockFile)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.upload('1', mockFile)).rejects.toThrow(
        'Cloudinary is not available at this moment',
      );
    });

    it('should convert file buffer to base64 string correctly', async () => {
      // Arrange
      const mockCloudinaryResult = {
        secure_url: 'https://cloudinary.com/new-image.jpg',
        public_id: 'ecommerce-products/test123',
      };

      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue(mockProduct);
      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockCloudinaryResult,
      );

      mockTransactionHelper.runInTransaction.mockImplementation(
        async (callback) => await callback(),
      );

      // Act
      await service.upload('1', mockFile);

      // Assert
      const expectedBase64 = Buffer.from('fake-image-data').toString('base64');
      const expectedUploadString = `data:image/jpeg;base64,${expectedBase64}`;
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        expectedUploadString,
        {
          folder: 'ecommerce-products',
        },
      );
    });

    it('should use transaction helper correctly', async () => {
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

      // Act
      await service.upload('1', mockFile);

      // Assert
      expect(mockTransactionHelper.runInTransaction).toHaveBeenCalledTimes(1);
      expect(
        typeof mockTransactionHelper.runInTransaction.mock.calls[0][0],
      ).toBe('function');
    });
  });
});
