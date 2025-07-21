import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({
    example: 'jigauna59@gmail.com',
  })
  @IsEmail({}, { message: 'Email must be valid.' })
  email: string;

  @ApiProperty({ example: 'Pass123!' })
  @IsString({ message: 'Password must be a string.' })
  @Length(8, 15, {
    message: 'Password must be between 8 and 15 characters.',
  })
  password: string;
}
