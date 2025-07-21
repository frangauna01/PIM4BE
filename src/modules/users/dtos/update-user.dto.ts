import {
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsNumber,
  Length,
} from 'class-validator';
import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiHideProperty()
  @IsOptional()
  @IsString({ message: 'Name must be a string.' })
  @Length(3, 80, {
    message: 'Name must be between 3 and 80 characters.',
  })
  name?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid.' })
  email?: string;

  @ApiPropertyOptional({ example: 'Secure123!' })
  @IsOptional()
  @IsString({ message: 'Password must be a string.' })
  @Length(8, 15, {
    message: 'Password must be between 8 and 15 characters.',
  })
  password?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsNumber({}, { message: 'Phone must be a number.' })
  phone?: number;

  @ApiHideProperty()
  @IsOptional()
  @IsString({ message: 'Country must be a string.' })
  @Length(5, 20, {
    message: 'Country must be between 5 and 20 characters.',
  })
  country?: string;

  @ApiPropertyOptional({ example: 'Cordoba' })
  @IsOptional()
  @IsString({ message: 'City must be a string.' })
  @Length(5, 20, {
    message: 'City must be between 5 and 20 characters.',
  })
  city?: string;

  @ApiPropertyOptional({ example: 'Av. Siempre Fernet 742' })
  @IsOptional()
  @IsString({ message: 'Address must be a string.' })
  @Length(3, 80, {
    message: 'Address must be between 3 and 80 characters.',
  })
  address?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'The value must be true or false.' })
  isAdmin?: boolean;
}
