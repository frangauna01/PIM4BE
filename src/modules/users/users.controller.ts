import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUserGuard } from '../auth/guards/auth-user.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ResponseUserDto } from './dtos/response-user.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RolesEnum } from '../auth/decorators/roles.decorator';
import { SameUserOrAdminGuard } from '../auth/guards/same-user.guard';
import { IAuthRequest } from '../auth/interfaces/token.interface';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthenticatedUserGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all users (Admin Only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: ResponseUserDto[] }> {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 5;
    const usersPaginated = await this.usersService.findAll(
      pageNumber,
      limitNumber,
    );
    return { data: usersPaginated };
  }

  @Get(':id')
  @UseGuards(AuthenticatedUserGuard, RolesGuard, SameUserOrAdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: ResponseUserDto }> {
    const user = await this.usersService.findById(id);
    return { data: user };
  }

  @Put(':id')
  @UseGuards(AuthenticatedUserGuard, RolesGuard, SameUserOrAdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Req() req: IAuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() userData: UpdateUserDto,
  ): Promise<{ message: string; id: string }> {
    const updatedUser = await this.usersService.update(
      id,
      userData,
      req.user.id,
      req.user.role,
    );
    return { message: 'User updated successfully', id: updatedUser };
  }

  @Delete(':id')
  @UseGuards(AuthenticatedUserGuard, RolesGuard, SameUserOrAdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(
    @Req() req: IAuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string; id: string }> {
    const userId = await this.usersService.delete(
      id,
      req.user.id,
      req.user.role,
    );
    return { message: 'User deleted successfully', id: userId };
  }
}
