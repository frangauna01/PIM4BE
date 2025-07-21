import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { AuthenticatedUserGuard } from '../auth/guards/auth-user.guard';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RolesEnum } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories list retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: Category[] }> {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 5;
    const categories = await this.categoriesService.findAll(
      pageNumber,
      limitNumber,
    );
    return { data: categories };
  }

  @Post()
  @UseGuards(AuthenticatedUserGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new category (Admin Only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Administrator role required',
  })
  @ApiResponse({ status: 400, description: 'Invalid category data' })
  async save(
    @Body()
    data: CreateCategoryDto,
  ): Promise<{ message: string; data: Category }> {
    const newCategory = await this.categoriesService.save(data);
    return { message: 'Category created successfully', data: newCategory };
  }
}
