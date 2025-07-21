import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, IsNumber, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'Logitech G Pro Superlight V2',
    description: 'Name of the product.',
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string.' })
  @Length(3, 50, { message: 'Name must be between 3 and 50 characters.' })
  name?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @Length(10, 255, {
    message: 'Description must be between 10 and 255 characters.',
  })
  description?: string;

  @ApiPropertyOptional({
    example: 99.99,
    description: 'The monetary value of the product',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number.' })
  @Min(0.01, { message: 'Price must be greater than 0.' })
  price?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'The amount of stock of the product',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Stock must be a number.' })
  @Min(0, { message: 'Stock cannot be negative.' })
  stock?: number;

  @ApiPropertyOptional({
    example:
      'https://resource.logitechg.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/pro-x-superlight-2/new-gallery-assets-2025/pro-x-superlight-2-mice-top-angle-black-gallery-1.png?v=1',
    description: 'URL of an image referring to the product',
  })
  @IsOptional()
  @IsString({ message: 'Image URL must be a string.' })
  imgUrl?: string;
}
