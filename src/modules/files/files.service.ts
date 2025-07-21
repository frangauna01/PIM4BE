import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';
import { Product } from '../products/entities/product.entity';
import { TransactionHelper } from '../utils/helpers/transaction.helper';
import { envs } from '../../configs/envs.config';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly transactionHelper: TransactionHelper,
  ) {}

  async upload(id: string, file: Express.Multer.File): Promise<Product> {
    return this.transactionHelper.runInTransaction(async () => {
      const product = await this.productRepository.findOne({
        where: { id },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      const base64String = Buffer.from(file.buffer).toString('base64');
      const uploadString = `data:${file.mimetype};base64,${base64String}`;

      const { cloudName, apiKey, apiSecret } = envs.cloudinary;

      if (!cloudName || !apiKey || !apiSecret) {
        throw new InternalServerErrorException(
          'The configuration for Cloudinary was not found',
        );
      }

      const result = await cloudinary.uploader.upload(uploadString, {
        folder: 'ecommerce-products',
      });

      if (!result)
        throw new ServiceUnavailableException(
          'Cloudinary is not available at this moment',
        );

      product.imgUrl = result.secure_url;
      await this.productRepository.save(product);

      return product;
    });
  }
}
