import { IsString, IsNumber, IsOptional, Length, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Lochiteq ge pro superlaigt',
    description: 'Name of the product.',
  })
  @IsString({ message: 'Name must be a string.' })
  @Length(3, 50, { message: 'Name must be between 3 and 50 characters.' })
  name: string;

  @ApiProperty({
    example: 'The best mouse in the world',
    description: 'A brief description of the product.',
  })
  @IsString({ message: 'Description must be a string.' })
  @Length(10, 255, {
    message: 'Description must be between 10 and 255 characters.',
  })
  description: string;

  @ApiProperty({
    example: 0.05,
    description: 'The monetary value of the product',
  })
  @IsNumber({}, { message: 'Price must be a number.' })
  @Min(0.01, { message: 'Price must be greater than 0.' })
  price: number;

  @ApiProperty({
    example: 0,
    description: 'The amount of stock of the product',
  })
  @IsNumber({}, { message: 'Stock must be a number.' })
  @Min(0, { message: 'Stock cannot be negative.' })
  stock: number;

  @ApiPropertyOptional({
    example: 'http://example-image.com',
    description: 'URL of an image referring to the product',
  })
  @IsOptional()
  @IsString({ message: 'Image URL must be a string.' })
  imgUrl?: string;

  @ApiProperty({
    example: 'mouse',
    description:
      'Name of the category of the product. Disclaimer: The category name must be in the Categories list or previously created.',
  })
  @IsString({ message: 'Category must be a string.' })
  @Length(3, 50, {
    message: 'Category must be between 3 and 50 characters.',
  })
  category: string;
}
