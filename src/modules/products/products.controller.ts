import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { AuthenticatedUserGuard } from '../auth/guards/auth-user.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RolesEnum } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: 200,
    description: 'Products list retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: Product[] }> {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 5;
    const productsPaginated = await this.productsService.findAll(
      pageNumber,
      limitNumber,
    );
    return { data: productsPaginated };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product found successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: Product }> {
    const findProduct = await this.productsService.findById(id);
    return { data: findProduct };
  }

  @Post()
  @UseGuards(AuthenticatedUserGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new product (Admin Only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  async save(@Body() productData: CreateProductDto): Promise<{
    message: string;
    data: Product;
  }> {
    const newProduct = await this.productsService.save(productData);
    return { message: 'Product created successfully', data: newProduct };
  }

  @Put(':id')
  @UseGuards(AuthenticatedUserGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product (Admin Only)' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() productData: UpdateProductDto,
  ): Promise<{ message: string; id: string }> {
    const updatedProduct = await this.productsService.update(id, productData);
    return { message: 'Product updated successfully', id: updatedProduct };
  }

  @Delete(':id')
  @UseGuards(AuthenticatedUserGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete product (Administrators only)' })
  @ApiResponse({ status: 200, description: 'Product successfully removed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Administrator role required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string; id: string }> {
    const deletedProduct = await this.productsService.delete(id);
    return { message: 'Product deleted successfully', id: deletedProduct };
  }
}
