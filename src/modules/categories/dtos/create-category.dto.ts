import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Name of the category you want to create',
    example: 'household-appliance',
  })
  @IsString({ message: 'Name must be a string.' })
  @Length(3, 50, {
    message: 'Name must be between 3 and 50 characters.',
  })
  name: string;
}
