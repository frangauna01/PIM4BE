import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageValidationPipe } from './pipes/image-validation.pipe';
import { Product } from '../products/entities/product.entity';
import { AuthenticatedUserGuard } from '../auth/guards/auth-user.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RolesEnum } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload/:id')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AuthenticatedUserGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload image to a product (Admin Only)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Admin role required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Invalid or missing file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageValidationPipe) file: Express.Multer.File,
  ): Promise<{ message: string; data: Product }> {
    const updatedProduct = await this.filesService.upload(id, file);
    return { message: 'Image upload successfully', data: updatedProduct };
  }
}
