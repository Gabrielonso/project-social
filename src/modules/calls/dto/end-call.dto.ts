import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EndCallDto {
  @ApiProperty({
    description: 'Call UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  uuid: string;

  @ApiPropertyOptional({
    description: 'Room Name',
    example: 'room_a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsOptional()
  roomName?: string;
}
