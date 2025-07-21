import {
  Controller,
  UseGuards,
  Get,
  Req,
  Query,
  Param,
  Post,
  Body,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RolesEnum } from '../auth/decorators/roles.decorator';
import { AuthenticatedUserGuard } from '../auth/guards/auth-user.guard';
import { OrderOwnerOrAdminGuard } from '../auth/guards/order-owner.guard';
import { IAuthRequest } from '../auth/interfaces/token.interface';
import { CreateOrderDto } from './dtos/create-order.dto';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(AuthenticatedUserGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get orders of authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Orders list retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Req() req: IAuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: Order[] }> {
    const isAdmin = req.user.role.includes(RolesEnum.ADMIN);
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 5;
    const ordersPaginated = await this.ordersService.findAll(
      req.user.id,
      isAdmin,
      pageNumber,
      limitNumber,
    );
    return { data: ordersPaginated };
  }

  @Get(':id')
  @UseGuards(AuthenticatedUserGuard, OrderOwnerOrAdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order found successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Not the order owner',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: Order }> {
    const order = await this.ordersService.findById(id);
    return { data: order };
  }

  @Post()
  @UseGuards(AuthenticatedUserGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  async save(
    @Req() req: IAuthRequest,
    @Body() body: CreateOrderDto,
  ): Promise<{ message: string; data: Order }> {
    const newOrder = await this.ordersService.save(
      body.user,
      body.products,
      req.user.id,
      req.user.role,
    );
    return {
      message: 'Order created successfully',
      data: newOrder,
    };
  }

  @Delete(':id')
  @UseGuards(AuthenticatedUserGuard, OrderOwnerOrAdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Not the order owner',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async delete(
    @Req() req: IAuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string; id: string }> {
    const deletedOrder = await this.ordersService.delete(
      id,
      req.user.id,
      req.user.role,
    );
    return { message: 'Order deleted successfully', id: deletedOrder };
  }
}
