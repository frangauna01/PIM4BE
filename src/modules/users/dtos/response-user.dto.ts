import { IsString, IsEmail, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponseUserDto {
  @ApiProperty({ example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab' })
  @IsString({ message: 'The ID must be a string.' })
  id: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString({ message: 'The name must be a string.' })
  name: string;

  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail({}, { message: 'The email must have a valid format.' })
  email: string;

  @ApiProperty({ example: 1122334455 })
  @IsNumber({}, { message: 'The phone must be a number.' })
  phone: number;

  @ApiPropertyOptional({ example: 'Argentina' })
  @IsString({ message: 'The country must be a string.' })
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'Buenos Aires' })
  @IsString({ message: 'The city must be a string.' })
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Av. Siempre Viva 742' })
  @IsString({ message: 'The address must be a string.' })
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString({ message: 'The token must be a string.' })
  @IsOptional()
  token?: string;
}
