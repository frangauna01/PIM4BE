import {
  IsString,
  IsEmail,
  Matches,
  Length,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({
    example: 'Juan Pérez',
    description: 'User name. Between 3 and 80 characters.',
  })
  @IsString({ message: 'Name must be a string.' })
  @IsNotEmpty({ message: 'Name cannot be empty.' })
  @Length(3, 80, {
    message:
      'Name must be at least 3 characters and no more than 80 characters.',
  })
  name: string;

  @ApiProperty({
    example: 'juanp@gmail.com',
    description: 'Valid email address.',
  })
  @IsEmail({}, { message: 'Email format is invalid.' })
  email: string;

  @ApiProperty({
    example: 'Pass123!',
    description:
      'Password between 8 and 15 characters, with at least one uppercase, one lowercase, one number, and one symbol (!@#$%^&*).',
  })
  @IsString()
  @Length(8, 15, {
    message: 'Password must be between 8 and 15 characters.',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,15}$/, {
    message:
      'Password must be between 8 and 15 characters, including at least one uppercase, one lowercase, one number, and one special character (!@#$%^&*).',
  })
  password: string;

  @ApiProperty({
    example: 'Pass123!',
    description: 'Confirm password must match password.',
  })
  @IsString()
  confirmPassword: string;

  @ApiProperty({
    example: 'Av. Siempre Viva 742',
    description: 'Address between 3 and 80 characters.',
  })
  @IsString({ message: 'Address must be a string.' })
  @Length(3, 80, {
    message:
      'Address must be at least 3 characters and no more than 80 characters.',
  })
  address: string;

  @ApiProperty({
    example: 1122334455,
    description: 'Phone number (numeric).',
  })
  @IsNumber({}, { message: 'Phone number must be a number.' })
  phone: number;

  @ApiProperty({
    example: 'Argentina',
    description: 'Country between 5 and 20 characters.',
  })
  @IsString({ message: 'Country must be a string.' })
  @Length(5, 20, {
    message:
      'Country must be at least 5 characters and no more than 20 characters.',
  })
  country: string;

  @ApiProperty({
    example: 'Buenos Aires',
    description: 'City between 5 and 20 characters.',
  })
  @IsString({ message: 'City must be a string.' })
  @Length(5, 20, {
    message:
      'City must be at least 5 characters and no more than 20 characters.',
  })
  city: string;
}
