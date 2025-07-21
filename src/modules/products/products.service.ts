import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { TransactionHelper } from '../utils/helpers/transaction.helper';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly transactionHelper: TransactionHelper,
  ) {}

  async findAll(page: number, limit: number): Promise<Product[]> {
    const [products, total] = await this.productsRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['category'],
    });

    if (!total) throw new NotFoundException('There are currently no products');

    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && total > 0)
      throw new BadRequestException(
        `The requested page (${page}) exceeds the maximum (${totalPages})`,
      );

    return products;
  }

  async findById(id: string): Promise<Product> {
    const findProduct = await this.productsRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!findProduct)
      throw new NotFoundException(`Product with UUID ${id} not found`);

    return findProduct;
  }

  async save(productData: CreateProductDto): Promise<Product> {
    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const productRepo = queryRunner.manager.getRepository(Product);
      const categoryRepo = queryRunner.manager.getRepository(Category);

      const existingProduct = await productRepo.findOneBy({
        name: productData.name,
      });
      if (existingProduct) {
        throw new ConflictException('Product with this name already exists');
      }

      const category = await categoryRepo.findOneBy({
        name: productData.category,
      });
      if (!category) {
        throw new NotFoundException(
          `Category ${productData.category} not found`,
        );
      }

      const newProduct = productRepo.create({
        ...productData,
        category,
      });

      return await productRepo.save(newProduct);
    });
  }

  async update(id: string, productData: UpdateProductDto): Promise<string> {
    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const productRepo = queryRunner.manager.getRepository(Product);

      const existingProduct = await productRepo.findOneBy({ id });
      if (!existingProduct) {
        throw new NotFoundException(`Product with UUID ${id} not found`);
      }

      const updatedProduct = {
        ...existingProduct,
        ...productData,
      };

      await productRepo.save(updatedProduct);

      return updatedProduct.id;
    });
  }

  async delete(id: string): Promise<string> {
    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const productRepo = queryRunner.manager.getRepository(Product);

      const product = await productRepo.findOneBy({ id });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      await productRepo.delete(id);

      return product.id;
    });
  }
}
