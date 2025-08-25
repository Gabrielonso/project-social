import { IsNotEmpty, IsPositive, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdDto {
  @ApiProperty({
    type: Number,
    description:
      'The resource id e.g. user id, wallet id, notification id etc.',
  })
  @IsNotEmpty()
  @IsPositive()
  @Max(999_999_999_999)
  id: number;
}
