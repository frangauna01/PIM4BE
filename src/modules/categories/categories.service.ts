import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { TransactionHelper } from '../utils/helpers/transaction.helper';
import { CreateCategoryDto } from './dtos/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    private readonly transactionHelper: TransactionHelper,
  ) {}

  async findAll(page: number, limit: number): Promise<Category[]> {
    const [categories, total] = await this.categoriesRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });

    if (!total)
      throw new NotFoundException('There are currently no categories');

    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && total > 0)
      throw new BadRequestException(
        `The requested page (${page}) exceeds the maximum (${totalPages})`,
      );

    return categories;
  }

  async save(data: CreateCategoryDto): Promise<Category> {
    const { name } = data;
    return this.transactionHelper.runInTransaction(async (queryRunner) => {
      const categoryRepo = queryRunner.manager.getRepository(Category);

      const categories = await categoryRepo.findOne({
        where: { name },
      });
      if (categories)
        throw new ConflictException('This category already exists');

      const newCategory = categoryRepo.create({ name });
      await categoryRepo.save(newCategory);

      return newCategory;
    });
  }
}
