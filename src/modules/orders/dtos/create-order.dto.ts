import {
  IsUUID,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProductOrderDto {
  @ApiProperty({
    example: '8176b936-2957-42b7-a88f-2535ff28e770',
    description: 'UUID of the product to add to the order.',
  })
  @IsUUID('4', { message: 'Product id must be a valid UUID.' })
  id: string;

  @ApiProperty({
    example: 2,
    description: 'Number of units of the product.',
  })
  @IsInt({ message: 'Quantity must be an integer.' })
  @Min(1, { message: 'Minimum quantity is 1.' })
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    example: '258d6348-17dc-48db-90fd-bfd25d5dc64b',
    description: 'UUID of the user placing the order.',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID.' })
  @IsNotEmpty({ message: 'userId cannot be empty.' })
  user: string;

  @ApiProperty({
    description: 'List of products to order with quantities.',
    type: [ProductOrderDto],
  })
  @IsArray({ message: 'Products field must be an array.' })
  @ArrayMinSize(1, { message: 'At least one product must be included.' })
  @ValidateNested({ each: true })
  @Type(() => ProductOrderDto)
  products: ProductOrderDto[];
}
